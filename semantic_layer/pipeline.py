"""
End-to-end semantic pipeline orchestrator.

Re-exports the production orchestrator under the canonical ``pipeline`` module
name. Flow: cache check → route → compress → LLM, with graceful fallthrough
on cache miss.
"""

from semantic_layer.orchestrator import (
    LLMBackend,
    OllamaBackend,
    PipelineResult,
    SemanticPipeline,
    create_cache,
)

__all__ = [
    "LLMBackend",
    "OllamaBackend",
    "PipelineResult",
    "SemanticPipeline",
    "create_cache",
]
