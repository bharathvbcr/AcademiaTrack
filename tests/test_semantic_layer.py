"""Unit tests for the semantic layer package."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import numpy as np
import pytest

from semantic_layer.cache.faiss_cache import FaissSemanticCache
from semantic_layer.compressor.rag_compressor import RagChunk, RagSemanticCompressor
from semantic_layer.config import SemanticLayerConfig
from semantic_layer.metrics import SemanticMetrics
from semantic_layer.orchestrator import SemanticPipeline
from semantic_layer.router.complexity_router import ComplexityRouter
from semantic_layer.threshold_tuner import ThresholdAutoTuner


def _unit_vector(seed: int, dim: int = 384) -> np.ndarray:
    rng = np.random.default_rng(seed)
    vec = rng.random(dim, dtype=np.float32)
    vec /= np.linalg.norm(vec)
    return vec


class TestConfig:
    def test_defaults(self) -> None:
        cfg = SemanticLayerConfig()
        assert cfg.embedding_model == "sentence-transformers/all-MiniLM-L6-v2"
        assert cfg.similarity_threshold == 0.90
        assert cfg.cache_backend.value == "faiss"


class TestFaissCache:
    def test_store_and_hit(self) -> None:
        cache = FaissSemanticCache(threshold=0.85, margin=0.01)
        prompt = "What is Python?"
        response = "Python is a programming language."
        vec = _unit_vector(1)

        cache.store(prompt, response, vec)
        result = cache.lookup(vec)

        assert result.hit is True
        assert result.response == response
        assert result.similarity == pytest.approx(1.0, abs=1e-5)

    def test_margin_guard_rejects_ambiguous_neighbors(self) -> None:
        cache = FaissSemanticCache(threshold=0.80, margin=0.20)
        dim = 384
        vec_a = np.zeros(dim, dtype=np.float32)
        vec_a[0] = 1.0
        vec_b = vec_a.copy()
        vec_b[0] = 0.92
        vec_b[1] = 0.08
        vec_b /= np.linalg.norm(vec_b)
        vec_query = vec_a.copy()

        cache.store("prompt a", "response a", vec_a)
        cache.store("prompt b", "response b", vec_b)

        result = cache.lookup(vec_query, top_k=2)
        assert result.hit is False
        assert "ambiguous_margin" in result.reason

    def test_ood_gating(self) -> None:
        cache = FaissSemanticCache(threshold=0.80, margin=0.01)
        domain = _unit_vector(42)
        cache.set_domain_centroid(domain)

        prompt_vec = _unit_vector(99)
        cache.store("in-domain", "answer", domain)

        result = cache.lookup(prompt_vec)
        assert result.hit is False
        assert result.reason == "ood_query"


class TestComplexityRouter:
    def test_simple_prompt_routes_small(self) -> None:
        router = ComplexityRouter(complexity_threshold=0.55)
        decision = router.route("hi, what is python?", _unit_vector(1))
        assert decision.tier.value == "small"

    def test_complex_prompt_routes_large(self) -> None:
        router = ComplexityRouter(complexity_threshold=0.40)
        prompt = (
            "Analyze and compare the trade-offs between microservices and monoliths, "
            "then implement a benchmark plan with multi-step validation."
        )
        decision = router.route(prompt, _unit_vector(2))
        assert decision.tier.value == "large"


class TestRagCompressor:
    def test_mmr_selects_relevant_chunk(self) -> None:
        embedder = MagicMock()
        query_vec = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        chunk_vectors = np.array(
            [
                [0.95, 0.05, 0.0],
                [0.0, 1.0, 0.0],
            ],
            dtype=np.float32,
        )
        embedder.encode.return_value = MagicMock(vectors=chunk_vectors)

        compressor = RagSemanticCompressor(
            embedder=embedder,
            min_relevance=0.30,
            max_chunks=2,
            max_tokens=500,
        )
        chunks = [
            RagChunk("c1", "Acme Corp founded in 2019", source="wiki"),
            RagChunk("c2", "Weather in Tokyo", source="news"),
        ]
        result = compressor.compress("When was Acme founded?", query_vec, chunks)

        assert result.selected_chunk_count == 1
        assert "2019" in result.text
        assert "Tokyo" not in result.text


class TestThresholdAutoTuner:
    def test_tune_once_updates_threshold(self) -> None:
        cache = FaissSemanticCache(threshold=0.90, margin=0.01)
        tuner = ThresholdAutoTuner(cache, window_size=100, tune_interval=999)

        for _ in range(60):
            tuner.record(similarity=0.95, accepted=True)
        for _ in range(10):
            tuner.record(similarity=0.86, accepted=False)

        previous = cache.threshold
        tuned = tuner.tune_once()
        assert tuned is not None
        assert cache.threshold != previous or tuned == previous


class TestSemanticPipeline:
    @pytest.mark.asyncio
    async def test_cache_hit_skips_llm(self) -> None:
        llm = MagicMock()
        llm.generate = MagicMock()

        class FakeEmbedder:
            is_warm = True

            def warm_up(self) -> None:
                return None

            def encode_one(self, text: str) -> tuple[np.ndarray, float]:
                del text
                return _unit_vector(7), 1.0

        cache = FaissSemanticCache(threshold=0.80, margin=0.01)
        vec = _unit_vector(7)
        cache.store("cached question", "cached answer", vec)

        pipeline = SemanticPipeline(
            llm=llm,
            cache=cache,
            embedder=FakeEmbedder(),
            enable_auto_tune=False,
            metrics=SemanticMetrics(),
        )

        result = await pipeline.run("cached question")
        assert result.cache_hit is True
        assert result.response == "cached answer"
        llm.generate.assert_not_called()

    @pytest.mark.asyncio
    async def test_miss_calls_llm_and_schedules_write_back(self) -> None:
        class FakeLLM:
            async def generate(self, model_id: str, prompt: str) -> str:
                del model_id
                return f"generated:{prompt[:20]}"

        class FakeEmbedder:
            is_warm = True

            def warm_up(self) -> None:
                return None

            def encode_one(self, text: str) -> tuple[np.ndarray, float]:
                return _unit_vector(hash(text) % 1000), 1.0

        cache = FaissSemanticCache(threshold=0.99, margin=0.01)
        pipeline = SemanticPipeline(
            llm=FakeLLM(),
            cache=cache,
            embedder=FakeEmbedder(),
            enable_auto_tune=False,
            metrics=SemanticMetrics(),
        )

        result = await pipeline.run("brand new question", skip_cache=False)
        assert result.cache_hit is False
        assert result.response.startswith("generated:")

        await asyncio.sleep(0.1)
        assert len(cache._entries) >= 1


class TestMetrics:
    def test_snapshot_aggregation(self) -> None:
        metrics = SemanticMetrics()
        metrics.record_embed(4.0)
        metrics.record_cache_lookup(2.0, hit=True)
        metrics.record_cache_lookup(3.0, hit=False)
        metrics.record_router(1.0, tier="small")
        metrics.record_semantic_total(10.0)

        snapshot = metrics.get_snapshot()
        assert snapshot.cache_hits == 1
        assert snapshot.cache_misses == 1
        assert snapshot.cache_hit_rate == 0.5
        assert snapshot.embed_latency_count == 1
