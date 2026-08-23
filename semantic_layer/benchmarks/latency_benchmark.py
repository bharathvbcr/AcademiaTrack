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


def _seed_cache(cache: FaissSemanticCache, embedder, n: int = 1000) -> None:
    """Seed the cache using the same embedder the pipeline will query with.

    This previously always stored _deterministic_vector() mock vectors. Under
    --real-embedder that put the cache in a different vector space than the
    queries, so nothing could clear the similarity threshold: every run
    reported a 0% hit rate and timed a miss path against a cache that could
    not hit. The seed and the query must share an encoder for the hit-path
    numbers to mean anything.
    """
    for i in range(n):
        prompt = f"seed prompt {i}"
        vec, _ = embedder.encode_one(prompt)
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
    _seed_cache(cache, embedder, n=min(5000, iterations * 2))

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

    # Dedicated hit-path phase: replay prompts that ARE in the cache.
    #
    # The loop above queries "benchmark query iteration N" against a cache
    # seeded with "seed prompt N". Those are unrelated strings, so no query
    # could ever clear the similarity threshold and cache_hit_p95_ms was
    # structurally 0.000 -- reported in the same shape as a measured value.
    # Replaying seeded prompts verbatim is what makes the hit path observable.
    hit_latencies: list[float] = []
    hit_count = 0
    seeded = min(5000, iterations * 2)
    for i in range(iterations):
        result = await pipeline.run(
            f"seed prompt {i % seeded}", rag_chunks=None, skip_cache=False
        )
        hit_latencies.append(result.semantic_latency_ms)
        if result.cache_hit:
            hit_count += 1

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
        "replay_hit_p50_ms": statistics.median(hit_latencies),
        "replay_hit_p95_ms": _percentile(hit_latencies, 95),
        "replay_hit_rate": hit_count / iterations if iterations else 0.0,
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
    parser.add_argument(
        "--json-out",
        help="Write the report to this path as JSON, with run metadata",
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
        elif key == "replay_hit_rate":
            print(f"  {key}: {value:.1%}")
        else:
            print(f"  {key}: {value:.3f} ms")

    if args.json_out:
        import json
        import platform

        payload = {
            "results": results,
            "run": {
                "real_embedder": args.real_embedder,
                "iterations": args.iterations,
                "python": platform.python_version(),
                "platform": platform.platform(),
                "machine": platform.machine(),
            },
        }
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, sort_keys=True)
            fh.write("\n")
        print(f"\nWrote {args.json_out}")

    if not results["slo_pass"]:
        print(
            f"\nNote: p95 ({results['semantic_p95_ms']:.2f}ms) exceeds SLO "
            f"({results['slo_target_ms']:.0f}ms). "
            "Mock embedder includes full pipeline; use --real-embedder for production profile."
        )


if __name__ == "__main__":
    main()
