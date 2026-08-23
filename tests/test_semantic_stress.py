"""Adversarial and concurrency tests for the semantic cache.

Every test here failed, hung, or returned a wrong answer against the code as it
stood before the hardening pass, or guards an invariant that nothing else
checked. The organising rule is the one the layer is supposed to keep: a cache
may miss, but it must never return a confidently wrong answer, and it must
never report an unmeasured value in the same shape as a measured one.
"""

from __future__ import annotations

import concurrent.futures
import os
import pickle
import threading

import numpy as np
import pytest

from semantic_layer.cache.base import prepare_vector
from semantic_layer.cache.faiss_cache import FaissSemanticCache

DIM = 16


def unit(seed: int, dim: int = DIM) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.standard_normal(dim).astype(np.float32)
    return (v / np.linalg.norm(v)).astype(np.float32)


def cache(**kw) -> FaissSemanticCache:
    kw.setdefault("dim", DIM)
    kw.setdefault("threshold", 0.85)
    kw.setdefault("margin", 0.0)
    return FaissSemanticCache(**kw)


# --------------------------------------------------------------- vector input


class TestVectorValidation:
    """Cosine similarity is only cosine on unit vectors; enforce that at the door."""

    def test_unnormalized_vector_cannot_exceed_unit_self_similarity(self) -> None:
        c = cache()
        big = np.zeros(DIM, dtype=np.float32)
        big[0] = 10.0
        c.store("p", "r", big)
        result = c.lookup(big)
        assert result.similarity <= 1.0 + 1e-5, (
            f"self-similarity {result.similarity} exceeds 1.0; the threshold "
            "comparison is meaningless when vectors are not normalized"
        )
        assert result.hit

    def test_tiny_norm_vector_still_matches_itself(self) -> None:
        """Symmetric failure: without normalization a small vector never hits."""
        c = cache()
        small = np.zeros(DIM, dtype=np.float32)
        small[0] = 1e-3
        c.store("p", "r", small)
        assert c.lookup(small).hit

    @pytest.mark.parametrize(
        "bad",
        [
            np.array([np.nan] + [0.0] * (DIM - 1), dtype=np.float32),
            np.array([np.inf] + [0.0] * (DIM - 1), dtype=np.float32),
            np.array([-np.inf] + [0.0] * (DIM - 1), dtype=np.float32),
            np.zeros(DIM, dtype=np.float32),
        ],
        ids=["nan", "inf", "-inf", "zero"],
    )
    def test_degenerate_vectors_are_rejected_on_store(self, bad) -> None:
        with pytest.raises(ValueError):
            cache().store("p", "r", bad)

    @pytest.mark.parametrize(
        "bad",
        [
            np.array([np.nan] + [0.0] * (DIM - 1), dtype=np.float32),
            np.zeros(DIM, dtype=np.float32),
        ],
        ids=["nan", "zero"],
    )
    def test_degenerate_vectors_are_rejected_on_lookup(self, bad) -> None:
        c = cache()
        c.store("p", "r", unit(1))
        with pytest.raises(ValueError):
            c.lookup(bad)

    def test_nan_never_reaches_the_index(self) -> None:
        """A stored NaN used to come back as a -3.4e38 similarity sentinel."""
        c = cache()
        with pytest.raises(ValueError):
            c.store("bad", "r", np.array([np.nan] + [0.0] * (DIM - 1), dtype=np.float32))
        c.store("good", "r", unit(1))
        assert c.lookup(unit(1)).similarity <= 1.0 + 1e-5

    def test_wrong_dimension_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="dim"):
            cache().store("p", "r", unit(1, dim=DIM + 1))

    def test_prepare_vector_is_idempotent(self) -> None:
        v = unit(7)
        assert np.allclose(prepare_vector(v, DIM), prepare_vector(prepare_vector(v, DIM), DIM))

    def test_list_input_is_accepted(self) -> None:
        """Callers crossing a JSON boundary hand over lists, not arrays."""
        c = cache()
        c.store("p", "r", unit(3).tolist())
        assert c.lookup(unit(3).tolist()).hit


# ------------------------------------------------------------ gating contract


