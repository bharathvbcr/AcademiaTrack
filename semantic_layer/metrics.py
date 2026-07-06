"""Latency and hit-rate telemetry for the semantic layer."""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any

from semantic_layer.config import CONFIG


def _percentile(values: list[float], pct: float) -> float:
    """Nearest-rank percentile (pct in [0, 100]); 0.0 for an empty sample."""
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = max(0, min(len(ordered) - 1, int(round((pct / 100.0) * len(ordered) + 0.5)) - 1))
    return ordered[rank]


@dataclass
class SemanticMetricsSnapshot:
    cache_hits: int = 0
    cache_misses: int = 0
    cache_false_positives: int = 0
    embed_latency_ms_total: float = 0.0
    embed_latency_count: int = 0
    cache_lookup_ms_total: float = 0.0
    cache_lookup_count: int = 0
    router_latency_ms_total: float = 0.0
    router_latency_count: int = 0
    compressor_latency_ms_total: float = 0.0
    compressor_latency_count: int = 0
    semantic_total_ms_total: float = 0.0
    semantic_total_count: int = 0
    router_small_total: int = 0
    router_large_total: int = 0
    compressor_chunks_selected_total: int = 0
    current_threshold: float = CONFIG.similarity_threshold
    semantic_total_p95_ms: float = 0.0
    semantic_total_p99_ms: float = 0.0

    @property
    def cache_hit_rate(self) -> float:
        total = self.cache_hits + self.cache_misses
        return self.cache_hits / total if total else 0.0

    @property
    def meets_p95_slo(self) -> bool:
        return self.semantic_total_p95_ms <= CONFIG.semantic_layer_p95_ms

    def to_dict(self) -> dict[str, Any]:
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_false_positives": self.cache_false_positives,
            "cache_hit_rate": self.cache_hit_rate,
            "embed_latency_avg_ms": self._avg(
                self.embed_latency_ms_total,
                self.embed_latency_count,
            ),
            "cache_lookup_avg_ms": self._avg(
                self.cache_lookup_ms_total,
                self.cache_lookup_count,
            ),
            "router_latency_avg_ms": self._avg(
                self.router_latency_ms_total,
                self.router_latency_count,
            ),
            "compressor_latency_avg_ms": self._avg(
                self.compressor_latency_ms_total,
                self.compressor_latency_count,
            ),
            "semantic_total_avg_ms": self._avg(
                self.semantic_total_ms_total,
                self.semantic_total_count,
            ),
            "router_small_total": self.router_small_total,
            "router_large_total": self.router_large_total,
            "compressor_chunks_selected_total": self.compressor_chunks_selected_total,
            "current_threshold": self.current_threshold,
            "semantic_total_p95_ms": self.semantic_total_p95_ms,
            "semantic_total_p99_ms": self.semantic_total_p99_ms,
            "meets_p95_slo": self.meets_p95_slo,
        }

    @staticmethod
    def _avg(total: float, count: int) -> float:
        return total / count if count else 0.0


