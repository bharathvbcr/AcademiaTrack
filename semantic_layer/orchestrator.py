"""
End-to-end semantic layer orchestrator.

Integrates with Ollama, llama.cpp, or HuggingFace via injectable LLM backend.
Supports both a buffered path (:meth:`SemanticPipeline.run`) and a true
token-streaming path (:meth:`SemanticPipeline.run_stream`).
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import AsyncIterator, Protocol, runtime_checkable

import numpy as np

from semantic_layer.cache.base import SemanticCache
from semantic_layer.cache.chroma_cache import ChromaSemanticCache
from semantic_layer.cache.faiss_cache import FaissSemanticCache
from semantic_layer.compressor.rag_compressor import RagChunk, RagSemanticCompressor
from semantic_layer.config import CONFIG, CacheBackend
from semantic_layer.embeddings import EmbeddingService
from semantic_layer.metrics import METRICS, SemanticMetrics
from semantic_layer.router.complexity_router import ComplexityRouter, RoutingDecision
from semantic_layer.threshold_tuner import ThresholdAutoTuner
from semantic_layer.vectortypes import FloatVector

logger = logging.getLogger(__name__)


class LLMBackend(Protocol):
    async def generate(self, model_id: str, prompt: str) -> str: ...


@runtime_checkable
class StreamingLLMBackend(Protocol):
    async def generate(self, model_id: str, prompt: str) -> str: ...

    def generate_stream(self, model_id: str, prompt: str) -> AsyncIterator[str]: ...


@dataclass
class PipelineResult:
    response: str
    cache_hit: bool
    model_id: str
    semantic_latency_ms: float
    breakdown_ms: dict[str, float] = field(default_factory=dict)
    cache_similarity: float = 0.0


def create_cache(backend: CacheBackend | None = None) -> SemanticCache:
    selected = backend or CONFIG.cache_backend
    if selected == CacheBackend.CHROMA:
        return ChromaSemanticCache()
    return FaissSemanticCache()


class SemanticPipeline:
    def __init__(
        self,
        llm: LLMBackend,
        cache: SemanticCache | None = None,
        router: ComplexityRouter | None = None,
        compressor: RagSemanticCompressor | None = None,
        embedder: EmbeddingService | None = None,
        *,
        enable_auto_tune: bool = True,
        metrics: SemanticMetrics | None = None,
    ) -> None:
        self.llm = llm
        self.embedder = embedder or EmbeddingService()
        self.cache = cache or create_cache()
        self.router = router or ComplexityRouter()
        self.compressor = compressor or RagSemanticCompressor(embedder=self.embedder)
        self.metrics = metrics or METRICS
        self.tuner = ThresholdAutoTuner(self.cache) if enable_auto_tune else None
        self._pending_writes: set[asyncio.Task] = set()

    @property
    def is_ready(self) -> bool:
        embedder_ready = self.embedder.is_warm
        cache_ready = getattr(self.cache, "is_ready", True)
        return embedder_ready and cache_ready

    def initialize(self) -> None:
        """Call at process startup to eliminate cold-start."""
        self.embedder.warm_up()
        self._fit_router_centroids()
        if hasattr(self.cache, "_ensure_index"):
            self.cache._ensure_index()  # type: ignore[attr-defined]
        elif hasattr(self.cache, "_ensure_collection"):
            self.cache._ensure_collection()  # type: ignore[attr-defined]
        if self.tuner:
            self.tuner.start()
        logger.info("SemanticPipeline initialized")

    def _fit_router_centroids(self) -> None:
        """Fit simple/complex (and optional OOD) centroids from anchor phrases.

        Without this, ``ComplexityRouter._embedding_score`` returns a constant
        0.5 and the OOD gate never fires — i.e. the router's semantic signal and
        OOD gating are dead. Called once at startup.
        """

        def _unit(vec: FloatVector) -> FloatVector:
            norm = float(np.linalg.norm(vec))
            return (vec / norm if norm > 0 else vec).astype(np.float32)

        try:
            simple = self.embedder.encode(list(CONFIG.router_simple_anchors)).vectors.mean(axis=0)
            complex_ = self.embedder.encode(list(CONFIG.router_complex_anchors)).vectors.mean(axis=0)
            self.router.set_centroids(_unit(simple), _unit(complex_))

            if CONFIG.ood_domain_anchors and hasattr(self.cache, "set_domain_centroid"):
                domain = self.embedder.encode(list(CONFIG.ood_domain_anchors)).vectors.mean(axis=0)
                self.cache.set_domain_centroid(_unit(domain))  # type: ignore[attr-defined]
            logger.info("Router centroids fitted from anchor phrases")
        except Exception:
            logger.exception("Centroid fitting failed; router falls back to heuristic-only")

    # -- shared front-half stages -------------------------------------------------

    def _embed_and_lookup(
        self,
        prompt: str,
        *,
        skip_cache: bool,
        model_version: str,
        breakdown: dict[str, float],
    ):
        query_vec, embed_ms = self.embedder.encode_one(prompt)
        breakdown["embed"] = embed_ms
        self.metrics.record_embed(embed_ms)

        cache_result = None
        if not skip_cache:
            cache_result = self.cache.lookup(query_vec, model_version=model_version)
            breakdown["cache"] = cache_result.latency_ms
            self.metrics.record_cache_lookup(cache_result.latency_ms, hit=cache_result.hit)
        return query_vec, cache_result

    def _route_and_build_prompt(
        self,
        prompt: str,
        query_vec: FloatVector,
        rag_chunks: list[RagChunk] | None,
        breakdown: dict[str, float],
    ) -> tuple[RoutingDecision, str]:
        route = self.router.route(prompt, query_vec)
        breakdown["router"] = route.latency_ms
        self.metrics.record_router(route.latency_ms, tier=route.tier.value)

        compressed_ctx = ""
        if rag_chunks:
            ctx = self.compressor.compress(prompt, query_vec, rag_chunks)
            compressed_ctx = ctx.text
            breakdown["compressor"] = ctx.latency_ms
            self.metrics.record_compressor(ctx.latency_ms, ctx.selected_chunk_count)

        full_prompt = prompt
        if compressed_ctx:
            full_prompt = f"Context:\n{compressed_ctx}\n\nQuestion: {prompt}"
        return route, full_prompt

    # -- buffered path ------------------------------------------------------------

    async def run(
        self,
        prompt: str,
        rag_chunks: list[RagChunk] | None = None,
        *,
        skip_cache: bool = False,
        model_version: str = "v1",
    ) -> PipelineResult:
        t_start = time.perf_counter()
        breakdown: dict[str, float] = {}

        query_vec, cache_result = self._embed_and_lookup(
            prompt, skip_cache=skip_cache, model_version=model_version, breakdown=breakdown
        )

        if cache_result and cache_result.hit and cache_result.response is not None:
            total_ms = (time.perf_counter() - t_start) * 1000
            self.metrics.record_semantic_total(total_ms)
            return PipelineResult(
                response=cache_result.response,
                cache_hit=True,
                model_id="cache",
                semantic_latency_ms=total_ms,
                breakdown_ms=breakdown,
                cache_similarity=cache_result.similarity,
            )

        route, full_prompt = self._route_and_build_prompt(
            prompt, query_vec, rag_chunks, breakdown
        )

        t_llm = time.perf_counter()
        response = await self.llm.generate(route.model_id, full_prompt)
        breakdown["llm"] = (time.perf_counter() - t_llm) * 1000

        if not skip_cache:
            self._schedule_write_back(prompt, response, query_vec, model_version=model_version)

        total_ms = (time.perf_counter() - t_start) * 1000 - breakdown["llm"]
        self.metrics.record_semantic_total(total_ms)
        self.metrics.set_threshold(self.cache.threshold)

        return PipelineResult(
            response=response,
            cache_hit=False,
            model_id=route.model_id,
            semantic_latency_ms=total_ms,
            breakdown_ms=breakdown,
            cache_similarity=cache_result.similarity if cache_result else 0.0,
        )

    # -- streaming path -----------------------------------------------------------

    async def run_stream(
        self,
        prompt: str,
        rag_chunks: list[RagChunk] | None = None,
        *,
        skip_cache: bool = False,
        model_version: str = "v1",
    ) -> AsyncIterator[dict]:
        """Yield ``{"type": "token"}`` events as the LLM produces them, then a
        final ``{"type": "done", ...}`` event carrying the full metadata.

        On a cache hit the cached text is emitted as a single token so the
        client sees identical event framing.
        """
        t_start = time.perf_counter()
        breakdown: dict[str, float] = {}

        query_vec, cache_result = self._embed_and_lookup(
            prompt, skip_cache=skip_cache, model_version=model_version, breakdown=breakdown
        )

        if cache_result and cache_result.hit and cache_result.response is not None:
            total_ms = (time.perf_counter() - t_start) * 1000
            self.metrics.record_semantic_total(total_ms)
            yield {"type": "token", "content": cache_result.response}
            yield {
                "type": "done",
                "response": cache_result.response,
                "cache_hit": True,
                "model_id": "cache",
                "semantic_latency_ms": total_ms,
                "breakdown_ms": breakdown,
                "cache_similarity": cache_result.similarity,
            }
            return

        route, full_prompt = self._route_and_build_prompt(
            prompt, query_vec, rag_chunks, breakdown
        )

        t_llm = time.perf_counter()
        pieces: list[str] = []
        async for token in self._stream_llm(route.model_id, full_prompt):
            pieces.append(token)
            yield {"type": "token", "content": token}
        response = "".join(pieces)
        breakdown["llm"] = (time.perf_counter() - t_llm) * 1000

        if not skip_cache:
            self._schedule_write_back(prompt, response, query_vec, model_version=model_version)

        total_ms = (time.perf_counter() - t_start) * 1000 - breakdown["llm"]
        self.metrics.record_semantic_total(total_ms)
        self.metrics.set_threshold(self.cache.threshold)

        yield {
            "type": "done",
            "response": response,
            "cache_hit": False,
            "model_id": route.model_id,
            "semantic_latency_ms": total_ms,
            "breakdown_ms": breakdown,
            "cache_similarity": cache_result.similarity if cache_result else 0.0,
        }

    async def _stream_llm(self, model_id: str, prompt: str) -> AsyncIterator[str]:
        if isinstance(self.llm, StreamingLLMBackend):
            async for token in self.llm.generate_stream(model_id, prompt):
                yield token
        else:  # backend without streaming support: emit the whole response once
            yield await self.llm.generate(model_id, prompt)

    # -- write-back / feedback ----------------------------------------------------

    def _schedule_write_back(
        self,
        prompt: str,
        response: str,
        embedding: FloatVector,
        *,
        model_version: str,
    ) -> None:
        # Negative-cache guard: never persist empty/errored responses.
        if not response or not response.strip():
            return
        # Retain a strong reference so the task is not garbage-collected before
        # it runs (CPython keeps only a weak ref to bare create_task() results).
        task = asyncio.create_task(
            self._write_back(prompt, response, embedding, model_version=model_version)
        )
        self._pending_writes.add(task)
        task.add_done_callback(self._pending_writes.discard)

    def record_feedback(self, similarity: float, accepted: bool) -> None:
        """Record real user feedback for threshold auto-tuning.

        Only genuine accept/reject signals feed the tuner — cache hits are *not*
        auto-recorded as accepted, which previously biased the false-positive
        estimate toward zero and drove the threshold down over time.
        """
        if self.tuner:
            self.tuner.record(similarity, accepted)
        if not accepted:
            self.metrics.record_false_positive()

    async def _write_back(
        self,
        prompt: str,
        response: str,
        embedding: FloatVector,
        *,
        model_version: str,
    ) -> None:
        try:
            await asyncio.to_thread(
                self.cache.store,
                prompt,
                response,
                embedding,
                model_version=model_version,
            )
        except Exception:
            logger.exception("Cache write-back failed")

    def shutdown(self) -> None:
        if self.tuner:
            self.tuner.stop()
        save = getattr(self.cache, "save", None)
        if callable(save):
            try:
                save()
            except Exception:
                logger.exception("Cache persist on shutdown failed")


class OllamaBackend:
    """Example Ollama REST backend using /api/generate (buffered + streaming)."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self.base_url = (base_url or CONFIG.ollama_base_url).rstrip("/")
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else CONFIG.ollama_timeout_seconds
        )

    async def generate(self, model_id: str, prompt: str) -> str:
        import httpx

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": model_id, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("response", ""))

    async def generate_stream(self, model_id: str, prompt: str) -> AsyncIterator[str]:
        import json

        import httpx

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={"model": model_id, "prompt": prompt, "stream": True},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    data = json.loads(line)
                    token = str(data.get("response", ""))
                    if token:
                        yield token
                    if data.get("done"):
                        break
