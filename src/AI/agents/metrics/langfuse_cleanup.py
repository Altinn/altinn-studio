"""Deletes Langfuse traces older than a retention window via the public API."""

from datetime import datetime, timedelta, timezone

import httpx

from metrics.langfuse_client import (
    PAGE_SIZE,
    REQUEST_TIMEOUT_SECONDS,
    _create_auth_header,
)
from shared.config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

TRACES_PATH = "/api/public/traces"
RETENTION_DAYS = 90 # Todo: move to base config, enabling env variable configuration. Default = 90


async def delete_expired_traces() -> int:
    """Deletes every Langfuse trace older than the retention window. Returns the number of traces deleted."""
    config = get_config()
    auth_header = _create_auth_header(
        config.LANGFUSE_PUBLIC_KEY, config.LANGFUSE_SECRET_KEY
    )
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)

    async with httpx.AsyncClient(
        base_url=config.LANGFUSE_HOST,
        headers={"Authorization": auth_header},
        timeout=REQUEST_TIMEOUT_SECONDS,
    ) as client:
        return await _delete_traces_before(client, cutoff)


async def _delete_traces_before(client: httpx.AsyncClient, cutoff: datetime) -> int:
    deleted_count = 0
    while True:
        trace_ids = await _fetch_oldest_trace_ids(client, cutoff)
        if not trace_ids:
            log.info("Deleted %d Langfuse traces older than %s", deleted_count, cutoff)
            return deleted_count
        await _delete_trace_batch(client, trace_ids)
        deleted_count += len(trace_ids)


async def _fetch_oldest_trace_ids(
    client: httpx.AsyncClient, cutoff: datetime
) -> list[str]:
    response = await client.get(
        TRACES_PATH,
        params={"toTimestamp": cutoff.isoformat(), "limit": PAGE_SIZE, "page": 1},
    )
    response.raise_for_status()
    page_items = response.json().get("data") or []
    return [item["id"] for item in page_items]


async def _delete_trace_batch(
    client: httpx.AsyncClient, trace_ids: list[str]
) -> None:
    response = await client.request("DELETE", TRACES_PATH, json={"traceIds": trace_ids})
    response.raise_for_status()
