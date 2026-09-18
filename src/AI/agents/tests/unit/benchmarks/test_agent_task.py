"""The experiment task, with the live stack faked out."""

from __future__ import annotations

from pathlib import Path

import pytest

from benchmarks import agent_task
from benchmarks.agent_task import AgentTask, STRUCTURAL_SCORE_NAMES, item_field
from benchmarks.evaluators import Score
from benchmarks.experiment import SCORES_KEY
from benchmarks.rubric import RUBRIC_VERSION

RUBRIC = {"rubric_version": RUBRIC_VERSION, "expected_pages": 2}


def _item(**overrides):
    item = {
        "id": "item-1",
        "input": {"goal": "lag et skjema"},
        "expected_output": RUBRIC,
        "metadata": {},
        "dataset_id": "ds-1",
    }
    item.update(overrides)
    return item


@pytest.fixture
def task(monkeypatch, tmp_path):
    """A task whose agent always succeeds and whose branch always clones."""
    monkeypatch.setattr(agent_task, "start_agent", lambda *a, **k: None)
    monkeypatch.setattr(
        agent_task, "await_workflow", lambda *a, **k: {"status": "done", "success": True}
    )
    monkeypatch.setattr(agent_task, "clone_result_branch", lambda s, w: tmp_path / "clone")
    monkeypatch.setattr(agent_task, "load_app", lambda path: object())
    monkeypatch.setattr(
        agent_task,
        "evaluate",
        lambda app, rubric: [Score("bench_pages", 1.0, "BOOLEAN", "2/2")],
    )
    monkeypatch.setattr(agent_task.preview_check, "is_enabled", lambda: False)
    return AgentTask(agent_base="http://agent", assets_dir=tmp_path, run_name="run-a")


class TestTheOutputCarriesTheScores:
    def test_scores_are_returned_under_the_key_the_evaluators_read(self, task):
        output = task(item=_item())

        names = [score.name for score in output[SCORES_KEY]]
        assert "bench_completed" in names
        assert "bench_pages" in names

    def test_the_session_is_reported_so_a_run_can_be_traced_back(self, task):
        output = task(item=_item())

        assert output["session_id"]
        assert output["session_branch"] == f"altinity_session_{output['session_id'][:8]}"

    def test_a_finished_workflow_scores_completed(self, task):
        output = task(item=_item())

        completed = next(s for s in output[SCORES_KEY] if s.name == "bench_completed")
        assert completed.value == 1.0


class TestAnUnusableItemFails:
    """`run_experiment` isolates and records a failing item."""

    def test_a_missing_goal_raises(self, task):
        with pytest.raises(ValueError, match="no input.goal"):
            task(item=_item(input={}))

    def test_a_stale_rubric_raises(self, task):
        with pytest.raises(ValueError, match="not a v"):
            task(item=_item(expected_output={"rubric_version": "0", "expected_pages": 1}))

    def test_the_rubric_error_says_how_to_fix_it(self, task):
        with pytest.raises(ValueError, match="rubric --from-app"):
            task(item=_item(expected_output={}))


class TestAnAppThatWasNeverBuilt:
    def test_every_structural_score_is_zero_rather_than_absent(self, task, monkeypatch):
        """A missing score and a zero score look the same in a mean, so an item
        that produced no app has to score zero explicitly."""
        monkeypatch.setattr(agent_task, "clone_result_branch", lambda s, w: None)

        output = task(item=_item())

        scored = {s.name: s.value for s in output[SCORES_KEY]}
        for name in STRUCTURAL_SCORE_NAMES:
            assert scored[name] == 0.0, name

    def test_the_reason_is_on_every_score(self, task, monkeypatch):
        monkeypatch.setattr(agent_task, "clone_result_branch", lambda s, w: None)

        output = task(item=_item())

        structural = [s for s in output[SCORES_KEY] if s.name in STRUCTURAL_SCORE_NAMES]
        assert all("no committed session branch" in s.comment for s in structural)


class TestTheAgentTraceJoinsTheRun:
    """The SDK traces the task, but the agent is a separate service with its own
    trace. It is handed the experiment context so both land in the dataset run."""

    def test_the_context_names_the_run_and_the_item(self, task):
        context = task.experiment_context(_item())

        assert context["experimentName"] == "run-a"
        assert context["datasetId"] == "ds-1"
        assert context["itemId"] == "item-1"

    def test_the_experiment_id_is_stable_within_a_run(self, task):
        assert task.experiment_context(_item()) == task.experiment_context(_item())

    def test_a_different_run_gets_a_different_id(self, task):
        other = AgentTask(agent_base="http://agent", assets_dir=Path("."), run_name="run-b")

        assert (
            task.experiment_context(_item())["experimentId"]
            != other.experiment_context(_item())["experimentId"]
        )


class TestItemFieldHandlesBothShapes:
    """Items arrive as SDK objects from a dataset and as dicts from a local list,
    and the two spell expected output differently."""

    def test_a_dict_item_with_the_wire_spelling(self):
        assert item_field({"expectedOutput": RUBRIC}, "expected_output") == RUBRIC

    def test_a_dict_item_with_the_python_spelling(self):
        assert item_field({"expected_output": RUBRIC}, "expected_output") == RUBRIC

    def test_an_object_item(self):
        class Item:
            expected_output = RUBRIC

        assert item_field(Item(), "expected_output") == RUBRIC

    def test_a_missing_field_is_none(self):
        assert item_field({}, "metadata") is None
