"""Canonical numeric vector type aliases.

Single source of truth for the embedding vector/matrix types used across the
cache, router, compressor, and embedding modules. Import from here instead of
redefining ``npt.NDArray[np.float32]`` locally.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

FloatVector = npt.NDArray[np.float32]
FloatMatrix = npt.NDArray[np.float32]

__all__ = ["FloatVector", "FloatMatrix"]
