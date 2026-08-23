"""
HTTP sidecar exposing SemanticPipeline to the AcademiaTrack desktop app.

Run: python -m semantic_layer.server
Enable: SEMANTIC_ENABLED=1

Access control. On loopback the mutating endpoints are open: the OS already
limits who can reach 127.0.0.1, and the desktop client sends no credential.
Set SEMANTIC_AUTH_TOKEN to require a shared secret on /v1/chat,
/v1/chat/stream and /v1/feedback, supplied as ``X-Semantic-Token: <token>`` or
``Authorization: Bearer <token>``. Binding SEMANTIC_SERVER_HOST to anything
other than loopback *without* a token is refused at startup, because the cache
this fronts can be both read and poisoned by anyone who can reach the port.
/health stays open in all configurations; it returns two booleans and the
duplicate-instance check depends on it.
"""

from __future__ import annotations

import asyncio
import hmac
import ipaddress
import json
import logging
import math
from typing import Any

from semantic_layer.adapters import BoundModelBackend, messages_to_semantic_request
from semantic_layer.config import CONFIG
from semantic_layer.orchestrator import OllamaBackend, SemanticPipeline

logger = logging.getLogger(__name__)

_pipeline: SemanticPipeline | None = None
_init_lock = asyncio.Lock()


def _is_enabled() -> bool:
    return CONFIG.enabled


async def _shutdown_pipeline() -> None:
    global _pipeline
    if _pipeline is not None:
        _pipeline.shutdown()
        _pipeline = None
        logger.info("SemanticPipeline shut down")


async def _get_pipeline() -> SemanticPipeline:
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    async with _init_lock:
        if _pipeline is None:
            llm = OllamaBackend(
                base_url=CONFIG.ollama_base_url,
                timeout_seconds=CONFIG.ollama_timeout_seconds,
            )
            pipeline = SemanticPipeline(llm=llm, enable_auto_tune=True)
            await asyncio.to_thread(pipeline.initialize)
            _pipeline = pipeline
            logger.info("SemanticPipeline ready")
    return _pipeline


async def _handle_health(_request: Any) -> Any:
    from starlette.responses import JSONResponse

    ready = False
    if _is_enabled():
        try:
            pipeline = await _get_pipeline()
            ready = pipeline.is_ready
        except Exception:
            logger.exception("Health check failed")
    return JSONResponse(
        {
            "enabled": _is_enabled(),
            "ready": ready,
        }
    )



def _is_loopback_host(host: str) -> bool:
    """True when binding to ``host`` keeps the socket reachable only locally."""
    candidate = (host or "").strip().strip("[]").lower()
    if candidate in ("localhost", ""):
        return candidate == "localhost"
    try:
        return ipaddress.ip_address(candidate).is_loopback
    except ValueError:
        return False


def _check_auth(request: Any) -> Any | None:
    """Return a 401 response when a configured token is missing or wrong.

    The sidecar has no other access control: any local process, and any page
    served from a CORS-allowed origin, can otherwise read cached answers and
    write new ones. Poisoning is the sharper risk -- a stored response is
    served to every later prompt whose embedding lands near it.

    A token is optional on loopback, where the OS already restricts reach, so
    the existing desktop client keeps working untouched. ``main`` refuses to
    bind a non-loopback interface without one.
    """
    from starlette.responses import JSONResponse

    expected = CONFIG.auth_token
    if not expected:
        return None

    provided = request.headers.get("x-semantic-token", "")
    if not provided:
        authorization = request.headers.get("authorization", "")
        if authorization[:7].lower() == "bearer ":
            provided = authorization[7:]

    # compare_digest to keep the check independent of how much of the token
    # matched, and never log or echo either side. Compare bytes, not str:
    # compare_digest raises TypeError on non-ASCII strings, and a header is
    # attacker-controlled, so a str comparison hands over a trivial crash.
    if not hmac.compare_digest(
        provided.encode("utf-8", "replace"), expected.encode("utf-8")
    ):
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    return None


