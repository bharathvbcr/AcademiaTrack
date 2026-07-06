"""Regression tests for the semantic-layer audit fixes (C1–C4, M1–M3, gaps).

Each test targets a specific defect from the audit so a reintroduction fails CI.
"""

from __future__ import annotations

import asyncio
import json
import threading
import time
from unittest.mock import AsyncMock, patch

import numpy as np
import pytest

from semantic_layer.cache.chroma_cache import ChromaSemanticCache
from semantic_layer.cache.faiss_cache import FaissSemanticCache
from semantic_layer.metrics import SemanticMetrics, _percentile
from semantic_layer.orchestrator import SemanticPipeline


def _vec(seed: int, dim: int = 384) -> np.ndarray:
    rng = np.random.default_rng(seed)
    vec = rng.random(dim, dtype=np.float32)
    vec /= np.linalg.norm(vec)
    return vec


class _FixedEmbedder:
    """Deterministic embedder: same text -> same vector, no model download."""

    is_warm = True

    def warm_up(self) -> None:
        return None

    def encode_one(self, text: str) -> tuple[np.ndarray, float]:
        return _vec(abs(hash(text)) % 100_000), 1.0

    def encode(self, texts):
        from semantic_layer.embeddings import EmbeddingResult

        vectors = np.stack([_vec(abs(hash(t)) % 100_000) for t in texts])
        return EmbeddingResult(vectors=vectors, latency_ms=1.0, model_name="fixed")


# --- C2: model-version scoping + cross-backend parity ------------------------------


@pytest.mark.parametrize("backend", ["faiss", "chroma"])
def test_model_version_scoping_parity(backend: str, tmp_path) -> None:
    """FAISS previously ignored model_version (del model_version); both backends
    must now scope identically."""
    if backend == "faiss":
        cache = FaissSemanticCache(threshold=0.80, margin=0.0)
    else:
        cache = ChromaSemanticCache(
            persist_directory=str(tmp_path / "chroma"), threshold=0.80, margin=0.0
        )

    vec = _vec(3)
    cache.store("q", "answer-v1", vec, model_version="v1")

    assert cache.lookup(vec, model_version="v1").hit is True
    assert cache.lookup(vec, model_version="v2").hit is False  # wrong model => miss
    assert cache.lookup(vec).hit is True  # None => unscoped => hit


def test_faiss_delete_by_model_version() -> None:
    cache = FaissSemanticCache(threshold=0.80, margin=0.0)
    vec = _vec(4)
    cache.store("q", "a", vec, model_version="v1")
    cache.store("q2", "b", _vec(5), model_version="v2")

    cache.delete_by_model_version("v1")
    assert cache.lookup(vec, model_version="v1").hit is False
    assert cache.lookup(_vec(5), model_version="v2").hit is True


# --- C1: lookup/store race must not raise or return wrong entries ------------------


def test_faiss_concurrent_store_lookup_no_race() -> None:
    """Old code resolved _id_order[idx] outside the lock; a concurrent rebuild
    could IndexError or return the wrong entry. Stress writers + readers."""
    cache = FaissSemanticCache(threshold=0.50, margin=0.0, max_entries=40)
    errors: list[Exception] = []
    stop = threading.Event()

    def writer(base: int) -> None:
        i = 0
        while not stop.is_set():
            try:
                cache.store(f"p{base}-{i}", f"r{base}-{i}", _vec((base * 97_003 + i) % 1_900_000))
            except Exception as exc:  # noqa: BLE001 - collecting for assertion
                errors.append(exc)
            i += 1

    def reader(base: int) -> None:
        i = 0
        while not stop.is_set():
            try:
                cache.lookup(_vec((base * 31 + i) % 1_900_000))
            except Exception as exc:  # noqa: BLE001
                errors.append(exc)
            i += 1

    threads = [threading.Thread(target=writer, args=(k,)) for k in range(3)]
    threads += [threading.Thread(target=reader, args=(k,)) for k in range(3)]
    for t in threads:
        t.start()
    time.sleep(0.7)
    stop.set()
    for t in threads:
        t.join(timeout=5)

    assert not errors, errors[:3]


# --- gap: embedding-dim guard ------------------------------------------------------


def test_store_rejects_wrong_dim() -> None:
    cache = FaissSemanticCache()  # dim defaults to CONFIG.embedding_dim (384)
    with pytest.raises(ValueError):
        cache.store("q", "a", np.ones(128, dtype=np.float32))


# --- C4: negative-cache guard + task retention ------------------------------------


@pytest.mark.asyncio
async def test_empty_response_not_cached() -> None:
    class EmptyLLM:
        async def generate(self, model_id: str, prompt: str) -> str:
            return "   "  # whitespace-only = errored/empty

    cache = FaissSemanticCache(threshold=0.99, margin=0.0)
    pipe = SemanticPipeline(
        llm=EmptyLLM(),
        cache=cache,
        embedder=_FixedEmbedder(),
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )
    await pipe.run("brand new question")
    await asyncio.sleep(0.05)
    assert len(cache._entries) == 0


