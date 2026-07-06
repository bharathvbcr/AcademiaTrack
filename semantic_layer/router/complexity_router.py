"""Route prompts to small or large local models based on complexity signals."""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass

import numpy as np

from semantic_layer.config import CONFIG, ModelTier
from semantic_layer.vectortypes import FloatVector

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RoutingDecision:
    tier: ModelTier
    model_id: str
    complexity_score: float
    latency_ms: float
    signals: dict[str, float]


class ComplexityRouter:
    """
    Hybrid router combining:
    1. Heuristic features (token length, code blocks, multi-step markers)
    2. Embedding distance to "simple" and "complex" anchor centroids

    Score in [0, 1]: higher routes to LARGE model.
    """

    SIMPLE_MARKERS = re.compile(
        r"\b(hi|hello|thanks|what is|define|translate|summarize in \d+ words)\b",
        re.IGNORECASE,
    )
    COMPLEX_MARKERS = re.compile(
        r"\b(analyze|compare|prove|implement|architect|optimize|multi-step|"
        r"trade-off|formal proof|refactor|debug|benchmark)\b",
        re.IGNORECASE,
    )
    CODE_BLOCK = re.compile(r"```")

    def __init__(
        self,
        complexity_threshold: float | None = None,
        simple_centroid: FloatVector | None = None,
        complex_centroid: FloatVector | None = None,
        *,
        fail_open_to_large: bool | None = None,
    ) -> None:
        self.threshold = (
            complexity_threshold
            if complexity_threshold is not None
            else CONFIG.complexity_threshold
        )
        self.simple_centroid = simple_centroid
        self.complex_centroid = complex_centroid
        self.fail_open_to_large = (
            fail_open_to_large
            if fail_open_to_large is not None
            else CONFIG.router_fail_open_to_large
        )

    def set_centroids(
        self,
        simple_centroid: FloatVector,
        complex_centroid: FloatVector,
    ) -> None:
        self.simple_centroid = simple_centroid
        self.complex_centroid = complex_centroid

    def _heuristic_score(self, prompt: str) -> float:
        score = 0.0
        tokens = len(prompt.split())

        if tokens < 20:
            score -= 0.15
        elif tokens > 200:
            score += 0.25
        elif tokens > 80:
            score += 0.10

        if self.SIMPLE_MARKERS.search(prompt):
            score -= 0.20
        if self.COMPLEX_MARKERS.search(prompt):
            score += 0.30
        if self.CODE_BLOCK.search(prompt):
            score += 0.20
        if prompt.count("?") > 1:
            score += 0.10

        return float(np.clip(score, -0.5, 0.5) + 0.5)

    def _embedding_score(self, query: FloatVector) -> float:
        if self.simple_centroid is None or self.complex_centroid is None:
            return 0.5

        sim_simple = float(np.dot(query, self.simple_centroid))
        sim_complex = float(np.dot(query, self.complex_centroid))

        exp_s = np.exp(sim_simple * 10)
        exp_c = np.exp(sim_complex * 10)
        return float(exp_c / (exp_s + exp_c))

    def route(self, prompt: str, query_embedding: FloatVector) -> RoutingDecision:
        t0 = time.perf_counter()

        try:
            h_score = self._heuristic_score(prompt)
            e_score = self._embedding_score(query_embedding)
            complexity = 0.4 * h_score + 0.6 * e_score

            tier = ModelTier.LARGE if complexity >= self.threshold else ModelTier.SMALL
            model_id = (
                CONFIG.large_model_id
                if tier == ModelTier.LARGE
                else CONFIG.small_model_id
            )
        except Exception:
            logger.exception("Router failed; applying fail-open policy")
            if self.fail_open_to_large:
                tier = ModelTier.LARGE
                model_id = CONFIG.large_model_id
                complexity = 1.0
                h_score = 0.0
                e_score = 1.0
            else:
                tier = ModelTier.SMALL
                model_id = CONFIG.small_model_id
                complexity = 0.0
                h_score = 0.0
                e_score = 0.0

        latency_ms = (time.perf_counter() - t0) * 1000

        return RoutingDecision(
            tier=tier,
            model_id=model_id,
            complexity_score=complexity,
            latency_ms=latency_ms,
            signals={"heuristic": h_score, "embedding": e_score},
        )
