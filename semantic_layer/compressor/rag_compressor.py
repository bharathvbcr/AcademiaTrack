"""Filter and rank RAG chunks by semantic relevance before LLM context injection."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from semantic_layer.config import CONFIG
from semantic_layer.embeddings import EmbeddingService, FloatMatrix, FloatVector

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CompressedContext:
    text: str
    selected_chunk_count: int
    total_chunk_count: int
    estimated_tokens: int
    latency_ms: float
    chunk_scores: list[float]


@dataclass
class RagChunk:
    chunk_id: str
    text: str
    source: str = ""


class RagSemanticCompressor:
    """
    Semantic chunk selection pipeline:
    1. Embed query (provided) + all chunks (batched)
    2. Score by cosine similarity
    3. MMR diversification to reduce redundancy
    4. Truncate to token budget
    """

    def __init__(
        self,
        embedder: EmbeddingService | None = None,
        min_relevance: float | None = None,
        max_chunks: int | None = None,
        max_tokens: int | None = None,
        *,
        mmr_lambda: float | None = None,
    ) -> None:
        self.embedder = embedder or EmbeddingService()
        self.min_relevance = (
            min_relevance if min_relevance is not None else CONFIG.min_chunk_relevance
        )
        self.max_chunks = max_chunks if max_chunks is not None else CONFIG.max_rag_chunks
        self.max_tokens = (
            max_tokens if max_tokens is not None else CONFIG.max_context_tokens
        )
        self.mmr_lambda = mmr_lambda if mmr_lambda is not None else CONFIG.mmr_lambda

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        return max(1, len(text) // 4)

    def _mmr_select(
        self,
        query_vec: FloatVector,
        chunk_vectors: FloatMatrix,
        chunk_texts: list[str],
    ) -> list[int]:
        """Maximal Marginal Relevance selection."""
        n = len(chunk_texts)
        if n == 0:
            return []

        relevance = chunk_vectors @ query_vec
        selected: list[int] = []
        candidates = set(range(n))

        while len(selected) < self.max_chunks and candidates:
            best_idx = -1
            best_score = -float("inf")

            for idx in candidates:
                if relevance[idx] < self.min_relevance:
                    continue

                redundancy = 0.0
                if selected:
                    redundancy = max(
                        float(chunk_vectors[idx] @ chunk_vectors[s]) for s in selected
                    )

                mmr = (
                    self.mmr_lambda * float(relevance[idx])
                    - (1 - self.mmr_lambda) * redundancy
                )
                if mmr > best_score:
                    best_score = mmr
                    best_idx = idx

            if best_idx < 0:
                break

            selected.append(best_idx)
            candidates.remove(best_idx)

        return selected

    def compress(
        self,
        query: str,
        query_embedding: FloatVector,
        chunks: list[RagChunk],
    ) -> CompressedContext:
        del query  # query text is not re-embedded; caller provides embedding
        t0 = time.perf_counter()

        if not chunks:
            return CompressedContext(
                text="",
                selected_chunk_count=0,
                total_chunk_count=0,
                estimated_tokens=0,
                latency_ms=(time.perf_counter() - t0) * 1000,
                chunk_scores=[],
            )

        chunk_texts = [chunk.text for chunk in chunks]
        embed_result = self.embedder.encode(chunk_texts)
        chunk_vectors = embed_result.vectors

        selected_indices = self._mmr_select(query_embedding, chunk_vectors, chunk_texts)

        packed_texts: list[str] = []
        scores: list[float] = []
        token_budget = self.max_tokens

        for idx in selected_indices:
            chunk = chunks[idx]
            chunk_tokens = self._estimate_tokens(chunk.text)
            if chunk_tokens > token_budget:
                continue
            source_prefix = f"[{chunk.source}] " if chunk.source else ""
            packed_texts.append(f"{source_prefix}{chunk.text}")
            scores.append(float(chunk_vectors[idx] @ query_embedding))
            token_budget -= chunk_tokens

        compressed = "\n\n".join(packed_texts)
        latency_ms = (time.perf_counter() - t0) * 1000

        return CompressedContext(
            text=compressed,
            selected_chunk_count=len(packed_texts),
            total_chunk_count=len(chunks),
            estimated_tokens=self._estimate_tokens(compressed),
            latency_ms=latency_ms,
            chunk_scores=scores,
        )
