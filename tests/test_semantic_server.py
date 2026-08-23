"""Integration tests for AcademiaTrack semantic sidecar."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from semantic_layer.adapters import messages_to_semantic_request


class TestMessageAdapter:
    def test_splits_last_user_prompt_and_context_chunks(self) -> None:
        messages = [
            {"role": "system", "content": "System instructions"},
            {"role": "user", "content": "Earlier question"},
            {"role": "assistant", "content": "Earlier answer"},
            {"role": "user", "content": "Follow-up question"},
        ]
        req = messages_to_semantic_request(messages, model_version="llama3.1")
        assert req.prompt == "Follow-up question"
        assert len(req.rag_chunks) == 3
        assert req.rag_chunks[0].source == "system"


@pytest.mark.asyncio
async def test_health_endpoint_reports_disabled() -> None:
    from starlette.testclient import TestClient

    from semantic_layer.server import create_app

    with patch("semantic_layer.server._is_enabled", return_value=False):
        client = TestClient(create_app())
        res = client.get("/health")
        assert res.status_code == 200
        body = res.json()
        assert body["enabled"] is False
        assert body["ready"] is False


@pytest.mark.asyncio
async def test_chat_endpoint_runs_pipeline() -> None:
    from starlette.testclient import TestClient

    from semantic_layer.orchestrator import PipelineResult
    from semantic_layer.server import create_app

    fake_result = PipelineResult(
        response="Hello from semantic layer",
        cache_hit=False,
        model_id="llama3.1",
        semantic_latency_ms=3.5,
        breakdown_ms={"embed": 1.0},
        cache_similarity=0.0,
    )

    mock_pipeline = MagicMock()
    mock_pipeline.is_ready = True
    mock_pipeline.run = AsyncMock(return_value=fake_result)
    mock_pipeline.cache = MagicMock()
    mock_pipeline.router = MagicMock()
    mock_pipeline.compressor = MagicMock()
    mock_pipeline.embedder = MagicMock()
    mock_pipeline.metrics = MagicMock()

    per_request_pipeline = MagicMock()
    per_request_pipeline.run = AsyncMock(return_value=fake_result)

    with patch("semantic_layer.server._is_enabled", return_value=True), patch(
        "semantic_layer.server._get_pipeline",
        new=AsyncMock(return_value=mock_pipeline),
    ), patch(
        "semantic_layer.server.SemanticPipeline",
        return_value=per_request_pipeline,
    ):
        client = TestClient(create_app())
        res = client.post(
            "/v1/chat",
            content=json.dumps(
                {
                    "messages": [{"role": "user", "content": "hi"}],
                    "model": "llama3.1",
                    "ollama_base_url": "http://localhost:11434",
                }
            ),
            headers={"Content-Type": "application/json"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["response"] == "Hello from semantic layer"
        per_request_pipeline.run.assert_awaited()


@pytest.mark.asyncio
async def test_create_app_includes_cors_middleware() -> None:
    from starlette.testclient import TestClient

    from semantic_layer.server import create_app

    client = TestClient(create_app())
    res = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_main_skips_when_sidecar_already_running(monkeypatch) -> None:
    """A second sidecar must stand down rather than fight for the port.

    The mechanism changed with the TOCTOU fix: main() no longer probes with a
    throwaway socket and then lets uvicorn bind again, it binds once and hands
    the live socket over. So the test now stubs the bind rather than the probe.
    The expectation is unchanged and slightly stronger -- the server must not
    be started by any path.
    """
    import uvicorn

    from semantic_layer import server

    monkeypatch.setattr(server, "_bind_listener", lambda _host, _port: None)
    monkeypatch.setattr(server, "_probe_local_health", lambda: True)
    monkeypatch.setattr(server, "_is_enabled", lambda: True)

    called = {"served": False}

    def fake_run(_self, *_args, **_kwargs):
        called["served"] = True

    monkeypatch.setattr(uvicorn.Server, "run", fake_run)
    monkeypatch.setattr(uvicorn, "run", lambda *a, **k: called.__setitem__("served", True))

    server.main()
    assert called["served"] is False


@pytest.mark.asyncio
async def test_chat_stream_endpoint_emits_sse() -> None:
    from starlette.testclient import TestClient

    from semantic_layer.orchestrator import PipelineResult
    from semantic_layer.server import create_app

    stream_calls: list[dict] = []

    async def fake_run_stream(**kwargs):
        stream_calls.append(kwargs)
        yield {"type": "token", "content": "Streamed "}
        yield {"type": "token", "content": "hello"}
        yield {
            "type": "done",
            "response": "Streamed hello",
            "cache_hit": False,
            "model_id": "llama3.1",
            "semantic_latency_ms": 2.0,
            "breakdown_ms": {"embed": 0.5},
            "cache_similarity": 0.0,
        }

    mock_pipeline = MagicMock()
    mock_pipeline.is_ready = True
    mock_pipeline.cache = MagicMock()
    mock_pipeline.router = MagicMock()
    mock_pipeline.compressor = MagicMock()
    mock_pipeline.embedder = MagicMock()
    mock_pipeline.metrics = MagicMock()

    per_request_pipeline = MagicMock()
    per_request_pipeline.run_stream = fake_run_stream

    with patch("semantic_layer.server._is_enabled", return_value=True), patch(
        "semantic_layer.server._get_pipeline",
        new=AsyncMock(return_value=mock_pipeline),
    ), patch(
        "semantic_layer.server.SemanticPipeline",
        return_value=per_request_pipeline,
    ):
        client = TestClient(create_app())
        with client.stream(
            "POST",
            "/v1/chat/stream",
            content=json.dumps(
                {
                    "messages": [{"role": "user", "content": "hi"}],
                    "model": "llama3.1",
                    "ollama_base_url": "http://localhost:11434",
                }
            ),
            headers={"Content-Type": "application/json"},
        ) as res:
            assert res.status_code == 200
            assert res.headers["content-type"].startswith("text/event-stream")
            body = "".join(res.iter_text())

    assert "data:" in body
    assert "Streamed hello" in body
    assert '"type": "done"' in body or '"type":"done"' in body
    assert len(stream_calls) == 1  # run_stream was consumed exactly once