def _validate_ollama_base(url: str) -> str | None:
    """Return ``url`` if its host is loopback or explicitly allow-listed, else None.

    Closes an SSRF hole: without this, a request body could point the sidecar at
    any internal/external host and have it issue a server-side POST.
    """
    from urllib.parse import urlparse

    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    host = (parsed.hostname or "").lower()
    if not host:
        return None
    # Only the configured allowlist. The previous ``.localhost`` suffix rule
    # admitted any name ending in that label -- http://evil.localhost/ passed --
    # and resolvers do not uniformly pin that suffix to loopback, so it widened
    # the guard past what the configuration says is allowed.
    if host in CONFIG.ollama_allowed_hosts:
        return url
    return None



async def _read_json_capped(request: Any) -> tuple[Any, Any | None]:
    """Read a JSON body, refusing anything over ``CONFIG.max_request_bytes``.

    ``request.json()`` buffers the whole payload before parsing, so an
    unbounded POST is a memory exhaustion path on a service that otherwise has
    no authentication. Content-Length is checked first when present, and the
    stream is capped regardless in case it lies or is absent (chunked).
    """
    from starlette.responses import JSONResponse

    limit = CONFIG.max_request_bytes
    declared = request.headers.get("content-length")
    if declared is not None:
        try:
            if int(declared) > limit:
                return None, JSONResponse({"error": "request body too large"}, status_code=413)
        except ValueError:
            return None, JSONResponse({"error": "invalid content-length"}, status_code=400)

    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > limit:
            return None, JSONResponse({"error": "request body too large"}, status_code=413)
        chunks.append(chunk)

    try:
        return json.loads(b"".join(chunks) or b"null"), None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JSONResponse({"error": "invalid JSON body"}, status_code=400)


def _result_payload(result: Any) -> dict[str, Any]:
    return {
        "response": result.response,
        "cache_hit": result.cache_hit,
        "model_id": result.model_id,
        "semantic_latency_ms": result.semantic_latency_ms,
        "breakdown_ms": result.breakdown_ms,
        "cache_similarity": result.cache_similarity,
    }


async def _parse_chat_body(request: Any) -> tuple[dict[str, Any] | None, Any | None]:
    from starlette.responses import JSONResponse

    body, err = await _read_json_capped(request)
    if err is not None:
        return None, err

    if not isinstance(body, dict):
        return None, JSONResponse({"error": "invalid JSON body"}, status_code=400)

    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        return None, JSONResponse({"error": "messages required"}, status_code=400)

    # The adapter calls .get() on every element. A non-mapping element used to
    # raise AttributeError and surface as a 500 with an internal error string;
    # a malformed request is the client's mistake and must read as a 400.
    if not all(isinstance(m, dict) for m in messages):
        return None, JSONResponse(
            {"error": "each message must be an object"}, status_code=400
        )

    model = str(body.get("model") or CONFIG.large_model_id).strip()
    if not model:
        return None, JSONResponse({"error": "model required"}, status_code=400)

    return body, None


