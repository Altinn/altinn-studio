"""A benchmark trace declares its own dataset-run membership."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from shared.models.experiment import (
    EXPERIMENT_DATASET_ID,
    EXPERIMENT_DESCRIPTION,
    EXPERIMENT_ID,
    EXPERIMENT_ITEM_ID,
    EXPERIMENT_ITEM_ROOT_OBSERVATION_ID,
    EXPERIMENT_NAME,
    ExperimentContext,
)


def _context(**overrides) -> ExperimentContext:
    base = dict(
        experimentId="exp-1",
        experimentName="nightly-2026-08-21",
        datasetId="ds-1",
        itemId="item-1",
    )
    base.update(overrides)
    return ExperimentContext(**base)


class TestSpanAttributes:
    def test_emits_the_attribute_names_langfuse_reads(self):
        attributes = _context().span_attributes("root-span-id")

        assert attributes[EXPERIMENT_ID] == "exp-1"
        assert attributes[EXPERIMENT_NAME] == "nightly-2026-08-21"
        assert attributes[EXPERIMENT_DATASET_ID] == "ds-1"
        assert attributes[EXPERIMENT_ITEM_ID] == "item-1"

    def test_root_observation_id_is_the_span_it_sits_on(self):
        """Langfuse requires this to equal the root span's own id."""
        attributes = _context().span_attributes("root-span-id")

        assert attributes[EXPERIMENT_ITEM_ROOT_OBSERVATION_ID] == "root-span-id"

    def test_description_is_omitted_rather_than_sent_empty(self):
        assert EXPERIMENT_DESCRIPTION not in _context().span_attributes("r")
        assert EXPERIMENT_DESCRIPTION not in _context(description="").span_attributes("r")

    def test_description_is_included_when_set(self):
        attributes = _context(description="all benchmarks").span_attributes("r")

        assert attributes[EXPERIMENT_DESCRIPTION] == "all benchmarks"

    def test_every_value_is_a_string(self):
        """OTel attributes are typed; a non-string would be dropped."""
        attributes = _context(description="d").span_attributes("r")

        assert all(isinstance(v, str) for v in attributes.values())

    def test_the_identifying_fields_are_required(self):
        with pytest.raises(ValidationError):
            ExperimentContext(experimentName="n", datasetId="d", itemId="i")


class TestRunnerWiring:
    def test_the_agent_stamps_the_attributes_on_the_root_span(self, monkeypatch):
        """Without this the trace is never part of the run."""
        from types import SimpleNamespace
        from agents.graph import runner

        recorded: dict[str, str] = {}
        span = SimpleNamespace(
            is_recording=lambda: True,
            set_attribute=lambda k, v: recorded.__setitem__(k, v),
        )
        monkeypatch.setattr(runner.otel_trace, "get_current_span", lambda: span)

        state = SimpleNamespace(experiment=_context())
        runner._mark_as_experiment_item(state, SimpleNamespace(id="root-1"))

        assert recorded[EXPERIMENT_NAME] == "nightly-2026-08-21"
        assert recorded[EXPERIMENT_ITEM_ROOT_OBSERVATION_ID] == "root-1"

    def test_an_ordinary_run_stamps_nothing(self, monkeypatch):
        from types import SimpleNamespace
        from agents.graph import runner

        recorded: dict[str, str] = {}
        span = SimpleNamespace(
            is_recording=lambda: True,
            set_attribute=lambda k, v: recorded.__setitem__(k, v),
        )
        monkeypatch.setattr(runner.otel_trace, "get_current_span", lambda: span)

        runner._mark_as_experiment_item(SimpleNamespace(experiment=None), SimpleNamespace(id="r"))

        assert recorded == {}

    def test_run_once_actually_calls_it(self):
        """Guards the call site: the helper is useless if nothing invokes it."""
        import inspect
        from agents.graph import runner

        assert "_mark_as_experiment_item(state, root_span)" in inspect.getsource(runner.run_once)
