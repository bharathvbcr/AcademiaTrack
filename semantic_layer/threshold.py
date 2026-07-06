"""
Dynamic cosine-similarity threshold auto-tuning.

Tracks hit rate vs false-positive rate and adjusts cache threshold on a
sliding window of user feedback records.
"""

from semantic_layer.threshold_tuner import CacheFeedbackRecord, ThresholdAutoTuner

__all__ = ["CacheFeedbackRecord", "ThresholdAutoTuner"]
