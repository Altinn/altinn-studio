"""Langfuse keys a dataset run by name, so re-using one merges new items into the old run."""

from __future__ import annotations

import pytest

from benchmarks.lf_api import assert_run_is_new


class _Api:
    def __init__(self, names, *, per_page=50):
        self._names = names
        self._per_page = per_page
        self.pages_read = 0

    def _get(self, path, **params):
        self.pages_read += 1
        page = params.get("page", 1)
        start = (page - 1) * self._per_page
        return {"data": [{"name": name} for name in self._names[start:start + self._per_page]]}


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


def test_a_run_on_a_later_page_is_still_found():
    """The guard read one page of fifty, so a run past it merged silently."""
    api = _Api(["filler"] * 50 + ["claude-sonnet-5 baseline"])

    with pytest.raises(SystemExit, match="merges the results"):
        assert_run_is_new(api, "Loop/traces", "claude-sonnet-5 baseline")


def test_the_guard_stops_reading_once_a_page_comes_back_empty():
    api = _Api(["other"])

    assert_run_is_new(api, "Loop/traces", "claude-sonnet-5 baseline")

    assert api.pages_read == 2


def test_a_dataset_name_is_url_encoded():
    seen = []

    class _Recording(_Api):
        def _get(self, path, **params):
            seen.append(path)
            return super()._get(path, **params)

    assert_run_is_new(_Recording([]), "Gates/scope check", "fresh")

    assert "Gates%2Fscope%20check" in seen[0]
