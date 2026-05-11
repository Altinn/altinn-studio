"""Fetch LLM token usage from Langfuse and aggregate into Studio cost-schema rows."""

import asyncio
import base64
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any

import httpx

from metrics.aggregate import DailyTokenUsageRow, aggregate_token_usage
from shared.config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

PAGE_SIZE = 50
REQUEST_TIMEOUT_SECONDS = 30


async def fetch_previous_day_token_usage() -> list[DailyTokenUsageRow]:
    """Fetch and aggregate LLM token usage rows for the previous UTC day.

    Raises:
        RuntimeError: If Langfuse credentials are missing (caller should
            map to HTTP 503).
    """
    config = get_config()
    auth_header = _basic_auth_header(
        config.LANGFUSE_PUBLIC_KEY, config.LANGFUSE_SECRET_KEY
    )
    base_url = config.LANGFUSE_HOST

    window_start, window_end = _previous_utc_day_window()
    loaded_at = (
        datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    )

    async with httpx.AsyncClient(
        base_url=base_url,
        headers={"Authorization": auth_header},
        timeout=REQUEST_TIMEOUT_SECONDS,
    ) as client:
        traces, observations = await asyncio.gather(
            _fetch_all_pages(
                client,
                "/api/public/traces",
                {
                    "fromTimestamp": _to_iso(window_start),
                    "toTimestamp": _to_iso(window_end),
                },
            ),
            _fetch_all_pages(
                client,
                "/api/public/observations",
                {
                    "type": "GENERATION",
                    "fromStartTime": _to_iso(window_start),
                    "toStartTime": _to_iso(window_end),
                },
            ),
        )

    traces_by_id = {trace.id: trace for trace in (_as_trace(item) for item in traces)}
    observation_objects = [_as_observation(item) for item in observations]
    return aggregate_token_usage(observation_objects, traces_by_id, loaded_at)


def _basic_auth_header(public_key: str | None, secret_key: str | None) -> str:
    if not public_key or not secret_key:
        raise RuntimeError("Langfuse credentials are not configured")
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    return f"Basic {token}"


def _previous_utc_day_window() -> tuple[datetime, datetime]:
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    yesterday_start = today_start - timedelta(days=1)
    return yesterday_start, today_start


def _to_iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


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


def _as_trace(payload: dict[str, Any]) -> SimpleNamespace:
    return SimpleNamespace(
        id=payload.get("id"),
        user_id=payload.get("userId"),
        metadata=payload.get("metadata") or {},
    )


def _as_observation(payload: dict[str, Any]) -> SimpleNamespace:
    return SimpleNamespace(
        id=payload.get("id"),
        trace_id=payload.get("traceId"),
        start_time=payload.get("startTime"),
        model=payload.get("model"),
        usage=payload.get("usage"),
        usage_details=payload.get("usageDetails") or {},
    )
