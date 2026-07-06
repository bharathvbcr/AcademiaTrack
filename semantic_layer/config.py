"""Central configuration for the semantic layer."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class CacheBackend(str, Enum):
    FAISS = "faiss"
    CHROMA = "chroma"


class ModelTier(str, Enum):
    SMALL = "small"  # 1B–3B
    LARGE = "large"  # 8B–70B


class SemanticLayerConfig(BaseSettings):
    """All tunables with sane production defaults."""

    model_config = SettingsConfigDict(
        env_prefix="SEMANTIC_",
        env_file=".env",
        extra="ignore",
    )

    # Embedding
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_device: Literal["cpu", "cuda", "mps"] = "cpu"
    embedding_batch_size: int = 1
    normalize_embeddings: bool = True
    embedding_dim: int = 384  # single source of truth; caches derive their index dim from this

    # Cache
    cache_backend: CacheBackend = CacheBackend.FAISS
    cache_max_entries: int = 10_000
    cache_max_ram_mb: int = 512
    chroma_persist_directory: str = "./chroma_semantic_cache"
    similarity_threshold: float = 0.90
    similarity_margin: float = 0.04
    threshold_floor: float = 0.80  # clamp bounds shared by every backend's update_threshold
    threshold_ceiling: float = 0.99
    cache_ttl_seconds: int = 86_400
    cache_soft_ttl_seconds: int = 3_600
    ood_domain_threshold: float = 0.75
    # OOD gating is enabled only when domain anchors are supplied (else it would
    # gate on an arbitrary centroid and wrongly reject in-domain queries).
    ood_domain_anchors: tuple[str, ...] = ()
    faiss_rebuild_tombstone_ratio: float = 0.10
    # Optional FAISS persistence (empty = disabled; local-first warm cache across restarts).
    faiss_persist_path: str = ""
    # Chroma evicts expired rows every N stores (0 = never sweep, read-time filter only).
    chroma_evict_every: int = 128

    # Router
    complexity_threshold: float = 0.55
    router_fail_open_to_large: bool = True
    small_model_id: str = "llama3.2:1b"
    large_model_id: str = "llama3.1:8b"
    # Anchor phrases used to fit the router's simple/complex centroids at startup.
    router_simple_anchors: tuple[str, ...] = (
        "hi",
        "hello, what is this?",
        "define this term",
        "translate this sentence",
        "summarize this briefly",
    )
    router_complex_anchors: tuple[str, ...] = (
        "analyze and compare the trade-offs in depth",
        "prove this theorem formally with each step",
        "refactor and optimize this module for performance",
        "debug this multi-step failure and explain the root cause",
        "architect a benchmark plan with validation",
    )

    # Compressor
    max_context_tokens: int = 2048
    min_chunk_relevance: float = 0.35
    max_rag_chunks: int = 8
    mmr_lambda: float = 0.7

    # Performance SLO
    semantic_layer_p95_ms: float = 15.0
    max_fp_rate: float = 0.02

    # Auto-tuning
    threshold_tune_interval_seconds: int = 300
    threshold_tune_min_samples: int = 50
    threshold_tune_window_size: int = 500
    threshold_tune_min_hits: int = 20
    threshold_tune_tau_min: float = 0.82
    threshold_tune_tau_max: float = 0.975
    threshold_tune_tau_step: float = 0.005
    threshold_tune_smoothing: float = 0.10

    # Ollama backend
    ollama_base_url: str = "http://localhost:11434"
    ollama_timeout_seconds: float = 120.0
    # SSRF guard: request-supplied upstreams must be loopback or one of these hosts.
    ollama_allowed_hosts: tuple[str, ...] = ("localhost", "127.0.0.1", "::1", "0.0.0.0")

    # HTTP sidecar (AcademiaTrack bridge)
    enabled: bool = False
    server_host: str = "127.0.0.1"
    server_port: int = 8765

    # Metrics
    enable_prometheus: bool = False
    metrics_namespace: str = "semantic_layer"
    latency_window_size: int = 1024  # rolling window for in-process p95/p99 of the SLO


CONFIG = SemanticLayerConfig()
