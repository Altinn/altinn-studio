"""Adapting our structural scores to the experiment runner's shape."""

from __future__ import annotations

from benchmarks.evaluators import Score
from benchmarks.experiment import (
    as_evaluation,
    completion_rate,
    mean_of,
    scores_from_output,
    structural_evaluator,
)

PAGES = Score("bench_pages", 1.0, "BOOLEAN", "expected 3, found 3")
COVERAGE = Score("bench_field_coverage", 0.9302, "NUMERIC", "40/43 titles")


class _Result:
    def __init__(self, scores):
        self.output = {"scores": scores} if scores is not None else None


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


class TestRunLevel:
    def test_completion_rate_counts_items_that_produced_scores(self):
        results = [_Result([PAGES]), _Result(None), _Result([PAGES])]

        evaluation = completion_rate(item_results=results)[0]

        assert evaluation.value == round(2 / 3, 4)

    def test_completion_rate_is_absent_for_an_empty_run(self):
        assert completion_rate(item_results=[]) == []

    def test_a_mean_is_taken_across_items(self):
        results = [_Result([COVERAGE]), _Result([Score("bench_field_coverage", 1.0, "NUMERIC", "")])]

        evaluation = mean_of("bench_field_coverage")(item_results=results)[0]

        assert evaluation.value == round((0.9302 + 1.0) / 2, 4)
        assert evaluation.name == "run_mean_bench_field_coverage"

    def test_a_mean_ignores_items_that_lack_that_score(self):
        """A dropped item must not be averaged in as a zero."""
        results = [_Result([COVERAGE]), _Result(None)]

        evaluation = mean_of("bench_field_coverage")(item_results=results)[0]

        assert evaluation.value == 0.9302
        assert "1 item" in evaluation.comment

    def test_a_score_nobody_produced_yields_nothing(self):
        assert mean_of("bench_renders")(item_results=[_Result([PAGES])]) == []
