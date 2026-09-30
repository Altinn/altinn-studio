"""Bridge from our structural scorers to `langfuse.run_experiment`."""

from __future__ import annotations

from typing import Any

from langfuse import Evaluation

from .evaluators import Score

SCORES_KEY = "scores"


def as_evaluation(score: Score) -> Evaluation:
    """One of our Scores in the shape the experiment runner records."""
    return Evaluation(name=score.name, value=score.value, comment=score.comment)


def scores_from_output(output: Any) -> list[Score]:
    """The scores a task attached to its result, or none when it failed."""
    if isinstance(output, dict):
        scores = output.get(SCORES_KEY)
        if isinstance(scores, list):
            return [s for s in scores if isinstance(s, Score)]
    return []


def structural_evaluator(*, output: Any = None, **_: Any) -> list[Evaluation]:
    """Item-level evaluator: replay whatever the task scored."""
    return [as_evaluation(score) for score in scores_from_output(output)]
