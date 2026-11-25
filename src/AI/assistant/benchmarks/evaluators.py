"""The score an evaluator gives, as the runner posts it to Langfuse."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Score:
    name: str
    value: float
    data_type: str  # "BOOLEAN" | "NUMERIC"
    comment: str
