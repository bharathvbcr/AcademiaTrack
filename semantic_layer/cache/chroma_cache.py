"""Persistent semantic cache with rich metadata filtering via ChromaDB."""

from __future__ import annotations

import hashlib
import logging
import threading
import time
import uuid
from typing import Any

from semantic_layer.cache.base import BaseSemanticCache, CacheLookupResult, Candidate
from semantic_layer.config import CONFIG
from semantic_layer.vectortypes import FloatVector

logger = logging.getLogger(__name__)


class ChromaSemanticCache(BaseSemanticCache):
    """
    ChromaDB-backed cache for persistence across restarts.

    Trade-off: ~5–15 ms lookup vs FAISS ~1–3 ms.
    Use when durability and metadata queries outweigh raw speed.

    Behaviour parity with FAISS: same threshold/margin gating (via the shared
    base), same ``model_version`` scoping, plus periodic eviction of expired rows
    so the persistent store does not grow unbounded.
    """

    COLLECTION_NAME = "semantic_cache"

    def __init__(
        self,
        persist_directory: str | None = None,
        threshold: float | None = None,
        margin: float | None = None,
    ) -> None:
        super().__init__(threshold=threshold, margin=margin)
        self._client = None
        self._collection = None
        self._persist_directory = persist_directory or CONFIG.chroma_persist_directory
        self._ready = False
        self._store_count = 0
        self._lock = threading.Lock()

    @property
    def is_ready(self) -> bool:
        return self._ready

    def _ensure_collection(self) -> None:
        if self._collection is not None:
            self._ready = True
            return
        try:
            import chromadb
        except ImportError as exc:
            raise RuntimeError("pip install chromadb") from exc

        self._client = chromadb.PersistentClient(path=self._persist_directory)
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        self._ready = True

    def lookup(
        self,
        query_embedding: FloatVector,
        *,
        top_k: int = 5,
        model_version: str | None = None,
    ) -> CacheLookupResult:
        t0 = time.perf_counter()
        self._ensure_collection()
        assert self._collection is not None

        where_filter: dict[str, Any] | None = None
        if model_version:
            where_filter = {"model_version": model_version}

        results = self._collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        latency_ms = (time.perf_counter() - t0) * 1000

        if not results["ids"] or not results["ids"][0]:
            return CacheLookupResult(
                hit=False,
                response=None,
                similarity=0.0,
                margin=0.0,
                latency_ms=latency_ms,
                reason="empty_cache",
            )

        distances = results["distances"][0]
        similarities = [1.0 - d for d in distances]

        now = time.time()
        candidates: list[Candidate] = []
        for sim, meta, doc, entry_id in zip(
            similarities,
            results["metadatas"][0],
            results["documents"][0],
            results["ids"][0],
        ):
            created_at = float(meta.get("created_at", 0))
            ttl = int(meta.get("ttl_seconds", CONFIG.cache_ttl_seconds))
            if (now - created_at) > ttl:
                continue
            candidates.append(
                Candidate(
                    similarity=sim,
                    response=str(meta.get("response_text", doc)),
                    entry_id=entry_id,
                )
            )

        # Chroma already returns descending similarity, but sort defensively so
        # gating matches the FAISS backend exactly.
        candidates.sort(key=lambda c: c.similarity, reverse=True)
        top_sim = similarities[0] if similarities else 0.0
        return self._evaluate(candidates, latency_ms, top_similarity=top_sim)

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
    ) -> str:
        self._ensure_collection()
        assert self._collection is not None

        entry_id = str(uuid.uuid4())
        prompt_hash = hashlib.sha256(prompt_text.encode()).hexdigest()[:16]
        meta = {
            "response_text": response_text,
            "model_version": model_version,
            "template_hash": template_hash,
            "prompt_hash": prompt_hash,
            "created_at": time.time(),
            "ttl_seconds": ttl_seconds or CONFIG.cache_ttl_seconds,
        }
        if metadata:
            meta.update({k: str(v) for k, v in metadata.items()})

        self._collection.add(
            ids=[entry_id],
            embeddings=[embedding.tolist()],
            documents=[prompt_text],
            metadatas=[meta],
        )
        self._maybe_evict()
        return entry_id

    def _maybe_evict(self) -> None:
        if CONFIG.chroma_evict_every <= 0:
            return
        with self._lock:
            self._store_count += 1
            due = self._store_count % CONFIG.chroma_evict_every == 0
        if due:
            self.evict_expired()

    def evict_expired(self) -> int:
        """Delete rows whose TTL has elapsed. Returns the number removed."""
        self._ensure_collection()
        assert self._collection is not None
        now = time.time()
        rows = self._collection.get(include=["metadatas"])
        expired_ids = [
            entry_id
            for entry_id, meta in zip(rows["ids"], rows["metadatas"])
            if (now - float(meta.get("created_at", 0)))
            > int(meta.get("ttl_seconds", CONFIG.cache_ttl_seconds))
        ]
        if expired_ids:
            self._collection.delete(ids=expired_ids)
            logger.info("Evicted %d expired Chroma entries", len(expired_ids))
        return len(expired_ids)

    def delete_by_model_version(self, model_version: str) -> None:
        """Invalidate entries for a specific model version."""
        self._ensure_collection()
        assert self._collection is not None
        self._collection.delete(where={"model_version": model_version})
