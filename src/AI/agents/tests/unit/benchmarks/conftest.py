"""Helpers shared by the benchmark tests."""

from __future__ import annotations

from langfuse import Evaluation


def comment_of(evaluation: Evaluation) -> str:
    """The comment of an evaluation. Fail when the evaluator wrote no comment."""
    assert evaluation.comment is not None, f"{evaluation.name} has no comment"
    return evaluation.comment
