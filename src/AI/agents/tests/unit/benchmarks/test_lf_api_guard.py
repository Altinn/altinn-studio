"""Langfuse keys a dataset run by name, so re-using one merges new items into the old run."""

from __future__ import annotations

import pytest

from benchmarks.lf_api import assert_run_is_new


class _Api:
    def __init__(self, names):
        self._names = names

    def _get(self, path, **params):
        return {"data": [{"name": name} for name in self._names]}


def test_an_existing_name_is_refused():
    with pytest.raises(SystemExit, match="merges the results"):
        assert_run_is_new(_Api(["claude-sonnet-5 baseline"]), "Loop/traces", "claude-sonnet-5 baseline")


def test_a_fresh_name_is_allowed():
    assert_run_is_new(_Api(["other"]), "Loop/traces", "claude-sonnet-5 baseline")


def test_a_prefix_match_is_not_a_collision():
    """The UI appends a timestamp, so a longer name is a different run."""
    assert_run_is_new(
        _Api(["claude-sonnet-5 baseline - 2026-09-07T12:49:59"]),
        "Loop/traces",
        "claude-sonnet-5 baseline",
    )
