"""Deletes Langfuse traces older than the retention window via the public API."""

from datetime import datetime, timedelta, timezone

import httpx

from shared.config import get_config
from shared.utils.langfuse_public_api import PAGE_SIZE, create_public_api_client
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

# Langfuse docs advises against more than 30-50 trace ids per DELETE request.
DELETE_BATCH_SIZE = 30
TRACES_PATH = "/api/public/traces"


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
    trace_ids: list[str] = []
    page_number = 1
    while True:
        page_trace_ids = await _fetch_trace_id_page(client, cutoff, page_number)
        trace_ids.extend(page_trace_ids)
        if len(page_trace_ids) < PAGE_SIZE:
            return trace_ids
        page_number += 1


async def _fetch_trace_id_page(
    client: httpx.AsyncClient, cutoff: datetime, page_number: int
) -> list[str]:
    response = await client.get(
        TRACES_PATH,
        params={
            "toTimestamp": cutoff.isoformat(),
            "limit": PAGE_SIZE,
            "page": page_number,
            "environment": ["prod", "production"],
        },
    )
    response.raise_for_status()
    page_items = response.json().get("data") or []
    return [item["id"] for item in page_items]


async def _delete_trace_batch(client: httpx.AsyncClient, trace_ids: list[str]) -> None:
    response = await client.request("DELETE", TRACES_PATH, json={"traceIds": trace_ids})
    response.raise_for_status()
