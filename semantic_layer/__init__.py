"""
Semantic layer for local LLM pipelines.

Provides semantic caching, complexity routing, RAG compression, and orchestration
for Ollama / llama.cpp / HuggingFace backends.
"""

from semantic_layer.cache import (
    CacheEntry,
    CacheLookupResult,
    ChromaSemanticCache,
    FaissSemanticCache,
    SemanticCache,
)
from semantic_layer.compressor import CompressedContext, RagChunk, RagSemanticCompressor
from semantic_layer.config import CONFIG, CacheBackend, ModelTier, SemanticLayerConfig
from semantic_layer.embeddings import EmbeddingResult, EmbeddingService
from semantic_layer.metrics import METRICS, SemanticMetrics, SemanticMetricsSnapshot
from semantic_layer.pipeline import (
    LLMBackend,
    OllamaBackend,
    PipelineResult,
    SemanticPipeline,
    StreamingLLMBackend,
    create_cache,
)
from semantic_layer.router import ComplexityRouter, RoutingDecision
from semantic_layer.threshold import CacheFeedbackRecord, ThresholdAutoTuner

__all__ = [
    "CONFIG",
    "METRICS",
    "CacheBackend",
    "CacheEntry",
    "CacheFeedbackRecord",
    "CacheLookupResult",
    "ChromaSemanticCache",
    "ComplexityRouter",
    "CompressedContext",
    "EmbeddingResult",
    "EmbeddingService",
    "FaissSemanticCache",
    "LLMBackend",
    "ModelTier",
    "OllamaBackend",
    "PipelineResult",
    "RagChunk",
    "RagSemanticCompressor",
    "RoutingDecision",
    "SemanticCache",
    "SemanticLayerConfig",
    "SemanticMetrics",
    "SemanticMetricsSnapshot",
    "SemanticPipeline",
    "StreamingLLMBackend",
    "ThresholdAutoTuner",
    "create_cache",
]

__version__ = "0.1.0"