async def _build_request_pipeline(
    body: dict[str, Any],
) -> tuple[Any | None, dict[str, Any] | None, Any | None]:
    """Build a per-request pipeline sharing the singleton's warm components.

    Returns ``(pipeline, run_kwargs, error_response)``. Both the buffered and
    streaming endpoints call this, then dispatch to ``run`` / ``run_stream``.
    """
    from starlette.responses import JSONResponse

    model = str(body.get("model") or CONFIG.large_model_id).strip()
    requested_base = str(body.get("ollama_base_url") or CONFIG.ollama_base_url).strip()
    ollama_base = _validate_ollama_base(requested_base)
    if ollama_base is None:
        return None, None, JSONResponse(
            {"error": f"ollama_base_url host not allowed: {requested_base}"},
            status_code=400,
        )

    skip_cache = bool(body.get("skip_cache", False))
    model_version = str(body.get("model_version") or model)
    semantic_req = messages_to_semantic_request(body["messages"], model_version=model_version)

    try:
        base_pipeline = await _get_pipeline()
        llm = BoundModelBackend(
            OllamaBackend(
                base_url=ollama_base,
                timeout_seconds=CONFIG.ollama_timeout_seconds,
            ),
            model_id=model,
        )
        pipeline = SemanticPipeline(
            llm=llm,
            cache=base_pipeline.cache,
            router=base_pipeline.router,
            compressor=base_pipeline.compressor,
            embedder=base_pipeline.embedder,
            enable_auto_tune=False,
            metrics=base_pipeline.metrics,
        )
    except Exception as exc:
        logger.exception("Pipeline build failed")
        del exc  # logged with traceback; not echoed to the client
        return None, None, JSONResponse(
            {"error": "pipeline unavailable"}, status_code=500
        )

    run_kwargs = {
        "prompt": semantic_req.prompt,
        "rag_chunks": semantic_req.rag_chunks or None,
        "skip_cache": skip_cache,
        "model_version": semantic_req.model_version,
    }
    return pipeline, run_kwargs, None


async def _handle_chat(request: Any) -> Any:
    from starlette.responses import JSONResponse

    denied = _check_auth(request)
    if denied is not None:
        return denied

    if not _is_enabled():
        return JSONResponse({"error": "semantic layer disabled"}, status_code=503)

    body, err = await _parse_chat_body(request)
    if err is not None:
        return err

    pipeline, run_kwargs, err = await _build_request_pipeline(body)
    if err is not None:
        return err

    try:
        result = await pipeline.run(**run_kwargs)
    except Exception as exc:
        logger.exception("Semantic chat failed")
        del exc
        return JSONResponse({"error": "semantic chat failed"}, status_code=500)

    return JSONResponse(_result_payload(result))


async def _handle_chat_stream(request: Any) -> Any:
    from starlette.responses import JSONResponse, StreamingResponse

    denied = _check_auth(request)
    if denied is not None:
        return denied

    if not _is_enabled():
        return JSONResponse({"error": "semantic layer disabled"}, status_code=503)

    body, err = await _parse_chat_body(request)
    if err is not None:
        return err

    pipeline, run_kwargs, err = await _build_request_pipeline(body)
    if err is not None:
        return err

    async def event_stream() -> Any:
        try:
            async for event in pipeline.run_stream(**run_kwargs):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("Semantic chat stream failed")
            del exc
            yield f"data: {json.dumps({'type': 'error', 'error': 'stream failed'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


async def _handle_feedback(request: Any) -> Any:
    from starlette.responses import JSONResponse

    denied = _check_auth(request)
    if denied is not None:
        return denied

    if not _is_enabled():
        return JSONResponse({"error": "semantic layer disabled"}, status_code=503)

    body, err = await _read_json_capped(request)
    if err is not None:
        return err
    if not isinstance(body, dict):
        return JSONResponse({"error": "invalid feedback payload"}, status_code=400)

    # This value feeds the auto-tuner's window, and the tuner moves the live
    # cache threshold. NaN compares False against every tau and silently skews
    # the hit and false-positive rates it is fitted on; a similarity outside
    # [-1, 1] is not a cosine at all. Both used to be accepted from an
    # unauthenticated endpoint, which made the threshold externally steerable.
    try:
        similarity = float(body.get("similarity", 0.0))
        accepted = bool(body.get("accepted", True))
    except (TypeError, ValueError):
        return JSONResponse({"error": "invalid feedback payload"}, status_code=400)

    if not math.isfinite(similarity) or not (-1.0 <= similarity <= 1.0):
        return JSONResponse(
            {"error": "similarity must be a finite number in [-1, 1]"}, status_code=400
        )

    try:
        pipeline = await _get_pipeline()
        pipeline.record_feedback(similarity, accepted)
    except Exception as exc:
        logger.exception("Feedback recording failed")
        del exc
        return JSONResponse({"error": "feedback recording failed"}, status_code=500)

    return JSONResponse({"ok": True})