@pytest.mark.asyncio
async def test_write_back_task_is_retained_and_completes() -> None:
    class LLM:
        async def generate(self, model_id: str, prompt: str) -> str:
            return "real answer"

    cache = FaissSemanticCache(threshold=0.99, margin=0.0)
    pipe = SemanticPipeline(
        llm=LLM(),
        cache=cache,
        embedder=_FixedEmbedder(),
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )
    await pipe.run("a question")
    assert len(pipe._pending_writes) >= 0  # ref set exists
    await asyncio.sleep(0.05)
    assert len(cache._entries) == 1
    assert len(pipe._pending_writes) == 0  # discarded after completion


# --- M1: cache hit must NOT auto-feed the tuner -----------------------------------


@pytest.mark.asyncio
async def test_cache_hit_does_not_poison_tuner() -> None:
    cache = FaissSemanticCache(threshold=0.50, margin=0.0)
    embedder = _FixedEmbedder()
    vec, _ = embedder.encode_one("cached q")
    cache.store("cached q", "cached a", vec)

    class LLM:
        async def generate(self, model_id: str, prompt: str) -> str:
            return "unused"

    pipe = SemanticPipeline(
        llm=LLM(),
        cache=cache,
        embedder=embedder,
        enable_auto_tune=True,  # tuner exists
        metrics=SemanticMetrics(),
    )
    result = await pipe.run("cached q")
    assert result.cache_hit is True
    assert pipe.tuner is not None
    assert len(pipe.tuner.window) == 0  # hit did not record accepted=True


# --- M2: real token streaming -----------------------------------------------------


@pytest.mark.asyncio
async def test_run_stream_emits_tokens_then_done() -> None:
    class StreamLLM:
        async def generate(self, model_id: str, prompt: str) -> str:
            return "whole"

        async def generate_stream(self, model_id: str, prompt: str):
            for tok in ["a", "b", "c"]:
                yield tok

    cache = FaissSemanticCache(threshold=0.99, margin=0.0)  # force miss
    pipe = SemanticPipeline(
        llm=StreamLLM(),
        cache=cache,
        embedder=_FixedEmbedder(),
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )
    events = [e async for e in pipe.run_stream("q", skip_cache=True)]
    tokens = [e["content"] for e in events if e["type"] == "token"]
    done = [e for e in events if e["type"] == "done"][0]

    assert tokens == ["a", "b", "c"]
    assert done["response"] == "abc"
    assert done["cache_hit"] is False


@pytest.mark.asyncio
async def test_run_stream_cache_hit_emits_cached_text() -> None:
    class StreamLLM:
        async def generate(self, model_id: str, prompt: str) -> str:
            return "unused"

        async def generate_stream(self, model_id: str, prompt: str):
            yield "unused"

    cache = FaissSemanticCache(threshold=0.50, margin=0.0)
    embedder = _FixedEmbedder()
    vec, _ = embedder.encode_one("q")
    cache.store("q", "cached ans", vec)

    pipe = SemanticPipeline(
        llm=StreamLLM(),
        cache=cache,
        embedder=embedder,
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )
    events = [e async for e in pipe.run_stream("q")]
    done = [e for e in events if e["type"] == "done"][0]

    assert any(e["type"] == "token" and e["content"] == "cached ans" for e in events)
    assert done["cache_hit"] is True


# --- M3: SSRF guard ----------------------------------------------------------------


def test_chat_rejects_disallowed_ollama_base() -> None:
    from starlette.testclient import TestClient

    from semantic_layer.server import create_app

    with patch("semantic_layer.server._is_enabled", return_value=True), patch(
        "semantic_layer.server._get_pipeline", new=AsyncMock()
    ):
        client = TestClient(create_app())
        res = client.post(
            "/v1/chat",
            content=json.dumps(
                {
                    "messages": [{"role": "user", "content": "hi"}],
                    "model": "llama3.1",
                    "ollama_base_url": "http://169.254.169.254/latest/meta-data/",
                }
            ),
            headers={"Content-Type": "application/json"},
        )
        assert res.status_code == 400
        assert "not allowed" in res.json()["error"]


# --- gap: p95/p99 percentile instrumentation --------------------------------------


def test_metrics_track_p95() -> None:
    metrics = SemanticMetrics()
    for latency in range(1, 101):  # 1..100 ms
        metrics.record_semantic_total(float(latency))
    snap = metrics.get_snapshot()
    assert 90 <= snap.semantic_total_p95_ms <= 100
    assert snap.semantic_total_p99_ms >= snap.semantic_total_p95_ms


def test_percentile_empty_is_zero() -> None:
    assert _percentile([], 95.0) == 0.0
