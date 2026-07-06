"""Low-latency embedding service with warm singleton and optional INT8 path."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Sequence

import numpy as np

from semantic_layer.config import CONFIG
from semantic_layer.vectortypes import FloatMatrix, FloatVector

logger = logging.getLogger(__name__)

__all__ = ["EmbeddingResult", "EmbeddingService", "FloatMatrix", "FloatVector"]


@dataclass(frozen=True)
class EmbeddingResult:
    vectors: FloatMatrix
    latency_ms: float
    model_name: str


class EmbeddingService:
    """
    Thread-safe singleton embedding encoder.

    Design notes:
    - Load model once at startup (cold-start mitigation).
    - Prefer CPU for edge devices to avoid GPU contention with LLM.
    - L2-normalize so dot product == cosine similarity.
    """

    _instance: EmbeddingService | None = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs) -> EmbeddingService:
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(
        self,
        model_name: str | None = None,
        device: str | None = None,
        *,
        normalize_embeddings: bool | None = None,
    ) -> None:
        if getattr(self, "_initialized", False):
            return
        self.model_name = model_name or CONFIG.embedding_model
        self.device = device or CONFIG.embedding_device
        self.normalize_embeddings = (
            normalize_embeddings
            if normalize_embeddings is not None
            else CONFIG.normalize_embeddings
        )
        self._model = None
        self._warm = False
        self._model_lock = threading.Lock()
        self._initialized = True

    @property
    def is_warm(self) -> bool:
        return self._warm

    def warm_up(self) -> None:
        """Eliminate cold-start latency on first real request."""
        self.encode(["warmup query for embedding service"])
        self._warm = True
        logger.info("EmbeddingService warm-up complete")

    def _load_model(self) -> None:
        if self._model is not None:
            return
        with self._model_lock:
            if self._model is not None:
                return
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise RuntimeError(
                    "Install sentence-transformers: pip install sentence-transformers"
                ) from exc

            self._model = SentenceTransformer(self.model_name, device=self.device)
            logger.info(
                "Loaded embedding model %s on %s", self.model_name, self.device
            )

    def encode(self, texts: Sequence[str]) -> EmbeddingResult:
        self._load_model()
        assert self._model is not None

        t0 = time.perf_counter()
        raw: FloatMatrix = self._model.encode(
            list(texts),
            convert_to_numpy=True,
            normalize_embeddings=self.normalize_embeddings,
            show_progress_bar=False,
            batch_size=CONFIG.embedding_batch_size,
        ).astype(np.float32)
        latency_ms = (time.perf_counter() - t0) * 1000.0

        return EmbeddingResult(
            vectors=raw,
            latency_ms=latency_ms,
            model_name=self.model_name,
        )

    def encode_one(self, text: str) -> tuple[FloatVector, float]:
        result = self.encode([text])
        return result.vectors[0], result.latency_ms
