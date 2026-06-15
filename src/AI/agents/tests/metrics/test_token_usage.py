"""Tests for metrics.token_usage helpers."""

import base64
from datetime import UTC, datetime
from unittest.mock import patch

import httpx
import pytest

from metrics import token_usage
from metrics.token_usage import (
    PAGE_SIZE,
    _create_auth_header,
    _previous_utc_day_window,
    get_previous_day_token_usage,
)


class TestPreviousUtcDayWindow:
    def test_returns_yesterday_midnight_to_today_midnight_utc(self):
        fixed_now = datetime(2026, 5, 11, 14, 37, 12, tzinfo=UTC)
        with patch("metrics.token_usage.datetime") as datetime_mock:
            datetime_mock.now.return_value = fixed_now
            datetime_mock.side_effect = datetime

            window_start, window_end = _previous_utc_day_window()

        assert window_start == datetime(2026, 5, 10, tzinfo=UTC)
        assert window_end == datetime(2026, 5, 11, tzinfo=UTC)

    def test_handles_month_boundary(self):
        fixed_now = datetime(2026, 6, 1, 0, 5, 0, tzinfo=UTC)
        with patch("metrics.token_usage.datetime") as datetime_mock:
            datetime_mock.now.return_value = fixed_now
            datetime_mock.side_effect = datetime

            window_start, window_end = _previous_utc_day_window()

        assert window_start == datetime(2026, 5, 31, tzinfo=UTC)
        assert window_end == datetime(2026, 6, 1, tzinfo=UTC)


class TestBasicAuthHeader:
    def test_encodes_public_and_secret_key(self):
        header = _create_auth_header("pk-123", "sk-abc")
        expected_token = base64.b64encode(b"pk-123:sk-abc").decode()
        assert header == f"Basic {expected_token}"

    def test_raises_when_public_key_missing(self):
        with pytest.raises(RuntimeError, match="credentials are not configured"):
            _create_auth_header(None, "sk-abc")

    def test_raises_when_secret_key_missing(self):
        with pytest.raises(RuntimeError, match="credentials are not configured"):
            _create_auth_header("pk-123", None)


class TestFetchPreviousDayTokenUsage:
    """End-to-end test that drives the public function through a fake httpx
    transport, exercising pagination and the camelCase→snake_case mapping into
    aggregate_token_usage."""

    def test_paginates_and_aggregates(self):
        traces_pages = [
            [_trace_payload("trace-1", "ttd", "my-app")],
        ]
        observations_pages = [
            [_observation_payload(f"obs-{i}", "trace-1") for i in range(PAGE_SIZE)],
            [_observation_payload("obs-final", "trace-1")],
        ]
        handler = _RequestHandler(traces_pages, observations_pages)

        with _patched_httpx_client(handler), _patched_config():
            import asyncio

            rows = asyncio.run(get_previous_day_token_usage())

        assert len(rows) == 1
        row = rows[0]
        assert row["serviceownercode"] == "ttd"
        assert row["serviceresourceid"] == "my-app"
        assert row["input_tokens"] == 100 * (PAGE_SIZE + 1)
        assert row["output_tokens"] == 50 * (PAGE_SIZE + 1)
        assert row["total_tokens"] == 150 * (PAGE_SIZE + 1)
        assert handler.requests_for("/api/public/observations") == 2
        assert handler.requests_for("/api/public/traces") == 1
        assert (
            handler.last_auth_header
            == "Basic " + base64.b64encode(b"pk-123:sk-abc").decode()
        )

    def test_fetches_traces_and_observations_over_the_same_window(self):
        handler = _RequestHandler(
            [[_trace_payload("trace-1", "ttd", "my-app")]],
            [[_observation_payload("obs-1", "trace-1")]],
        )

        with _patched_httpx_client(handler), _patched_config():
            import asyncio

            asyncio.run(get_previous_day_token_usage())

        trace_params = handler.params_by_path["/api/public/traces"]
        observation_params = handler.params_by_path["/api/public/observations"]
        assert trace_params["fromTimestamp"] == observation_params["fromStartTime"]
        assert trace_params["toTimestamp"] == observation_params["toStartTime"]


def _trace_payload(trace_id: str, user_id: str, app_name: str) -> dict:
    return {
        "id": trace_id,
        "userId": user_id,
        "metadata": {"app_name": app_name},
    }


def _observation_payload(obs_id: str, trace_id: str) -> dict:
    return {
        "id": obs_id,
        "traceId": trace_id,
        "startTime": "2026-05-10T10:00:00Z",
        "model": "gpt-4o",
        "usage": {"input": 100, "output": 50, "total": 150},
        "usageDetails": {"input": 100, "output": 50, "total": 150},
    }


class _RequestHandler:
    def __init__(self, traces_pages, observations_pages):
        self._pages_by_path = {
            "/api/public/traces": traces_pages,
            "/api/public/observations": observations_pages,
        }
        self._call_counts = {path: 0 for path in self._pages_by_path}
        self.last_auth_header: str | None = None
        self.params_by_path: dict[str, dict] = {}

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.last_auth_header = request.headers.get("authorization")
        self.params_by_path[request.url.path] = dict(request.url.params)
        pages = self._pages_by_path[request.url.path]
        page_number = int(request.url.params["page"])
        self._call_counts[request.url.path] += 1
        page_items = pages[page_number - 1] if page_number - 1 < len(pages) else []
        return httpx.Response(200, json={"data": page_items})

    def requests_for(self, path: str) -> int:
        return self._call_counts[path]


def _patched_httpx_client(handler):
    original_async_client = httpx.AsyncClient

    def make_client(**kwargs):
        kwargs.pop("timeout", None)
        return original_async_client(transport=httpx.MockTransport(handler), **kwargs)

    return patch.object(token_usage.httpx, "AsyncClient", side_effect=make_client)


def _patched_config():
    fake_config = type(
        "FakeConfig",
        (),
        {
            "LANGFUSE_PUBLIC_KEY": "pk-123",
            "LANGFUSE_SECRET_KEY": "sk-abc",
            "LANGFUSE_HOST": "https://langfuse.example.com",
        },
    )()
    return patch("metrics.token_usage.get_config", return_value=fake_config)
