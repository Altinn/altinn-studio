"""The trace lookup reads observation rows and takes `traceId` off the root span."""

from __future__ import annotations

import json

import pytest

from benchmarks.lf_api import LangfuseApi


class _Api(LangfuseApi):
    """Bypass __init__ so no credentials or HTTP client are needed."""

    def __init__(self, pages):
        self._pages = list(pages)
        self.calls = []

    def _get(self, path, **params):
        self.calls.append((path, params))
        return self._pages.pop(0) if self._pages else {"data": [], "meta": {}}


def _row(session_id, trace_id, name="Altinity Agent Workflow"):
    return {"traceId": trace_id, "name": name, "metadata": {"session_id": session_id}}


class TestFindTraceForSession:
    def test_reads_the_trace_id_off_the_matching_root_span(self):
        api = _Api([{"data": [_row("sess-a", "trace-a"), _row("sess-b", "trace-b")], "meta": {}}])

        assert api.find_trace_for_session("sess-b", "Altinity Agent Workflow", "2026-01-01") == "trace-b"

    def test_queries_the_observations_endpoint(self):
        api = _Api([{"data": [_row("sess-a", "trace-a")], "meta": {}}])
        api.find_trace_for_session("sess-a", "Altinity Agent Workflow", "2026-01-01")

        path, params = api.calls[0]
        assert path == "/api/public/v2/observations"

    def test_asks_for_metadata_and_a_bounded_window(self):
        """metadata is outside the default field set, and the window is required."""
        api = _Api([{"data": [_row("sess-a", "trace-a")], "meta": {}}])
        api.find_trace_for_session("sess-a", "Altinity Agent Workflow", "2026-01-01")

        _, params = api.calls[0]
        assert "metadata" in params["fields"]
        assert params["fromStartTime"] == "2026-01-01"
        assert params["toStartTime"]
        assert params["name"] == "Altinity Agent Workflow"

    def test_restricts_the_query_to_root_observations(self):
        """Child observations would otherwise use up the page budget before the
        root span carrying the session id is reached."""
        api = _Api([{"data": [_row("sess-a", "trace-a")], "meta": {}}])
        api.find_trace_for_session("sess-a", "Altinity Agent Workflow", "2026-01-01")

        _, params = api.calls[0]
        assert json.loads(params["filter"]) == [
            {"column": "isRootObservation", "operator": "=", "value": True, "type": "boolean"}
        ]

    def test_follows_the_cursor_to_the_next_page(self):
        api = _Api(
            [
                {"data": [_row("other", "trace-x")], "meta": {"cursor": "CURSOR1"}},
                {"data": [_row("sess-a", "trace-a")], "meta": {}},
            ]
        )

        assert api.find_trace_for_session("sess-a", "Altinity Agent Workflow", "2026-01-01") == "trace-a"
        assert api.calls[1][1]["cursor"] == "CURSOR1"

    def test_no_match_returns_none(self):
        api = _Api([{"data": [_row("other", "trace-x")], "meta": {}}])

        assert api.find_trace_for_session("missing", "Altinity Agent Workflow", "2026-01-01") is None

    def test_stops_instead_of_paging_forever(self):
        """A cursor that never clears must not loop indefinitely."""
        api = _Api([{"data": [_row("other", "t")], "meta": {"cursor": "SAME"}} for _ in range(50)])

        assert api.find_trace_for_session("missing", "Altinity Agent Workflow", "2026-01-01") is None
        assert len(api.calls) <= 10
