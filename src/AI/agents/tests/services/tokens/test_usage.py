"""Tests for fetching and windowing token usage from Langfuse."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import services.tokens.usage as token_usage
from services.tokens.usage import (
    _token_usage_for_window,
    get_previous_day_token_usage,
)

FIXED_NOW = datetime(2026, 5, 4, 13, 30, tzinfo=UTC)
MIDNIGHT_TODAY = datetime(2026, 5, 4, tzinfo=UTC)
MIDNIGHT_PREVIOUS_DAY = datetime(2026, 5, 3, tzinfo=UTC)


class _FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return FIXED_NOW


def make_raw_trace(trace_id="trace-1", user_id="ttd", metadata=None):
    return {
        "id": trace_id,
        "userId": user_id,
        "metadata": metadata if metadata is not None else {"app_name": "ttd-app"},
        "nonRelevantAttribute": "some-value",
    }


def make_raw_observation(obs_id="obs-1", trace_id="trace-1"):
    return {
        "id": obs_id,
        "traceId": trace_id,
        "startTime": "2026-05-03T10:00:00Z",
        "model": "gpt-4o",
        "usage": {"input": 100, "output": 50, "total": 150},
        "usageDetails": {"input": 100, "output": 50, "total": 150},
        "nonRelevantAttribute": "some-value",
    }


class TestGetPreviousDayTokenUsage:
    @patch.object(token_usage, "datetime", _FixedDatetime)
    @patch.object(token_usage, "_token_usage_for_window", new_callable=AsyncMock)
    async def test_sets_window_end_at_midnight_today(self, mock_token_usage_for_window):
        await get_previous_day_token_usage()

        _, window_end = mock_token_usage_for_window.call_args.args
        assert window_end == MIDNIGHT_TODAY

    @patch.object(token_usage, "datetime", _FixedDatetime)
    @patch.object(token_usage, "_token_usage_for_window", new_callable=AsyncMock)
    async def test_sets_observation_window_start_at_midnight_previous_day(
        self, mock_token_usage_for_window
    ):
        await get_previous_day_token_usage()

        observation_window_start, _ = mock_token_usage_for_window.call_args.args
        assert observation_window_start == MIDNIGHT_PREVIOUS_DAY


class TestTokenUsageForWindow:
    @patch.object(token_usage, "aggregate_token_usage")
    @patch.object(token_usage, "fetch_traces_and_observations", new_callable=AsyncMock)
    async def test_sets_trace_window_start_one_day_before_observation_window_start(
        self, mock_fetch_traces_and_observations, _mock_aggregate_token_usage
    ):
        mock_fetch_traces_and_observations.return_value = ([], [])

        await _token_usage_for_window(MIDNIGHT_PREVIOUS_DAY, MIDNIGHT_TODAY)

        trace_window_start, observation_window_start, window_end = (
            mock_fetch_traces_and_observations.call_args.args
        )
        assert trace_window_start == MIDNIGHT_PREVIOUS_DAY - timedelta(days=1)
        assert observation_window_start == MIDNIGHT_PREVIOUS_DAY
        assert window_end == MIDNIGHT_TODAY

    @patch.object(token_usage, "aggregate_token_usage")
    @patch.object(token_usage, "fetch_traces_and_observations", new_callable=AsyncMock)
    async def test_converts_raw_traces_to_domain_traces(
        self, mock_fetch_traces_and_observations, _mock_aggregate_token_usage
    ):
        mock_fetch_traces_and_observations.return_value = (
            [make_raw_trace(metadata={"app_name": "ttd-app"})],
            [],
        )

        await _token_usage_for_window(MIDNIGHT_PREVIOUS_DAY, MIDNIGHT_TODAY)

        _, traces_by_id, _ = _mock_aggregate_token_usage.call_args.args
        assert traces_by_id["trace-1"] == {
            "id": "trace-1",
            "user_id": "ttd",
            "metadata": {"app_name": "ttd-app"},
        }

    @patch.object(token_usage, "aggregate_token_usage")
    @patch.object(token_usage, "fetch_traces_and_observations", new_callable=AsyncMock)
    async def test_converts_raw_observations_to_domain_observations(
        self, mock_fetch_traces_and_observations, _mock_aggregate_token_usage
    ):
        mock_fetch_traces_and_observations.return_value = ([], [make_raw_observation()])

        await _token_usage_for_window(MIDNIGHT_PREVIOUS_DAY, MIDNIGHT_TODAY)

        observations, _, _ = _mock_aggregate_token_usage.call_args.args
        assert observations == [
            {
                "id": "obs-1",
                "trace_id": "trace-1",
                "start_time": "2026-05-03T10:00:00Z",
                "model": "gpt-4o",
                "usage": {"input": 100, "output": 50, "total": 150},
                "usage_details": {"input": 100, "output": 50, "total": 150},
            }
        ]

    @patch.object(token_usage, "aggregate_token_usage")
    @patch.object(token_usage, "fetch_traces_and_observations", new_callable=AsyncMock)
    async def test_maps_traces_by_id(
        self, mock_fetch_traces_and_observations, _mock_aggregate_token_usage
    ):
        mock_fetch_traces_and_observations.return_value = (
            [make_raw_trace(trace_id="trace-1"), make_raw_trace(trace_id="trace-2")],
            [],
        )

        await _token_usage_for_window(MIDNIGHT_PREVIOUS_DAY, MIDNIGHT_TODAY)

        _, traces_by_id, _ = _mock_aggregate_token_usage.call_args.args
        assert set(traces_by_id) == {"trace-1", "trace-2"}
