"""Bridge from our structural scorers to `langfuse.run_experiment`."""

from __future__ import annotations

from typing import Any, Callable

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


def completion_rate(*, item_results: list[Any], **_: Any) -> list[Evaluation]:
    """Run-level: how many items produced a scored app at all."""
    total = len(item_results)
    if not total:
        return []
    completed = sum(1 for r in item_results if scores_from_output(getattr(r, "output", None)))
    return [
        Evaluation(
            name="run_items_scored",
            value=round(completed / total, 4),
            comment=f"{completed}/{total} items produced scores",
        )
    ]


def mean_of(score_name: str) -> Callable[..., list[Evaluation]]:
    """Run-level evaluator for one structural score, averaged across items."""

    def evaluator(*, item_results: list[Any], **_: Any) -> list[Evaluation]:
        values = [
            score.value
            for result in item_results
            for score in scores_from_output(getattr(result, "output", None))
            if score.name == score_name and isinstance(score.value, (int, float))
        ]
        if not values:
            return []
        return [
            Evaluation(
                name=f"run_mean_{score_name}",
                value=round(sum(values) / len(values), 4),
                comment=f"mean of {len(values)} item(s)",
            )
        ]

    return evaluator
