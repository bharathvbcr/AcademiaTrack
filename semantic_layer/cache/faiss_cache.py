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

from semantic_layer.cache.base import (
    BaseSemanticCache,
    CacheEntry,
    CacheLookupResult,
    Candidate,
    prepare_vector,
)
from semantic_layer.config import CONFIG
from semantic_layer.vectortypes import FloatVector

logger = logging.getLogger(__name__)


# Persistence format version. Bump when the .meta payload shape changes so an
# older file is refused rather than silently misread.
_PERSIST_FORMAT = 2

_PICKLE_ALLOWED = {
    ("numpy", "ndarray"),
    ("numpy", "dtype"),
    ("numpy", "_frombuffer"),
    ("numpy.core.numeric", "_frombuffer"),
    ("numpy._core.numeric", "_frombuffer"),
    ("numpy.core.multiarray", "_reconstruct"),
    ("numpy._core.multiarray", "_reconstruct"),
    ("numpy.core.multiarray", "scalar"),
    ("numpy._core.multiarray", "scalar"),
    ("semantic_layer.cache.base", "CacheEntry"),
}


class _RestrictedUnpickler(pickle.Unpickler):
    """Unpickler that refuses anything the cache does not legitimately store.

    The .meta file is read back from disk with pickle, which will import and
    call whatever the file names. A cache directory is ordinary user-writable
    state, so anything able to write there could previously execute code inside
    this process. Only the numpy array machinery and CacheEntry are needed.
    """

    def find_class(self, module: str, name: str):  # noqa: D102
        if (module, name) in _PICKLE_ALLOWED:
            return super().find_class(module, name)
        raise pickle.UnpicklingError(
            f"refusing to unpickle {module}.{name} from the semantic cache metadata"
        )



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
        """Used for OOD gating; the dot product below is only cosine if unit length."""
        self._domain_centroid = prepare_vector(centroid, self.dim, what="domain centroid")

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
        query_embedding = prepare_vector(query_embedding, self.dim, what="query embedding")

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
        vec = prepare_vector(embedding, self.dim, what="embedding")

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
            ttl_seconds=(CONFIG.cache_ttl_seconds if ttl_seconds is None else ttl_seconds),
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
        """Persist the index + entries so the warm cache survives a restart.

        Both files are written to temporaries and renamed, so a crash mid-write
        leaves the previous pair intact instead of a half-written one. The two
        renames still are not one atomic step, so the metadata records the row
        count and dimension and load() refuses a pair that disagrees.
        """
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
            tmp_index = f"{target}.index.tmp"
            tmp_meta = f"{target}.meta.tmp"
            faiss.write_index(self._index, tmp_index)
            payload = {
                "format": _PERSIST_FORMAT,
                "dim": int(self.dim),
                "ntotal": int(self._index.ntotal),
                "id_order": self._id_order,
                "entries": self._entries,
            }
            with open(tmp_meta, "wb") as fh:
                pickle.dump(payload, fh, protocol=pickle.HIGHEST_PROTOCOL)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp_index, f"{target}.index")
            os.replace(tmp_meta, f"{target}.meta")
        logger.info("Persisted FAISS cache to %s", target)

    def load(self, path: str | None = None) -> None:
        """Restore a previously persisted index + entries, or refuse and stay empty.

        A cache that loads an inconsistent pair is worse than a cold one: the
        FAISS row at position i and ``_id_order[i]`` would name different
        entries, so a lookup returns a confidently wrong answer under a high
        similarity score. Every disagreement below therefore fails closed --
        the cache starts empty and says why -- rather than serving one.
        """
        target = path or self.persist_path
        if not target or not os.path.exists(f"{target}.index"):
            return
        try:
            import faiss
        except ImportError as exc:
            raise RuntimeError("pip install faiss-cpu") from exc

        with self._lock:
            def _start_empty(reason: str) -> None:
                logger.error(
                    "Refusing to load semantic cache from %s: %s. Starting empty.",
                    target,
                    reason,
                )
                self._index = faiss.IndexFlatIP(self.dim)
                self._id_order = []
                self._entries = {}
                self._tombstones.clear()
                self._ready = True

            try:
                index = faiss.read_index(f"{target}.index")
            except Exception as exc:  # unreadable or corrupt index file
                _start_empty(f"index unreadable ({type(exc).__name__}: {exc})")
                return

            if index.d != self.dim:
                _start_empty(
                    f"persisted dim {index.d} != configured dim {self.dim} "
                    f"(embedding model changed?)"
                )
                return

            meta_path = f"{target}.meta"
            if not os.path.exists(meta_path):
                _start_empty("metadata file missing (torn write?)")
                return

            try:
                with open(meta_path, "rb") as fh:
                    meta = _RestrictedUnpickler(fh).load()
            except Exception as exc:
                _start_empty(f"metadata unreadable ({type(exc).__name__}: {exc})")
                return

            if not isinstance(meta, dict) or meta.get("format") != _PERSIST_FORMAT:
                _start_empty(
                    f"metadata format {meta.get('format') if isinstance(meta, dict) else '?'} "
                    f"!= supported {_PERSIST_FORMAT}"
                )
                return

            id_order = list(meta.get("id_order", []))
            entries = dict(meta.get("entries", {}))

            if meta.get("dim") != self.dim:
                _start_empty(f"metadata dim {meta.get('dim')} != configured dim {self.dim}")
                return
            if len(id_order) != index.ntotal:
                _start_empty(
                    f"index holds {index.ntotal} rows but metadata names "
                    f"{len(id_order)} ids (torn write?)"
                )
                return
            missing = [eid for eid in id_order if eid not in entries]
            if missing:
                _start_empty(f"{len(missing)} ids in the index have no entry record")
                return

            self._index = index
            self._id_order = id_order
            self._entries = entries
            self._tombstones.clear()
            self._ready = True
        logger.info("Loaded FAISS cache from %s (%d entries)", target, len(self._entries))