class TestGating:
    def test_below_threshold_is_a_miss_not_a_hit(self) -> None:
        c = cache(threshold=0.99)
        c.store("a", "response-a", unit(1))
        r = c.lookup(unit(2))
        assert not r.hit
        assert "below_threshold" in r.reason

    def test_ambiguous_neighbours_refuse_rather_than_guess(self) -> None:
        """Two near-identical neighbours must not be resolved by coin flip."""
        c = cache(threshold=0.5, margin=0.2)
        base = unit(1)
        near = (base + 1e-4 * unit(2)).astype(np.float32)
        c.store("a", "response-a", base)
        c.store("b", "response-b", near)
        r = c.lookup(base)
        assert not r.hit
        assert "ambiguous_margin" in r.reason

    def test_model_version_scoping_excludes_other_versions(self) -> None:
        c = cache(threshold=0.5)
        c.store("a", "v1-answer", unit(1), model_version="v1")
        r = c.lookup(unit(1), model_version="v2")
        assert not r.hit, "a v1 answer must never be served to a v2 query"

    def test_expired_entry_is_never_served(self) -> None:
        c = cache(threshold=0.5)
        c.store("a", "stale", unit(1), ttl_seconds=0)
        assert not c.lookup(unit(1)).hit

    def test_empty_cache_reports_empty_not_zero_similarity_hit(self) -> None:
        r = cache().lookup(unit(1))
        assert not r.hit
        assert r.reason == "empty_cache"


# ----------------------------------------------------------------- durability


class TestPersistence:
    def test_roundtrip_preserves_answers(self, tmp_path) -> None:
        p = str(tmp_path / "c")
        a = cache(threshold=0.5, persist_path=p)
        for i in range(5):
            a.store(f"p{i}", f"r{i}", unit(i))
        a.save()

        b = cache(threshold=0.5, persist_path=p)
        b._ensure_index()
        r = b.lookup(unit(3))
        assert r.hit and r.response == "r3"

    def test_missing_metadata_fails_closed(self, tmp_path) -> None:
        """Index without metadata is an unmappable pair; serve nothing."""
        p = str(tmp_path / "c")
        a = cache(threshold=0.5, persist_path=p)
        a.store("p", "r", unit(1))
        a.save()
        os.remove(f"{p}.meta")

        b = cache(threshold=0.5, persist_path=p)
        b._ensure_index()
        assert b._index.ntotal == len(b._id_order) == 0
        assert not b.lookup(unit(1)).hit

    def test_truncated_metadata_fails_closed(self, tmp_path) -> None:
        """A metadata file naming fewer ids than the index has rows must not load."""
        p = str(tmp_path / "c")
        a = cache(threshold=0.5, persist_path=p)
        for i in range(4):
            a.store(f"p{i}", f"r{i}", unit(i))
        a.save()

        with open(f"{p}.meta", "rb") as fh:
            meta = pickle.load(fh)
        meta["id_order"] = meta["id_order"][:2]  # simulate a torn write
        with open(f"{p}.meta", "wb") as fh:
            pickle.dump(meta, fh)

        b = cache(threshold=0.5, persist_path=p)
        b._ensure_index()
        assert b._index.ntotal == 0, "an index/metadata disagreement must not load"

    def test_dimension_change_fails_closed(self, tmp_path) -> None:
        """Swapping the embedding model must not silently reuse the old index."""
        p = str(tmp_path / "c")
        a = FaissSemanticCache(dim=DIM, threshold=0.5, persist_path=p)
        a.store("p", "r", unit(1))
        a.save()

        b = FaissSemanticCache(dim=DIM * 2, threshold=0.5, persist_path=p)
        b._ensure_index()
        assert b._index.d == DIM * 2
        assert b._index.ntotal == 0

    def test_metadata_cannot_execute_arbitrary_code(self, tmp_path) -> None:
        """The .meta file is user-writable state; loading it must not import at will."""
        p = str(tmp_path / "c")
        a = cache(threshold=0.5, persist_path=p)
        a.store("p", "r", unit(1))
        a.save()

        class Evil:
            def __reduce__(self):
                return (os.system, ("echo pwned",))

        with open(f"{p}.meta", "wb") as fh:
            pickle.dump({"format": 2, "dim": DIM, "id_order": [], "entries": Evil()}, fh)

        b = cache(threshold=0.5, persist_path=p)
        b._ensure_index()
        assert b._index.ntotal == 0, "a refused payload must leave an empty cache"

    def test_save_is_atomic_under_interruption(self, tmp_path) -> None:
        """A crash during save must leave the previous good pair readable."""
        p = str(tmp_path / "c")
        a = cache(threshold=0.5, persist_path=p)
        a.store("p0", "r0", unit(0))
        a.save()

        b = cache(threshold=0.5, persist_path=p)
        b._ensure_index()
        b.store("p1", "r1", unit(1))
        import faiss

        original = faiss.write_index

        def boom(*args, **kwargs):
            original(*args, **kwargs)
            raise OSError("disk full")

        faiss.write_index = boom
        try:
            with pytest.raises(OSError):
                b.save()
        finally:
            faiss.write_index = original

        c2 = cache(threshold=0.5, persist_path=p)
        c2._ensure_index()
        assert c2.lookup(unit(0)).response == "r0", "the previous good save was lost"