def _probe_local_health() -> bool:
    """True when another instance is already serving /health on our port."""
    import httpx

    url = f"http://{CONFIG.server_host}:{CONFIG.server_port}/health"
    try:
        response = httpx.get(url, timeout=0.6)
        if response.status_code != 200:
            return False
        body = response.json()
        return bool(body.get("enabled"))
    except Exception:
        return False


def _bind_listener(host: str, port: int) -> Any | None:
    """Bind and hold the listening socket, or return None if the port is taken.

    The previous shape bound a probe socket, closed it, and let uvicorn bind
    again. Between those two binds the port was free, so two sidecars starting
    together could both see it as available and one would die on the real bind.
    Binding once and handing the live socket to uvicorn removes the window:
    whoever wins the bind keeps it continuously.

    getaddrinfo picks the family so an IPv6 server_host works as well as IPv4.
    """
    import socket

    try:
        infos = socket.getaddrinfo(
            host, port, type=socket.SOCK_STREAM, flags=socket.AI_PASSIVE
        )
    except socket.gaierror:
        logger.error("server_host %r does not resolve", host)
        return None

    for family, socktype, proto, _canon, sockaddr in infos:
        sock = socket.socket(family, socktype, proto)
        try:
            # SO_REUSEADDR clears TIME_WAIT leftovers; it does not permit a
            # second bind while another process is actually listening, which is
            # the case this function needs to detect.
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(sockaddr)
            sock.listen(128)
            sock.set_inheritable(True)
            return sock
        except OSError:
            sock.close()
            continue
    return None


def create_app() -> Any:
    from contextlib import asynccontextmanager

    from starlette.applications import Starlette
    from starlette.middleware.cors import CORSMiddleware
    from starlette.routing import Route

    @asynccontextmanager
    async def lifespan(_app: Any):
        try:
            yield
        finally:
            await _shutdown_pipeline()

    app = Starlette(
        routes=[
            Route("/health", _handle_health, methods=["GET"]),
            Route("/v1/chat", _handle_chat, methods=["POST"]),
            Route("/v1/chat/stream", _handle_chat_stream, methods=["POST"]),
            Route("/v1/feedback", _handle_feedback, methods=["POST"]),
        ],
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "tauri://localhost",
            "https://tauri.localhost",
        ],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


def main() -> None:
    import sys

    import uvicorn

    logging.basicConfig(level=logging.INFO)
    if not _is_enabled():
        logger.warning(
            "SEMANTIC_ENABLED is off — sidecar will return 503 until enabled"
        )

    # Fail closed rather than expose an unauthenticated sidecar off-host.
    if not _is_loopback_host(CONFIG.server_host) and not CONFIG.auth_token:
        logger.error(
            "Refusing to bind %s without SEMANTIC_AUTH_TOKEN: off-loopback the "
            "sidecar has no access control, and its cache can be read and "
            "poisoned by anyone who can reach the port.",
            CONFIG.server_host,
        )
        sys.exit(2)

    listener = _bind_listener(CONFIG.server_host, CONFIG.server_port)
    if listener is None:
        if _probe_local_health():
            logger.info(
                "Semantic sidecar already running on %s:%s — skipping duplicate startup",
                CONFIG.server_host,
                CONFIG.server_port,
            )
            return
        logger.error(
            "Port %s is in use but /health did not respond — free the port or fix the other process",
            CONFIG.server_port,
        )
        sys.exit(1)

    # Hand uvicorn the socket already bound above; it must not bind again.
    server = uvicorn.Server(uvicorn.Config(create_app(), log_level="info"))
    server.run(sockets=[listener])


if __name__ == "__main__":
    main()
