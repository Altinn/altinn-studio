"""An end to end run must not silently attribute scores to the wrong model."""

from __future__ import annotations

import argparse
from types import SimpleNamespace

import pytest

from benchmarks import check, registry


def _run_eval_stub(calls: list[str]):
    def run_eval(entry):
        calls.append(entry.name)
        return SimpleNamespace(item_results=[]), {}, None

    return run_eval


class TestAnE2eRunRequiresAgentModels:
    def test_refuses_when_the_agent_reports_no_models(self, monkeypatch):
        monkeypatch.setattr(check, "agent_role_models", lambda _base: {})
        calls: list[str] = []

        with pytest.raises(SystemExit):
            check.run(
                label="test",
                include_slow=True,
                only=("Benchmarks/forms",),
                run_eval=_run_eval_stub(calls),
            )

        assert calls == [], "the app should never be built once attribution is impossible"

    def test_runs_and_records_the_agent_models_when_reported(self, monkeypatch):
        monkeypatch.setattr(check, "agent_role_models", lambda _base: {"actor": "gpt-9-agent"})
        calls: list[str] = []

        run = check.run(
            label="test",
            include_slow=True,
            only=("Benchmarks/forms",),
            run_eval=_run_eval_stub(calls),
        )

        assert calls == ["Benchmarks/forms"]
        assert run.provenance.models["actor"] == "gpt-9-agent"

    def test_a_non_e2e_run_never_asks_the_agent(self, monkeypatch):
        def fail(_base):
            raise AssertionError("a non-e2e run has no reason to call the agent")

        monkeypatch.setattr(check, "agent_role_models", fail)
        calls: list[str] = []

        check.run(label="test", only=("Gates/scope",), run_eval=_run_eval_stub(calls))

        assert calls == ["Gates/scope"]


class TestTaskForAlsoRefusesWithoutAgentModels:
    """A second, independent call to the agent must not reopen the hole `run` closes."""

    def test_a_given_snapshot_is_used_rather_than_asked_for_again(self, monkeypatch):
        def fail(_base):
            raise AssertionError("the snapshot the run resolved should be reused")

        monkeypatch.setattr(check, "agent_role_models", fail)
        args = argparse.Namespace(run_name=None, assets_dir=None)

        task, _, _, model = check.task_for(
            args, registry.by_name("Benchmarks/forms"), {"actor": "gpt-9-snapshot"}
        )

        assert task.role_models["actor"] == "gpt-9-snapshot"
        assert model == "gpt-9-snapshot"

    def test_the_run_and_the_task_are_handed_the_same_snapshot(self, monkeypatch):
        reported = ["gpt-9-first", "gpt-9-rebuilt"]
        monkeypatch.setattr(check, "agent_role_models", lambda _base: {"actor": reported.pop(0)})
        planned = (registry.by_name("Benchmarks/forms"),)

        snapshot = check.agent_models_for(planned)
        run = check.run(
            label="test",
            include_slow=True,
            only=("Benchmarks/forms",),
            agent_models=snapshot,
            run_eval=_run_eval_stub([]),
        )

        assert snapshot["actor"] == "gpt-9-first"
        assert run.provenance.models["actor"] == "gpt-9-first"
        assert reported == ["gpt-9-rebuilt"], "one lookup for the whole run"

    def test_task_for_refuses_when_the_agent_reports_no_models(self, monkeypatch):
        monkeypatch.setattr(check, "agent_role_models", lambda _base: {})
        args = argparse.Namespace(run_name=None, assets_dir=None)

        with pytest.raises(SystemExit):
            check.task_for(args, registry.by_name("Benchmarks/forms"))