# ---------------------------------------------------------------- concurrency


class TestConcurrency:
    def test_concurrent_store_and_lookup_never_misresolves(self) -> None:
        """The index→id_order mapping must stay consistent under contention.

        A lookup that resolved a FAISS row against an _id_order a concurrent
        rebuild had already replaced would return another entry's answer under
        a high similarity score.
        """
        c = cache(threshold=0.99, margin=0.0, max_entries=200)
        errors: list[BaseException] = []
        wrong: list[str] = []
        stop = threading.Event()

        for i in range(50):
            c.store(f"seed-{i}", f"seed-response-{i}", unit(i))

        def writer() -> None:
            try:
                for i in range(50, 400):
                    if stop.is_set():
                        return
                    c.store(f"w-{i}", f"w-response-{i}", unit(i))
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        def reader() -> None:
            try:
                for _ in range(400):
                    if stop.is_set():
                        return
                    idx = 7
                    r = c.lookup(unit(idx))
                    if r.hit and r.response not in (
                        f"seed-response-{idx}",
                        f"w-response-{idx}",
                    ):
                        wrong.append(r.response or "")
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(writer) for _ in range(3)]
            futures += [pool.submit(reader) for _ in range(5)]
            for f in futures:
                f.result(timeout=120)
        stop.set()

        assert not errors, f"concurrent access raised: {errors[:3]}"
        assert not wrong, f"lookup returned another entry's answer: {wrong[:3]}"

    def test_concurrent_eviction_does_not_corrupt_the_index(self) -> None:
        """Eviction rebuilds the index; readers must not observe a torn state."""
        c = cache(threshold=0.5, margin=0.0, max_entries=30)
        errors: list[BaseException] = []

        def churn(worker: int) -> None:
            try:
                for i in range(200):
                    c.store(f"k-{worker}-{i}", f"v-{worker}-{i}", unit(i % 60))
                    c.lookup(unit(i % 60))
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            for f in [pool.submit(churn, w) for w in range(6)]:
                f.result(timeout=120)

        assert not errors, f"eviction under contention raised: {errors[:3]}"
        assert len(c._entries) <= c.max_entries
        assert c._index.ntotal == len(c._id_order), "index and id_order disagree"

    def test_delete_by_model_version_under_readers(self) -> None:
        c = cache(threshold=0.5, margin=0.0)
        for i in range(100):
            c.store(f"p{i}", f"r{i}", unit(i), model_version="v1" if i % 2 else "v2")
        errors: list[BaseException] = []

        def deleter() -> None:
            try:
                c.delete_by_model_version("v1")
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        def reader() -> None:
            try:
                for i in range(300):
                    c.lookup(unit(i % 100))
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for f in [pool.submit(deleter), *[pool.submit(reader) for _ in range(3)]]:
                f.result(timeout=120)

        assert not errors, f"delete under readers raised: {errors[:3]}"
        assert all(e.model_version != "v1" for e in c._entries.values())


# ---------------------------------------------------------------- scale/limits


class TestScale:
    def test_eviction_holds_the_capacity_bound(self) -> None:
        c = cache(threshold=0.5, max_entries=50)
        for i in range(500):
            c.store(f"p{i}", f"r{i}", unit(i % 120))
        assert len(c._entries) <= 50

    def test_tombstone_rebuild_keeps_mapping_consistent(self) -> None:
        c = cache(threshold=0.5, max_entries=20)
        for i in range(300):
            c.store(f"p{i}", f"r{i}", unit(i % 50))
        assert c._index.ntotal == len(c._id_order)
        live = {eid for eid in c._id_order if eid in c._entries}
        assert live, "rebuild dropped every live entry"

    def test_top_k_larger_than_cache_is_safe(self) -> None:
        c = cache(threshold=0.5)
        c.store("only", "answer", unit(1))
        assert c.lookup(unit(1), top_k=100).hit

    def test_answers_stay_correct_across_a_thousand_entries(self) -> None:
        c = cache(threshold=0.99, margin=0.0, max_entries=5000)
        for i in range(1000):
            c.store(f"p{i}", f"r{i}", unit(i))
        for probe in (0, 1, 250, 500, 999):
            r = c.lookup(unit(probe))
            assert r.hit and r.response == f"r{probe}", (
                f"probe {probe} resolved to {r.response!r}"
            )
