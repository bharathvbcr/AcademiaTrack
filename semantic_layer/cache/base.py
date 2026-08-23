"""Semantic cache protocol, shared entry types, and common gating logic."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

import numpy as np

from semantic_layer.config import CONFIG
from semantic_layer.vectortypes import FloatVector

logger = logging.getLogger(__name__)


def prepare_vector(vec: Any, dim: int | None = None, *, what: str = "embedding") -> FloatVector:
    """Validate and L2-normalize a vector so inner product really is cosine.

    Both backends index with inner product and compare the result against a
    similarity threshold in [0, 1]. That is only cosine if the vectors are unit
    length, and nothing used to enforce it: storing a vector of norm 10 and
    querying with it returned a self-similarity of 100.0, which clears every
    threshold. Small-norm vectors fail every threshold for the same reason.

    Normalizing here is idempotent for callers that already normalize, so it
    changes no correct caller's behaviour. Non-finite and zero vectors are
    rejected rather than normalized: NaN previously reached the index and came
    back as a -3.4e38 similarity sentinel, and a zero vector has no direction
    to compare against.
    """
    arr = np.asarray(vec, dtype=np.float32).reshape(-1)
    if dim is not None and arr.shape[0] != dim:
        raise ValueError(
            f"{what} dim {arr.shape[0]} != expected {dim} "
            f"(embedding_model changed without rebuilding the cache?)"
        )
    if not np.all(np.isfinite(arr)):
        raise ValueError(f"{what} contains NaN or infinity")
    norm = float(np.linalg.norm(arr))
    if norm == 0.0:
        raise ValueError(f"{what} is the zero vector and has no direction")
    if abs(norm - 1.0) < 1e-6:
        return arr
    return (arr / norm).astype(np.float32)


@dataclass
class CacheEntry:
    entry_id: str
    prompt_hash: str
    prompt_text: str
    response_text: str
    embedding: FloatVector
    model_version: str
    template_hash: str
    created_at: float = field(default_factory=time.time)
    last_accessed_at: float = field(default_factory=time.time)
    access_count: int = 0
    ttl_seconds: int = CONFIG.cache_ttl_seconds
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.created_at) > self.ttl_seconds

    def touch(self) -> None:
        self.last_accessed_at = time.time()
        self.access_count += 1


@dataclass(frozen=True)
class CacheLookupResult:
    hit: bool
    response: str | None
    similarity: float
    margin: float
    latency_ms: float
    entry_id: str | None = None
    reason: str = ""


@dataclass(frozen=True)
class Candidate:
    """A live cache neighbour surviving OOD/TTL/model-version filtering."""

    similarity: float
    response: str
    entry_id: str


@runtime_checkable
class SemanticCache(Protocol):
    threshold: float
    margin: float

    def lookup(
        self,
        query_embedding: FloatVector,
        *,
        top_k: int = 5,
        model_version: str | None = None,
    ) -> CacheLookupResult: ...

    def store(
        self,
        prompt_text: str,
        response_text: str,
        embedding: FloatVector,
        *,
        model_version: str = "v1",
        template_hash: str = "default",
        ttl_seconds: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str: ...

    def update_threshold(self, new_threshold: float) -> None: ...

    def delete_by_model_version(self, model_version: str) -> None: ...


class BaseSemanticCache:
    """
    Shared threshold/margin gating and clamp logic for cache backends.

    Backends assemble a descending-sorted list of :class:`Candidate` neighbours
    (already filtered for OOD, expiry, and model-version) and delegate the
    accept/reject decision here so FAISS and Chroma stay behaviourally identical.
    """

    def __init__(self, threshold: float | None = None, margin: float | None = None) -> None:
        self.threshold = threshold if threshold is not None else CONFIG.similarity_threshold
        self.margin = margin if margin is not None else CONFIG.similarity_margin

    def update_threshold(self, new_threshold: float) -> None:
        clamped = max(CONFIG.threshold_floor, min(CONFIG.threshold_ceiling, new_threshold))
        self.threshold = clamped
        logger.info("Cache threshold updated to %.4f", clamped)

    def _evaluate(
        self,
        candidates: list[Candidate],
        latency_ms: float,
        *,
        top_similarity: float = 0.0,
    ) -> CacheLookupResult:
        """Apply threshold + margin gating to sorted candidates."""
        if not candidates:
            return CacheLookupResult(
                hit=False,
                response=None,
                similarity=top_similarity,
                margin=0.0,
                latency_ms=latency_ms,
                reason="no_valid_entries",
            )

        best = candidates[0]
        sim2 = candidates[1].similarity if len(candidates) > 1 else 0.0
        margin = best.similarity - sim2

        if best.similarity < self.threshold:
            return CacheLookupResult(
                hit=False,
                response=None,
                similarity=best.similarity,
                margin=margin,
                latency_ms=latency_ms,
                reason=f"below_threshold({best.similarity:.3f}<{self.threshold})",
            )
        if margin < self.margin:
            return CacheLookupResult(
                hit=False,
                response=None,
                similarity=best.similarity,
                margin=margin,
                latency_ms=latency_ms,
                reason=f"ambiguous_margin({margin:.3f}<{self.margin})",
            )

        return CacheLookupResult(
            hit=True,
            response=best.response,
            similarity=best.similarity,
            margin=margin,
            latency_ms=latency_ms,
            entry_id=best.entry_id,
            reason="hit",
        )
