"""Aggregates LLM token usage from Langfuse into a list of cost objects
that can be used to bill users.

Traces contain metadata (service owner ID, app name).
Observations contain LLM metrics (token usage, model name), and are children of traces.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from metrics.aggregate import (
    DailyTokenUsageRow,
    Observation,
    Trace,
    aggregate_token_usage,
)
from metrics.langfuse_client import fetch_traces_and_observations

# Workflows starting seconds before midnight will create a trace at day 0, and observations at day 1.
# The trace buffer makes sure we fetch all relevant traces before aggregating.
TRACE_LOOKBACK_BUFFER = timedelta(days=1)


async def get_previous_day_token_usage() -> list[DailyTokenUsageRow]:
    """Fetch and aggregate LLM token usage rows for the previous UTC day."""
    now = datetime.now(UTC)
    window_end = datetime(now.year, now.month, now.day, tzinfo=UTC)
    observation_window_start = window_end - timedelta(days=1)
    return await _token_usage_for_window(observation_window_start, window_end)


async def _token_usage_for_window(
    observation_window_start: datetime, window_end: datetime
) -> list[DailyTokenUsageRow]:
    """Fetch and aggregate token usage rows for an arbitrary UTC window."""
    trace_window_start = observation_window_start - TRACE_LOOKBACK_BUFFER
    traces, observations = await fetch_traces_and_observations(
        trace_window_start, observation_window_start, window_end
    )

    trace_objects = [_as_trace(item) for item in traces]
    traces_by_id = {trace["id"]: trace for trace in trace_objects}
    observation_objects = [_as_observation(item) for item in observations]

    loaded_at = datetime.now(UTC).isoformat(timespec="seconds")
    return aggregate_token_usage(observation_objects, traces_by_id, loaded_at)


def _as_trace(payload: dict[str, Any]) -> Trace:
    return {
        "id": payload["id"],
        "user_id": payload["userId"],
        "metadata": payload.get("metadata") or {},
    }


def _as_observation(payload: dict[str, Any]) -> Observation:
    return {
        "id": payload["id"],
        "trace_id": payload["traceId"],
        "start_time": payload["startTime"],
        "model": payload.get("model"),
        "usage": payload.get("usage"),
        "usage_details": payload.get("usageDetails") or {},
    }
