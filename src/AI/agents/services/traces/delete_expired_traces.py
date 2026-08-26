"""Deletes Langfuse traces older than the retention window via the public API."""

from datetime import datetime, timedelta, timezone

import httpx

from shared.config import get_config
from shared.utils.langfuse_public_api import (
    create_public_api_client,
    fetch_observations,
    root_span_filter,
)
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

# Langfuse docs advises against more than 30-50 trace ids per DELETE request.
DELETE_BATCH_SIZE = 30
TRACES_PATH = "/api/public/traces"
# The listing API requires a lower bound; the cutoff drives what is deleted.
EARLIEST_START_TIME = "2020-01-01T00:00:00Z"


async def delete_expired_traces() -> int:
    """Requests deletion of every production Langfuse trace older than the retention window. Returns the number of traces submitted for deletion."""
    cutoff = datetime.now(timezone.utc) - timedelta(
        days=get_config().LANGFUSE_TRACE_RETENTION_DAYS
    )
    async with create_public_api_client() as client:
        return await _delete_traces_before(client, cutoff)


async def _delete_traces_before(client: httpx.AsyncClient, cutoff: datetime) -> int:
    trace_ids = await _fetch_expired_trace_ids(client, cutoff)
    for start in range(0, len(trace_ids), DELETE_BATCH_SIZE):
        await _delete_trace_batch(client, trace_ids[start : start + DELETE_BATCH_SIZE])
    log.info(
        "Requested deletion of %d Langfuse traces older than %s",
        len(trace_ids),
        cutoff,
    )
    return len(trace_ids)


async def _fetch_expired_trace_ids(
    client: httpx.AsyncClient, cutoff: datetime
) -> list[str]:
    """One id per expired trace. Root spans repeat per trace, so dedupe."""
    root_spans = await fetch_observations(
        client,
        {
            "filter": root_span_filter(),
            "fields": "core",
            "fromStartTime": EARLIEST_START_TIME,
            "toStartTime": cutoff.isoformat(),
            "environment": ["prod", "production"],
        },
    )
    seen: dict[str, None] = {}
    for span in root_spans:
        trace_id = span.get("traceId")
        if trace_id:
            seen.setdefault(trace_id, None)
    return list(seen)


async def _delete_trace_batch(client: httpx.AsyncClient, trace_ids: list[str]) -> None:
    response = await client.request("DELETE", TRACES_PATH, json={"traceIds": trace_ids})
    response.raise_for_status()
