#!/usr/bin/env python3
"""
End-to-end semantic layer example with mock LLM backends.

No GPU or Ollama required. Uses deterministic fake embeddings for cache demos
and asyncio mock models for routing.

Usage:
    python -m semantic_layer.examples.basic_pipeline
"""

from __future__ import annotations

import asyncio
import hashlib

import numpy as np

from semantic_layer.cache.faiss_cache import FaissSemanticCache
from semantic_layer.compressor.rag_compressor import RagChunk, RagSemanticCompressor
from semantic_layer.metrics import SemanticMetrics
from semantic_layer.pipeline import SemanticPipeline
from semantic_layer.router.complexity_router import ComplexityRouter


def _deterministic_vector(text: str, dim: int = 384) -> np.ndarray:
    """Hash-seeded unit vector — stable across runs, no model download."""
    seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    vec = rng.random(dim, dtype=np.float32)
    vec /= np.linalg.norm(vec)
    return vec


class MockEmbedder:
    """CPU-only embedder for examples; avoids sentence-transformers download."""

    is_warm = True

    def warm_up(self) -> None:
        return None

    def encode_one(self, text: str) -> tuple[np.ndarray, float]:
        return _deterministic_vector(text), 0.5

    def encode(self, texts: list[str]):
        from semantic_layer.embeddings import EmbeddingResult

        vectors = np.stack([_deterministic_vector(t) for t in texts])
        return EmbeddingResult(vectors=vectors, latency_ms=1.0, model_name="mock")


class MockLLMRegistry:
    """Routes to lightweight or heavyweight mock backends by model id."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    async def generate(self, model_id: str, prompt: str) -> str:
        self.calls.append((model_id, prompt))
        if "1b" in model_id or "3b" in model_id:
            return f"[small:{model_id}] {prompt[:80]}..."
        return f"[large:{model_id}] Detailed analysis: {prompt[:120]}..."


async def demo_cache_hit() -> None:
    print("\n=== Cache hit (skips LLM) ===")
    cache = FaissSemanticCache(threshold=0.85, margin=0.02)
    embedder = MockEmbedder()
    llm = MockLLMRegistry()

    prompt = "What is AcademiaTrack?"
    vec, _ = embedder.encode_one(prompt)
    cache.store(prompt, "AcademiaTrack is a research productivity app.", vec)

    pipeline = SemanticPipeline(
        llm=llm,
        cache=cache,
        embedder=embedder,
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )

    result = await pipeline.run(prompt)
    print(f"  cache_hit={result.cache_hit}, latency={result.semantic_latency_ms:.2f}ms")
    print(f"  response={result.response}")
    assert result.cache_hit
    assert len(llm.calls) == 0


async def demo_routing_and_rag() -> None:
    print("\n=== Cache miss → router → compressor → LLM ===")
    cache = FaissSemanticCache(threshold=0.99, margin=0.02)
    embedder = MockEmbedder()
    llm = MockLLMRegistry()
    router = ComplexityRouter(complexity_threshold=0.45)
    compressor = RagSemanticCompressor(embedder=embedder, max_chunks=3, max_tokens=512)

    pipeline = SemanticPipeline(
        llm=llm,
        cache=cache,
        router=router,
        compressor=compressor,
        embedder=embedder,
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )

    prompt = (
        "Analyze and compare trade-offs between semantic caching and exact-match "
        "caching for LLM inference pipelines."
    )
    chunks = [
        RagChunk("c1", "Semantic caches use embedding similarity instead of string equality.", "docs"),
        RagChunk("c2", "Exact-match caches have zero false positives but near-zero hit rate.", "docs"),
        RagChunk("c3", "Weather forecast for Seattle: rain likely.", "news"),
    ]

    result = await pipeline.run(prompt, rag_chunks=chunks, skip_cache=True)
    print(f"  model_id={result.model_id}, cache_hit={result.cache_hit}")
    print(f"  semantic_latency={result.semantic_latency_ms:.2f}ms")
    print(f"  breakdown={result.breakdown_ms}")
    print(f"  response={result.response[:100]}...")
    assert not result.cache_hit
    assert len(llm.calls) == 1


async def demo_threshold_feedback() -> None:
    print("\n=== Threshold auto-tuning feedback ===")
    from semantic_layer.threshold import ThresholdAutoTuner

    cache = FaissSemanticCache(threshold=0.90, margin=0.02)
    tuner = ThresholdAutoTuner(cache, window_size=100, tune_interval=999)

    for _ in range(55):
        tuner.record(similarity=0.94, accepted=True)
    for _ in range(8):
        tuner.record(similarity=0.87, accepted=False)

    before = cache.threshold
    tuned = tuner.tune_once()
    print(f"  threshold {before:.4f} → {cache.threshold:.4f} (tuned={tuned})")


async def main() -> None:
    await demo_cache_hit()
    await demo_routing_and_rag()
    await demo_threshold_feedback()
    print("\nAll examples completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
