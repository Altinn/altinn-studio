"""Fetches LLM token usage from Langfuse and aggregates into a list of cost objects
that can be used to bill users.

Traces contain metadata (service owner ID, app name).
Observations contain LLM metrics (token usage, model name), and are children of traces.
"""

import asyncio
import base64
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from metrics.aggregate import (
    DailyTokenUsageRow,
    Observation,
    Trace,
    aggregate_token_usage,
)
from shared.config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

PAGE_SIZE = 50
REQUEST_TIMEOUT_SECONDS = 30


async def get_previous_day_token_usage() -> list[DailyTokenUsageRow]:
    """Fetch and aggregate LLM token usage rows for the previous UTC day.

    Raises:
        RuntimeError: If Langfuse credentials are missing (caller should
            map to HTTP 503).
    """
    trace_window_start, observation_window_start, window_end = (
        _previous_day_query_windows()
    )
    traces, observations = await _fetch_traces_and_observations(
        trace_window_start, observation_window_start, window_end
    )

    trace_objects = [_as_trace(item) for item in traces]
    traces_by_id = {trace["id"]: trace for trace in trace_objects}
    observation_objects = [_as_observation(item) for item in observations]

    loaded_at = datetime.now(UTC).isoformat(timespec="seconds")
    return aggregate_token_usage(observation_objects, traces_by_id, loaded_at)


async def _fetch_traces_and_observations(
    trace_window_start: datetime,
    observation_window_start: datetime,
    window_end: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    config = get_config()
    auth_header = _create_auth_header(
        config.LANGFUSE_PUBLIC_KEY, config.LANGFUSE_SECRET_KEY
    )

    async with httpx.AsyncClient(
        base_url=config.LANGFUSE_HOST,
        headers={"Authorization": auth_header},
        timeout=REQUEST_TIMEOUT_SECONDS,
    ) as client:
        traces, observations = await asyncio.gather(
            _fetch_all_pages(
                client,
                "/api/public/traces",
                {
                    "fromTimestamp": trace_window_start.isoformat(),
                    "toTimestamp": window_end.isoformat(),
                },
            ),
            _fetch_all_pages(
                client,
                "/api/public/observations",
                {
                    "type": "GENERATION",
                    "fromStartTime": observation_window_start.isoformat(),
                    "toStartTime": window_end.isoformat(),
                },
            ),
        )

    return traces, observations


def _create_auth_header(public_key: str | None, secret_key: str | None) -> str:
    if not public_key or not secret_key:
        raise RuntimeError("Langfuse credentials are not configured")
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    return f"Basic {token}"


def _previous_day_query_windows() -> tuple[datetime, datetime, datetime]:
    """Build the query windows for fetching the previous UTC day's data.

    A workflow can start just before midnight but log its observations after
    midnight. Such an observation belongs to the new day yet points to a trace
    from the day before, so the trace window reaches back an extra day to keep
    aggregation from failing on the missing trace.

    Returns:
        trace_window_start: two days before window_end.
        observation_window_start: one day before window_end.
        window_end: midnight (00:00 UTC) at the start of the current day.
    """
    now = datetime.now(UTC)
    window_end = datetime(now.year, now.month, now.day, tzinfo=UTC)
    observation_window_start = window_end - timedelta(days=1)
    trace_window_start = window_end - timedelta(days=2)
    return trace_window_start, observation_window_start, window_end


async def _fetch_all_pages(
    client: httpx.AsyncClient,
    path: str,
    params: dict[str, Any],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page_number = 1
    while True:
        response = await client.get(
            path, params={**params, "limit": PAGE_SIZE, "page": page_number}
        )
        response.raise_for_status()
        page_items = response.json().get("data") or []
        items.extend(page_items)
        if len(page_items) < PAGE_SIZE:
            break
        page_number += 1
    return items


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
