#!/usr/bin/env python3
"""
Measure semantic layer overhead against the <15ms p95 SLO.

Uses deterministic mock embeddings (no model download) for reproducible CI.
Pass --real-embedder to benchmark with sentence-transformers/all-MiniLM-L6-v2.

Usage:
    python -m semantic_layer.benchmarks.latency_benchmark
    python -m semantic_layer.benchmarks.latency_benchmark --iterations 500 --real-embedder
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import statistics
import time

import numpy as np

from semantic_layer.cache.faiss_cache import FaissSemanticCache
from semantic_layer.compressor.rag_compressor import RagChunk, RagSemanticCompressor
from semantic_layer.config import CONFIG
from semantic_layer.metrics import SemanticMetrics
from semantic_layer.pipeline import SemanticPipeline
from semantic_layer.router.complexity_router import ComplexityRouter


def _deterministic_vector(text: str, dim: int = 384) -> np.ndarray:
    seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    vec = rng.random(dim, dtype=np.float32)
    vec /= np.linalg.norm(vec)
    return vec


class MockEmbedder:
    is_warm = True

    def warm_up(self) -> None:
        return None

    def encode_one(self, text: str) -> tuple[np.ndarray, float]:
        t0 = time.perf_counter()
        vec = _deterministic_vector(text)
        return vec, (time.perf_counter() - t0) * 1000

    def encode(self, texts: list[str]):
        from semantic_layer.embeddings import EmbeddingResult

        t0 = time.perf_counter()
        vectors = np.stack([_deterministic_vector(t) for t in texts])
        return EmbeddingResult(
            vectors=vectors,
            latency_ms=(time.perf_counter() - t0) * 1000,
            model_name="mock",
        )


class NoOpLLM:
    async def generate(self, model_id: str, prompt: str) -> str:
        del model_id, prompt
        return "benchmark response"


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * pct / 100)
    idx = min(idx, len(sorted_vals) - 1)
    return sorted_vals[idx]


def _seed_cache(cache: FaissSemanticCache, n: int = 1000, dim: int = 384) -> None:
    for i in range(n):
        prompt = f"seed prompt {i}"
        vec = _deterministic_vector(prompt, dim)
        cache.store(prompt, f"seed response {i}", vec)


async def run_pipeline_benchmark(
    iterations: int,
    *,
    use_real_embedder: bool,
) -> dict[str, float]:
    if use_real_embedder:
        from semantic_layer.embeddings import EmbeddingService

        embedder = EmbeddingService(device="cpu")
        embedder.warm_up()
    else:
        embedder = MockEmbedder()

    cache = FaissSemanticCache(threshold=0.85, margin=0.02)
    _seed_cache(cache, n=min(5000, iterations * 2))

    pipeline = SemanticPipeline(
        llm=NoOpLLM(),
        cache=cache,
        router=ComplexityRouter(),
        compressor=RagSemanticCompressor(embedder=embedder),
        embedder=embedder,
        enable_auto_tune=False,
        metrics=SemanticMetrics(),
    )

    rag_chunks = [
        RagChunk(f"c{i}", f"RAG chunk content number {i} for benchmark.", "bench")
        for i in range(12)
    ]

    latencies: list[float] = []
    cache_latencies: list[float] = []
    miss_latencies: list[float] = []

    # Warm path: repeated similar query (likely miss with mock vectors)
    for i in range(iterations):
        prompt = f"benchmark query iteration {i % 50}"
        result = await pipeline.run(
            prompt,
            rag_chunks=rag_chunks if i % 3 == 0 else None,
            skip_cache=False,
        )
        latencies.append(result.semantic_latency_ms)
        if result.cache_hit:
            cache_latencies.append(result.semantic_latency_ms)
        else:
            miss_latencies.append(result.semantic_latency_ms)

    # Dedicated cache lookup micro-benchmark (embed + lookup only)
    lookup_only: list[float] = []
    vec, _ = embedder.encode_one("micro lookup probe")
    for _ in range(iterations):
        t0 = time.perf_counter()
        cache.lookup(vec)
        lookup_only.append((time.perf_counter() - t0) * 1000)

    return {
        "iterations": float(iterations),
        "semantic_p50_ms": statistics.median(latencies),
        "semantic_p95_ms": _percentile(latencies, 95),
        "semantic_p99_ms": _percentile(latencies, 99),
        "cache_hit_p95_ms": _percentile(cache_latencies, 95) if cache_latencies else 0.0,
        "cache_miss_p95_ms": _percentile(miss_latencies, 95) if miss_latencies else 0.0,
        "lookup_only_p95_ms": _percentile(lookup_only, 95),
        "slo_target_ms": CONFIG.semantic_layer_p95_ms,
        "slo_pass": float(_percentile(latencies, 95) <= CONFIG.semantic_layer_p95_ms),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Semantic layer latency benchmark")
    parser.add_argument("--iterations", type=int, default=200)
    parser.add_argument(
        "--real-embedder",
        action="store_true",
        help="Use sentence-transformers (downloads model on first run)",
    )
    args = parser.parse_args()

    print(f"Running {args.iterations} iterations (real_embedder={args.real_embedder})...")
    results = asyncio.run(
        run_pipeline_benchmark(args.iterations, use_real_embedder=args.real_embedder)
    )

    print("\n--- Semantic Layer Latency Report ---")
    for key, value in results.items():
        if key == "slo_pass":
            print(f"  {key}: {'PASS' if value else 'FAIL'}")
        elif key == "iterations":
            print(f"  {key}: {int(value)}")
        else:
            print(f"  {key}: {value:.3f} ms")

    if not results["slo_pass"]:
        print(
            f"\nNote: p95 ({results['semantic_p95_ms']:.2f}ms) exceeds SLO "
            f"({results['slo_target_ms']:.0f}ms). "
            "Mock embedder includes full pipeline; use --real-embedder for production profile."
        )


if __name__ == "__main__":
    main()
