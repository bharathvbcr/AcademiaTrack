#!/usr/bin/env python3
"""Demonstrate the semantic layer pipeline with a mock or Ollama backend."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os

from semantic_layer.compressor.rag_compressor import RagChunk
from semantic_layer.orchestrator import OllamaBackend, SemanticPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockLLMBackend:
    """Deterministic backend for local demos without Ollama."""

    async def generate(self, model_id: str, prompt: str) -> str:
        del model_id
        if "Acme Corp" in prompt:
            return "Acme Corp was founded in 2019."
        return f"Mock response for prompt length {len(prompt)}."


async def main(use_ollama: bool) -> None:
    llm = OllamaBackend() if use_ollama else MockLLMBackend()
    pipeline = SemanticPipeline(llm=llm, enable_auto_tune=False)
    pipeline.initialize()

    chunks = [
        RagChunk("c1", "Acme Corp was founded in 2019 in San Francisco.", source="wiki"),
        RagChunk("c2", "Unrelated weather data for Tokyo shows rain.", source="news"),
    ]

    query = "When was Acme Corp founded?"
    logger.info("Running first request (expected cache miss)...")
    result1 = await pipeline.run(query, rag_chunks=chunks, skip_cache=True)
    logger.info("Response: %s", result1.response)
    logger.info(
        "Cache hit=%s model=%s semantic_ms=%.1f breakdown=%s",
        result1.cache_hit,
        result1.model_id,
        result1.semantic_latency_ms,
        result1.breakdown_ms,
    )

    logger.info("Running second request (expected cache hit)...")
    result2 = await pipeline.run(query, rag_chunks=chunks)
    logger.info("Response: %s", result2.response)
    logger.info(
        "Cache hit=%s model=%s semantic_ms=%.1f similarity=%.3f",
        result2.cache_hit,
        result2.model_id,
        result2.semantic_latency_ms,
        result2.cache_similarity,
    )

    snapshot = pipeline.metrics.get_snapshot()
    logger.info("Metrics snapshot: %s", snapshot.to_dict())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Semantic layer pipeline demo")
    parser.add_argument(
        "--ollama",
        action="store_true",
        help="Use Ollama backend instead of mock LLM",
    )
    args = parser.parse_args()
    use_ollama = args.ollama or os.getenv("SEMANTIC_USE_OLLAMA", "").lower() in {
        "1",
        "true",
        "yes",
    }
    asyncio.run(main(use_ollama=use_ollama))
