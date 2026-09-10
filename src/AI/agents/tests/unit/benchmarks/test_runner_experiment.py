"""The handover into `langfuse.run_experiment`, with the client faked."""

from __future__ import annotations

import argparse
import json
from types import SimpleNamespace

import pytest

from benchmarks import check, registry
from benchmarks.agent_task import AgentTask, STRUCTURAL_SCORE_NAMES


class _Dataset:
    def __init__(self, items):
        self.items = items
        self.version = "2026-09-08T14:22:00Z"


class _Client:
    def __init__(self, items):
        self._dataset = _Dataset(items)
        self.calls: list[dict] = []
        self.flushed = 0

    def get_dataset(self, name):
        self.requested = name
        return self._dataset

    def run_experiment(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(item_results=[], format=lambda: "formatted result")

    def flush(self):
        self.flushed += 1

    @property
    def last(self) -> dict:
        assert self.calls, "run_experiment was never called"
        return self.calls[-1]


def _item(item_id="item-1", status="ACTIVE"):
    return SimpleNamespace(
        id=item_id,
        status=status,
        input={"goal": "g"},
        expected_output={},
        metadata={},
        dataset_id="ds-1",
    )


def _args(**overrides):
    defaults = {
        "role": "actor",
        "model": None,
        "max_tokens": None,
        "max_concurrency": 5,
        "assets_dir": None,
        "run_name": None,
    }
    defaults.update(overrides)
    return argparse.Namespace(**defaults)


@pytest.fixture
def client(monkeypatch):
    created = _Client([_item("item-1"), _item("item-2"), _item("archived", status="ARCHIVED")])
    monkeypatch.setattr(check, "get_client", lambda: created)
    monkeypatch.setattr(check, "agent_role_models", lambda _base: {"actor": "gpt-5.6-terra"})
    return created


def _run_one(_client, name: str, args=None):
    """The fixture patches the client in, so it is a dependency rather than an argument."""
    go = check.langfuse_runner(args or _args())
    return go(registry.by_name(name))


class TestTheHandoverToTheSdk:
    def test_the_active_items_are_the_experiment_data(self, client):
        _run_one(client, "Gates/scope")
        assert [i.id for i in client.last["data"]] == ["item-1", "item-2"]

    def test_an_archived_item_is_left_out(self, client):
        """Archiving hides an item from the SDK listing but not from `dataset.items`."""
        _run_one(client, "Gates/scope")
        assert all(i.status != "ARCHIVED" for i in client.last["data"])

    def test_the_results_are_flushed(self, client):
        _run_one(client, "Gates/scope")
        assert client.flushed == 1


class TestTheTaskMatchesTheDatasetKind:
    def test_an_e2e_dataset_builds_an_app(self, client):
        """The bug this covers: with no e2e branch, a build ran as a replay."""
        _run_one(client, "Benchmarks/forms")
        assert isinstance(client.last["task"], AgentTask)

    def test_a_prompt_dataset_sends_one_gate_message(self, client):
        from benchmarks.gates import GateTask

        _run_one(client, "Gates/scope")
        assert isinstance(client.last["task"], GateTask)

    def test_a_planner_dataset_calls_the_planner(self, client):
        from benchmarks.planner import PlannerTask

        _run_one(client, "Planner/spec")
        assert isinstance(client.last["task"], PlannerTask)

    def test_a_generation_dataset_replays_a_decision_point(self, client):
        from benchmarks.generation import GenerationTask

        _run_one(client, "Loop/traces")
        assert isinstance(client.last["task"], GenerationTask)


class TestAnE2eBuildRunsOneItemAtATime:
    """It pushes to one repo and drives one browser preview, so items cannot overlap."""

    def test_concurrency_is_forced_to_one(self, client):
        _run_one(client, "Benchmarks/forms", _args(max_concurrency=8))
        assert check.E2E_MAX_CONCURRENCY == 1
        assert client.last["max_concurrency"] == check.E2E_MAX_CONCURRENCY

    def test_a_cheap_dataset_keeps_the_requested_concurrency(self, client):
        _run_one(client, "Gates/scope", _args(max_concurrency=8))
        assert client.last["max_concurrency"] == 8


class TestTheRunRecordsWhatItRanAgainst:
    def test_the_metadata_is_the_provenance_axes(self, client):
        _run_one(client, "Gates/scope")
        metadata = client.last["metadata"]
        assert set(metadata) >= {
            "code",
            "environment",
            "models",
            "actor_prompt",
            "tools",
            "recorded_at",
        }

    def test_every_metadata_value_is_a_string(self, client):
        """`run_experiment(metadata=...)` takes Dict[str, str], so axes are encoded."""
        _run_one(client, "Gates/scope")
        metadata = client.last["metadata"]
        assert all(isinstance(v, str) for v in metadata.values())
        assert "actor" in json.loads(metadata["models"])

    def test_the_run_name_is_unique_so_two_runs_cannot_merge(self, client):
        """Langfuse keys a dataset run by name, and re-using one merges the results."""
        _run_one(client, "Gates/scope")
        first = client.last["run_name"]
        _run_one(client, "Gates/scope")
        assert client.last["run_name"] != first

    def test_the_description_names_the_commit(self, client):
        _run_one(client, "Gates/scope")
        assert "Gates/scope" in client.last["description"]


class TestTheMetadataAttributesAnE2eRunToTheAgent:
    """The bug this covers: metadata recorded the checkout's models even for e2e."""

    def test_e2e_metadata_uses_the_agents_model_not_the_checkouts(self, client, monkeypatch):
        monkeypatch.setattr(check, "agent_role_models", lambda _base: {"actor": "sentinel-agent-model"})
        _run_one(client, "Benchmarks/forms")
        metadata = client.last["metadata"]
        assert json.loads(metadata["models"])["actor"] == "sentinel-agent-model"

    def test_non_e2e_metadata_is_unaffected_by_the_agent(self, client, monkeypatch):
        monkeypatch.setattr(check, "agent_role_models", lambda _base: {"actor": "sentinel-agent-model"})
        _run_one(client, "Gates/scope")
        metadata = client.last["metadata"]
        assert json.loads(metadata["models"])["actor"] != "sentinel-agent-model"


class TestTheStructuralScoresStillExist:
    def test_an_e2e_run_scores_with_the_structural_evaluator(self, client):
        from benchmarks.experiment import structural_evaluator

        _run_one(client, "Benchmarks/forms")
        assert client.last["evaluators"] == [structural_evaluator]

    def test_the_structural_score_names_are_declared(self):
        assert len(STRUCTURAL_SCORE_NAMES) > 0
