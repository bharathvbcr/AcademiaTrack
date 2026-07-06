"""Background worker for dynamic cosine similarity threshold tuning."""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from dataclasses import dataclass

from semantic_layer.cache.base import SemanticCache
from semantic_layer.config import CONFIG

logger = logging.getLogger(__name__)


@dataclass
class CacheFeedbackRecord:
    similarity: float
    accepted: bool
    timestamp: float = 0.0

    def __post_init__(self) -> None:
        if self.timestamp == 0.0:
            self.timestamp = time.time()


class ThresholdAutoTuner:
    """
    Periodically re-evaluates optimal threshold using sliding-window grid search.
    Runs in a daemon thread; thread-safe.
    """

    def __init__(
        self,
        cache: SemanticCache,
        window_size: int | None = None,
        tune_interval: float | None = None,
    ) -> None:
        self.cache = cache
        self.window: deque[CacheFeedbackRecord] = deque(
            maxlen=window_size or CONFIG.threshold_tune_window_size
        )
        self.tune_interval = (
            tune_interval
            if tune_interval is not None
            else CONFIG.threshold_tune_interval_seconds
        )
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def record(self, similarity: float, accepted: bool) -> None:
        with self._lock:
            self.window.append(
                CacheFeedbackRecord(similarity=similarity, accepted=accepted)
            )

    def tune_once(self) -> float | None:
        with self._lock:
            records = list(self.window)

        if len(records) < CONFIG.threshold_tune_min_samples:
            return None

        previous_threshold = self.cache.threshold
        best_tau = previous_threshold
        best_score = float("-inf")

        tau = CONFIG.threshold_tune_tau_min
        while tau <= CONFIG.threshold_tune_tau_max:
            hits = [record for record in records if record.similarity >= tau]
            if len(hits) < CONFIG.threshold_tune_min_hits:
                tau += CONFIG.threshold_tune_tau_step
                continue

            fp_rate = sum(1 for record in hits if not record.accepted) / len(hits)
            if fp_rate > CONFIG.max_fp_rate:
                tau += CONFIG.threshold_tune_tau_step
                continue

            hit_rate = len(hits) / len(records)
            score = hit_rate * 500 - fp_rate * 2000

            if score > best_score:
                best_score = score
                best_tau = tau

            tau += CONFIG.threshold_tune_tau_step

        smoothing = CONFIG.threshold_tune_smoothing
        smoothed = (1.0 - smoothing) * previous_threshold + smoothing * best_tau
        self.cache.update_threshold(smoothed)
        logger.info(
            "Threshold tuned: %.4f -> %.4f (candidate %.4f)",
            previous_threshold,
            smoothed,
            best_tau,
        )
        return smoothed

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return

        def _loop() -> None:
            while not self._stop.is_set():
                try:
                    self.tune_once()
                except Exception:
                    logger.exception("Threshold tuning failed")
                self._stop.wait(self.tune_interval)

        self._thread = threading.Thread(
            target=_loop,
            daemon=True,
            name="threshold-tuner",
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