@dataclass
class SemanticMetrics:
    """Thread-safe in-process metrics with optional Prometheus export."""

    snapshot: SemanticMetricsSnapshot = field(default_factory=SemanticMetricsSnapshot)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)
    _prometheus_enabled: bool = field(default=CONFIG.enable_prometheus, repr=False)
    _prom: Any = field(default=None, init=False, repr=False)
    _latencies: deque[float] = field(
        default_factory=lambda: deque(maxlen=CONFIG.latency_window_size),
        repr=False,
    )

    def __post_init__(self) -> None:
        if self._prometheus_enabled:
            self._init_prometheus()

    def _init_prometheus(self) -> None:
        try:
            from prometheus_client import Counter, Gauge, Histogram
        except ImportError:
            self._prometheus_enabled = False
            return

        namespace = CONFIG.metrics_namespace
        self._prom = {
            "embed_latency": Histogram(
                f"{namespace}_embed_latency_ms",
                "Embedding latency in milliseconds",
            ),
            "cache_lookup": Histogram(
                f"{namespace}_cache_lookup_ms",
                "Cache lookup latency in milliseconds",
            ),
            "cache_hit": Counter(
                f"{namespace}_cache_hit_total",
                "Total semantic cache hits",
            ),
            "cache_miss": Counter(
                f"{namespace}_cache_miss_total",
                "Total semantic cache misses",
            ),
            "cache_false_positive": Counter(
                f"{namespace}_cache_false_positive_total",
                "Total semantic cache false positives",
            ),
            "router_tier": Counter(
                f"{namespace}_router_tier_total",
                "Router tier decisions",
                ["tier"],
            ),
            "compressor_chunks": Counter(
                f"{namespace}_compressor_chunks_selected_total",
                "Total RAG chunks selected by compressor",
            ),
            "semantic_total": Histogram(
                f"{namespace}_semantic_total_ms",
                "Total semantic layer latency excluding LLM",
            ),
            "threshold": Gauge(
                f"{namespace}_similarity_threshold_current",
                "Current cosine similarity threshold",
            ),
        }
        self._prom["threshold"].set(CONFIG.similarity_threshold)

    def record_embed(self, latency_ms: float) -> None:
        with self._lock:
            self.snapshot.embed_latency_ms_total += latency_ms
            self.snapshot.embed_latency_count += 1
        if self._prom:
            self._prom["embed_latency"].observe(latency_ms)

    def record_cache_lookup(self, latency_ms: float, *, hit: bool) -> None:
        with self._lock:
            self.snapshot.cache_lookup_ms_total += latency_ms
            self.snapshot.cache_lookup_count += 1
            if hit:
                self.snapshot.cache_hits += 1
            else:
                self.snapshot.cache_misses += 1
        if self._prom:
            self._prom["cache_lookup"].observe(latency_ms)
            if hit:
                self._prom["cache_hit"].inc()
            else:
                self._prom["cache_miss"].inc()

    def record_false_positive(self) -> None:
        with self._lock:
            self.snapshot.cache_false_positives += 1
        if self._prom:
            self._prom["cache_false_positive"].inc()

    def record_router(self, latency_ms: float, tier: str) -> None:
        with self._lock:
            self.snapshot.router_latency_ms_total += latency_ms
            self.snapshot.router_latency_count += 1
            if tier == "small":
                self.snapshot.router_small_total += 1
            else:
                self.snapshot.router_large_total += 1
        if self._prom:
            self._prom["router_tier"].labels(tier=tier).inc()

    def record_compressor(self, latency_ms: float, selected_chunks: int) -> None:
        with self._lock:
            self.snapshot.compressor_latency_ms_total += latency_ms
            self.snapshot.compressor_latency_count += 1
            self.snapshot.compressor_chunks_selected_total += selected_chunks
        if self._prom:
            self._prom["compressor_chunks"].inc(selected_chunks)

    def record_semantic_total(self, latency_ms: float) -> None:
        with self._lock:
            self.snapshot.semantic_total_ms_total += latency_ms
            self.snapshot.semantic_total_count += 1
            self._latencies.append(latency_ms)
        if self._prom:
            self._prom["semantic_total"].observe(latency_ms)

    def set_threshold(self, threshold: float) -> None:
        with self._lock:
            self.snapshot.current_threshold = threshold
        if self._prom:
            self._prom["threshold"].set(threshold)

    def get_snapshot(self) -> SemanticMetricsSnapshot:
        with self._lock:
            snap = SemanticMetricsSnapshot(**vars(self.snapshot))
            latencies = list(self._latencies)
        snap.semantic_total_p95_ms = _percentile(latencies, 95.0)
        snap.semantic_total_p99_ms = _percentile(latencies, 99.0)
        return snap


METRICS = SemanticMetrics()
