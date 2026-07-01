"""Deletes Langfuse traces older than the retention window via the public API."""

import base64
from datetime import datetime, timedelta, timezone

import httpx

from shared.config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

TRACES_PATH = "/api/public/traces"
PAGE_SIZE = 50
REQUEST_TIMEOUT_SECONDS = 30


async def delete_expired_traces() -> int:
    """Deletes every Langfuse trace older than the retention window. Returns the number of traces deleted."""
    config = get_config()
    auth_header = _create_auth_header(
        config.LANGFUSE_PUBLIC_KEY, config.LANGFUSE_SECRET_KEY
    )
    cutoff = datetime.now(timezone.utc) - timedelta(
        days=config.LANGFUSE_TRACE_RETENTION_DAYS
    )

    async with httpx.AsyncClient(
        base_url=config.LANGFUSE_HOST,
        headers={"Authorization": auth_header},
        timeout=REQUEST_TIMEOUT_SECONDS,
    ) as client:
        return await _delete_traces_before(client, cutoff)


def _create_auth_header(public_key: str | None, secret_key: str | None) -> str:
    if not public_key or not secret_key:
        raise RuntimeError("Langfuse credentials are not configured")
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    return f"Basic {token}"


async def _delete_traces_before(client: httpx.AsyncClient, cutoff: datetime) -> int:
    trace_ids = await _fetch_expired_trace_ids(client, cutoff)
    for start in range(0, len(trace_ids), PAGE_SIZE):
        await _delete_trace_batch(client, trace_ids[start : start + PAGE_SIZE])
    log.info("Deleted %d Langfuse traces older than %s", len(trace_ids), cutoff)
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
        },
    )
    response.raise_for_status()
    page_items = response.json().get("data") or []
    return [item["id"] for item in page_items]


async def _delete_trace_batch(client: httpx.AsyncClient, trace_ids: list[str]) -> None:
    response = await client.request("DELETE", TRACES_PATH, json={"traceIds": trace_ids})
    response.raise_for_status()
