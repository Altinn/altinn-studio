"""Adapting our structural scores to the experiment runner's shape."""

from __future__ import annotations

from benchmarks.evaluators import Score
from benchmarks.experiment import (
    as_evaluation,
    scores_from_output,
    structural_evaluator,
)

PAGES = Score("bench_pages", 1.0, "BOOLEAN", "expected 3, found 3")
COVERAGE = Score("bench_field_coverage", 0.9302, "NUMERIC", "40/43 titles")


class TestScoreAdaptation:
    def test_a_score_keeps_its_name_value_and_comment(self):
        evaluation = as_evaluation(COVERAGE)

        assert evaluation.name == "bench_field_coverage"
        assert evaluation.value == 0.9302
        assert "40/43" in evaluation.comment

    def test_an_item_replays_every_score_the_task_produced(self):
        assert len(structural_evaluator(output={"scores": [PAGES, COVERAGE]})) == 2

    def test_a_failed_item_yields_no_evaluations(self):
        """A task that could not clone the branch returns nothing to score."""
        assert structural_evaluator(output=None) == []

    def test_a_malformed_output_is_ignored_rather_than_raising(self):
        """An evaluator that raises would take the whole run down with it."""
        assert scores_from_output("not a dict") == []
        assert scores_from_output({"scores": "not a list"}) == []
