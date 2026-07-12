"""
HTTP sidecar exposing SemanticPipeline to the AcademiaTrack desktop app.

Run: python -m semantic_layer.server
Enable: SEMANTIC_ENABLED=1
"""

from __future__ import annotations

import asyncio
import json
import logging
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
    if host in CONFIG.ollama_allowed_hosts or host.endswith(".localhost"):
        return url
    return None


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

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return None, JSONResponse({"error": "invalid JSON body"}, status_code=400)

    if not isinstance(body, dict):
        return None, JSONResponse({"error": "invalid JSON body"}, status_code=400)

    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        return None, JSONResponse({"error": "messages required"}, status_code=400)

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
        return None, None, JSONResponse({"error": str(exc)}, status_code=500)

    run_kwargs = {
        "prompt": semantic_req.prompt,
        "rag_chunks": semantic_req.rag_chunks or None,
        "skip_cache": skip_cache,
        "model_version": semantic_req.model_version,
    }
    return pipeline, run_kwargs, None


async def _handle_chat(request: Any) -> Any:
    from starlette.responses import JSONResponse

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
        return JSONResponse({"error": str(exc)}, status_code=500)

    return JSONResponse(_result_payload(result))


async def _handle_chat_stream(request: Any) -> Any:
    from starlette.responses import JSONResponse, StreamingResponse

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
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


async def _handle_feedback(request: Any) -> Any:
    from starlette.responses import JSONResponse

    if not _is_enabled():
        return JSONResponse({"error": "semantic layer disabled"}, status_code=503)

    try:
        body = await request.json()
        similarity = float(body.get("similarity", 0.0))
        accepted = bool(body.get("accepted", True))
    except (json.JSONDecodeError, TypeError, ValueError):
        return JSONResponse({"error": "invalid feedback payload"}, status_code=400)

    try:
        pipeline = await _get_pipeline()
        pipeline.record_feedback(similarity, accepted)
    except Exception as exc:
        logger.exception("Feedback recording failed")
        return JSONResponse({"error": str(exc)}, status_code=500)

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


def _port_in_use(host: str, port: int) -> bool:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            return False
        except OSError:
            return True


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

    if _port_in_use(CONFIG.server_host, CONFIG.server_port):
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

    uvicorn.run(
        create_app(),
        host=CONFIG.server_host,
        port=CONFIG.server_port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
