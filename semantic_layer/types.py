"""
Shared type definitions for the semantic layer.

Centralizes dataclasses, protocols, and type aliases used across cache,
router, compressor, pipeline, and threshold modules.
"""

from __future__ import annotations

from semantic_layer.cache.base import (
    CacheEntry,
    CacheLookupResult,
    FloatVector,
    SemanticCache,
)
from semantic_layer.compressor.rag_compressor import CompressedContext, RagChunk
from semantic_layer.config import CacheBackend, ModelTier, SemanticLayerConfig
from semantic_layer.embeddings import EmbeddingResult, FloatMatrix
from semantic_layer.metrics import SemanticMetricsSnapshot
from semantic_layer.orchestrator import LLMBackend, PipelineResult, StreamingLLMBackend
from semantic_layer.router.complexity_router import RoutingDecision
from semantic_layer.threshold_tuner import CacheFeedbackRecord

__all__ = [
    "CacheBackend",
    "CacheEntry",
    "CacheFeedbackRecord",
    "CacheLookupResult",
    "CompressedContext",
    "EmbeddingResult",
    "FloatMatrix",
    "FloatVector",
    "LLMBackend",
    "ModelTier",
    "PipelineResult",
    "RagChunk",
    "RoutingDecision",
    "SemanticCache",
    "SemanticLayerConfig",
    "SemanticMetricsSnapshot",
    "StreamingLLMBackend",
]
