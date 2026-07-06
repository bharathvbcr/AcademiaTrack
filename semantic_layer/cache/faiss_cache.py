"""In-memory semantic cache using FAISS IndexFlatIP (cosine via normalized vectors)."""

from __future__ import annotations

import hashlib
import logging
import os
import pickle
import threading
import time
import uuid
from typing import Any

import numpy as np

from semantic_layer.cache.base import BaseSemanticCache, CacheEntry, CacheLookupResult, Candidate
from semantic_layer.config import CONFIG
from semantic_layer.vectortypes import FloatVector

logger = logging.getLogger(__name__)


class FaissSemanticCache(BaseSemanticCache):
    """
    FAISS IndexFlatIP over L2-normalized vectors.

    Latency target: 1–3 ms for 10k entries on modern CPU.
    Supports TTL eviction, LRU eviction, OOD gating, margin guard, model-version
    scoping, optional persistence, and periodic rebuild when the tombstone ratio
    exceeds the configured threshold.

    Thread-safety: the entire lookup (FAISS search *and* candidate resolution)
    runs under a single lock so a concurrent ``store``/rebuild can never
    invalidate the search-index → ``_id_order`` mapping mid-lookup.
    """

    def __init__(
        self,
        dim: int | None = None,
        max_entries: int | None = None,
        threshold: float | None = None,
        margin: float | None = None,
        *,
        persist_path: str | None = None,
    ) -> None:
        super().__init__(threshold=threshold, margin=margin)
        self.dim = dim if dim is not None else CONFIG.embedding_dim
        self.max_entries = max_entries or CONFIG.cache_max_entries
        self.persist_path = persist_path if persist_path is not None else CONFIG.faiss_persist_path

        self._entries: dict[str, CacheEntry] = {}
        self._id_order: list[str] = []
        self._tombstones: set[str] = set()
        self._lock = threading.RLock()
        self._index = None
        self._domain_centroid: FloatVector | None = None
        self._ready = False

    @property
    def is_ready(self) -> bool:
        return self._ready

    def _ensure_index(self) -> None:
        if self._index is not None:
            self._ready = True
            return
        try:
            import faiss
        except ImportError as exc:
            raise RuntimeError("pip install faiss-cpu") from exc

        if self.persist_path and os.path.exists(f"{self.persist_path}.index"):
            self.load()
        else:
            self._index = faiss.IndexFlatIP(self.dim)
        self._ready = True

    def set_domain_centroid(self, centroid: FloatVector) -> None:
        """Used for OOD gating."""
        norm = float(np.linalg.norm(centroid))
        self._domain_centroid = centroid / norm if norm > 0 else centroid.astype(np.float32)

    def _is_ood(self, query: FloatVector) -> bool:
        if self._domain_centroid is None:
            return False
        sim = float(np.dot(query, self._domain_centroid))
        return sim < CONFIG.ood_domain_threshold

    def lookup(
        self,
        query_embedding: FloatVector,
        *,
        top_k: int = 5,
        model_version: str | None = None,
    ) -> CacheLookupResult:
        t0 = time.perf_counter()

        # Everything (search + candidate resolution + touch) happens under the
        # lock. Releasing it between search and resolution allowed a concurrent
        # _rebuild_index() to reset _id_order, yielding IndexError or a
        # wrong-entry hit — the most dangerous cache failure mode.
        with self._lock:
            if self._index is None or self._index.ntotal == 0:
                return CacheLookupResult(
                    hit=False,
                    response=None,
                    similarity=0.0,
                    margin=0.0,
                    latency_ms=(time.perf_counter() - t0) * 1000,
                    reason="empty_cache",
                )

            if self._is_ood(query_embedding):
                return CacheLookupResult(
                    hit=False,
                    response=None,
                    similarity=0.0,
                    margin=0.0,
                    latency_ms=(time.perf_counter() - t0) * 1000,
                    reason="ood_query",
                )

            q = query_embedding.reshape(1, -1).astype(np.float32)
            k = min(top_k, self._index.ntotal)
            similarities, indices = self._index.search(q, k)

            sims = similarities[0]
            idxs = indices[0]

            candidates: list[Candidate] = []
            for sim, idx in zip(sims, idxs):
                if idx < 0 or idx >= len(self._id_order):
                    continue
                entry_id = self._id_order[idx]
                if entry_id in self._tombstones:
                    continue
                entry = self._entries.get(entry_id)
                if entry is None or entry.is_expired:
                    continue
                if model_version is not None and entry.model_version != model_version:
                    continue
                candidates.append(
                    Candidate(
                        similarity=float(sim),
                        response=entry.response_text,
                        entry_id=entry_id,
                    )
                )

            candidates.sort(key=lambda c: c.similarity, reverse=True)
            top_sim = float(sims[0]) if len(sims) else 0.0
            latency_ms = (time.perf_counter() - t0) * 1000
            result = self._evaluate(candidates, latency_ms, top_similarity=top_sim)

            if result.hit and result.entry_id is not None:
                self._entries[result.entry_id].touch()

            return result

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
        vec = np.asarray(embedding, dtype=np.float32).reshape(-1)
        if vec.shape[0] != self.dim:
            raise ValueError(
                f"embedding dim {vec.shape[0]} != index dim {self.dim} "
                f"(embedding_model changed without rebuilding the cache?)"
            )

        entry_id = str(uuid.uuid4())
        prompt_hash = hashlib.sha256(prompt_text.encode()).hexdigest()[:16]

        entry = CacheEntry(
            entry_id=entry_id,
            prompt_hash=prompt_hash,
            prompt_text=prompt_text,
            response_text=response_text,
            embedding=vec,
            model_version=model_version,
            template_hash=template_hash,
            ttl_seconds=ttl_seconds or CONFIG.cache_ttl_seconds,
            metadata=metadata or {},
        )

        with self._lock:
            self._ensure_index()
            assert self._index is not None

            self._index.add(entry.embedding.reshape(1, -1))
            self._id_order.append(entry_id)
            self._entries[entry_id] = entry
            self._evict_if_needed()
            self._maybe_rebuild_index()

        return entry_id

    def delete_by_model_version(self, model_version: str) -> None:
        """Invalidate every entry for a given model version (parity with Chroma)."""
        with self._lock:
            victims = [
                eid
                for eid, entry in self._entries.items()
                if entry.model_version == model_version
            ]
            for entry_id in victims:
                self._remove_entry(entry_id)
            self._maybe_rebuild_index()
        if victims:
            logger.info("Invalidated %d entries for model_version=%s", len(victims), model_version)

    def _evict_if_needed(self) -> None:
        expired_ids = [eid for eid, entry in self._entries.items() if entry.is_expired]
        for entry_id in expired_ids:
            self._remove_entry(entry_id)

        while len(self._entries) > self.max_entries:
            victim_id = min(
                self._entries.keys(),
                key=lambda eid: self._entries[eid].last_accessed_at,
            )
            self._remove_entry(victim_id)

    def _remove_entry(self, entry_id: str) -> None:
        """Mark tombstone; FAISS IndexFlatIP lacks efficient single-row delete."""
        if entry_id not in self._entries:
            return
        self._entries.pop(entry_id, None)
        self._tombstones.add(entry_id)

    def _maybe_rebuild_index(self) -> None:
        if not self._id_order:
            return
        tombstone_ratio = len(self._tombstones) / len(self._id_order)
        if tombstone_ratio < CONFIG.faiss_rebuild_tombstone_ratio:
            return
        self._rebuild_index()

    def _rebuild_index(self) -> None:
        try:
            import faiss
        except ImportError as exc:
            raise RuntimeError("pip install faiss-cpu") from exc

        live_entries = [
            (eid, self._entries[eid])
            for eid in self._id_order
            if eid in self._entries and eid not in self._tombstones
        ]
        self._index = faiss.IndexFlatIP(self.dim)
        self._id_order = []
        self._tombstones.clear()

        for entry_id, entry in live_entries:
            assert self._index is not None
            self._index.add(entry.embedding.reshape(1, -1))
            self._id_order.append(entry_id)

        logger.info("Rebuilt FAISS index with %d live entries", len(live_entries))

    def save(self, path: str | None = None) -> None:
        """Persist the index + entries so the warm cache survives a restart."""
        target = path or self.persist_path
        if not target:
            return
        try:
            import faiss
        except ImportError as exc:
            raise RuntimeError("pip install faiss-cpu") from exc

        with self._lock:
            self._rebuild_index()  # compact tombstones before persisting
            if self._index is None:
                return
            faiss.write_index(self._index, f"{target}.index")
            with open(f"{target}.meta", "wb") as fh:
                pickle.dump({"id_order": self._id_order, "entries": self._entries}, fh)
        logger.info("Persisted FAISS cache to %s", target)

    def load(self, path: str | None = None) -> None:
        """Restore a previously persisted index + entries."""
        target = path or self.persist_path
        if not target or not os.path.exists(f"{target}.index"):
            return
        try:
            import faiss
        except ImportError as exc:
            raise RuntimeError("pip install faiss-cpu") from exc

        with self._lock:
            self._index = faiss.read_index(f"{target}.index")
            meta_path = f"{target}.meta"
            if os.path.exists(meta_path):
                with open(meta_path, "rb") as fh:
                    meta = pickle.load(fh)
                self._id_order = list(meta.get("id_order", []))
                self._entries = dict(meta.get("entries", {}))
            self._tombstones.clear()
            self._ready = True
        logger.info("Loaded FAISS cache from %s (%d entries)", target, len(self._entries))
