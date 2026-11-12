"""The benchmark tools read Langfuse through the APIs that Langfuse v4 keeps."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import cast

import httpx

from benchmarks import remote, status
from benchmarks.harvest import LOOP_CALL_NAME, TraceReader, read_trace
from benchmarks.lf_api import LangfuseApi

ASSISTANT_ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIRS = ("agents", "api", "benchmarks", "scripts", "services", "shared")

# Read endpoints that Langfuse v4 removes. Paths are relative to /api/public.
DEPRECATED_PATHS = [
    r"/api/public/traces/",  # GET /traces/{id}. DELETE /traces stays.
    r"/api/public/observations\b",
    r"/api/public/sessions\b",
    r"/api/public/metrics\b",
    r"/api/public/v2/scores\b",
    r"/api/public/scores/",
    r"/api/public/datasets/[^\"']*/runs",
    r"/api/public/dataset-run-items\b",
    r"/api/public/ingestion\b",
]


class TestNoDeprecatedEndpoints:
    def test_no_source_file_calls_an_endpoint_that_v4_removes(self):
        found = []
        for directory in SOURCE_DIRS:
            for path in (ASSISTANT_ROOT / directory).rglob("*.py"):
                text = path.read_text(encoding="utf-8")
                found += [
                    f"{path.relative_to(ASSISTANT_ROOT)}: {pattern}"
                    for pattern in DEPRECATED_PATHS
                    if re.search(pattern, text)
                ]
        assert found == []


def _reader(rows: list[dict], requested: list[str]) -> TraceReader:
    def handle(request: httpx.Request) -> httpx.Response:
        requested.append(request.url.path)
        assert request.url.path == "/api/public/v2/observations"
        return httpx.Response(200, json={"data": rows, "meta": {}})

    return TraceReader(httpx.Client(base_url="https://langfuse.test", transport=httpx.MockTransport(handle)))


class TestHarvest:
    def test_the_goal_and_turns_come_from_observation_rows(self):
        rows = [
            {
                "id": "root",
                "parentObservationId": None,
                "isRootObservation": True,
                "startTime": "2026-11-11T10:00:00Z",
                "name": "Altinity Agent Workflow",
                "input": json.dumps({"user_goal": "  Add a field  "}),
            },
            {
                "id": "llm",
                "parentObservationId": "root",
                "startTime": "2026-11-11T10:00:01Z",
                "name": LOOP_CALL_NAME,
                "input": json.dumps({"available_tools": ["read_file"], "system_prompt": "be good"}),
                "output": json.dumps({"text": "", "tool_calls": [{"name": "read_file", "input": {"path": "a"}}]}),
            },
            {
                "id": "tool",
                "parentObservationId": "llm",
                "startTime": "2026-11-11T10:00:02Z",
                "name": "tool_read_file",
                "level": "DEFAULT",
                "output": json.dumps({"content": "file body", "is_error": False}),
            },
        ]
        requested: list[str] = []
        harvest = read_trace(_reader(rows, requested), "trace-1")

        assert harvest.goal == "Add a field"
        assert harvest.available_tools == ["read_file"]
        assert harvest.system_prompt == "be good"
        assert harvest.turns[0].calls[0]["name"] == "read_file"
        assert harvest.turns[0].results[0]["content"] == "file body"
        assert requested == ["/api/public/v2/observations"], "one page, no per-row or per-trace lookups"

    def test_output_that_is_not_json_stays_a_string(self):
        rows = [
            {"id": "root", "parentObservationId": None, "input": "not json"},
        ]
        harvest = read_trace(_reader(rows, []), "trace-1")

        assert harvest.goal == ""


class _FakeApi:
    def __init__(self, routes: dict[str, dict]):
        self.routes = routes
        self.requested: list[tuple[str, dict]] = []

    def _get(self, path: str, **params):
        self.requested.append((path, params))
        for prefix, body in self.routes.items():
            if path.startswith(prefix):
                return body
        raise AssertionError(f"unexpected request {path}")


class TestStatusRuns:
    def _api(self, environment: str, scores: list[dict]):
        return _FakeApi(
            {
                "/api/public/v2/datasets/": {"id": "ds-1"},
                "/api/public/experiments": {"data": [{"id": "exp-1", "name": "run-1"}]},
                "/api/public/experiment-items": {"data": [{"traceId": "t-1", "environment": environment}]},
                "/api/public/v3/scores": {"data": scores},
            }
        )

    def test_a_run_from_the_sdk_runner_is_marked_sdk(self):
        api = self._api("sdk-experiment", [])
        assert status._runs(cast(LangfuseApi, api), "Gates/scope") == ["sdk:run-1"]

    def test_other_runs_are_marked_by_whether_they_carry_scores(self):
        assert status._runs(cast(LangfuseApi, self._api("production", [{"id": "s"}])), "x") == ["ui:run-1"]
        assert status._runs(cast(LangfuseApi, self._api("production", [])), "x") == ["ui-unscored:run-1"]


class TestRemoteComments:
    def test_comments_come_from_scores_v3_with_details(self):
        api = _FakeApi({"/api/public/v3/scores": {"data": [{"name": "gate_verdict", "comment": "declined"}]}})

        assert remote._comments(cast(LangfuseApi, api), "t-1") == {"gate_verdict": "declined"}
        path, params = api.requested[0]
        assert path == "/api/public/v3/scores"
        assert params["fields"] == "details", "the comment is in the details field group"
