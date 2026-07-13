"""Fetches raw traces and observations from the Langfuse public API."""

import asyncio
from datetime import datetime
from typing import Any

import httpx

from shared.utils.langfuse_public_api import PAGE_SIZE, create_public_api_client


async def fetch_traces_and_observations(
    trace_window_start: datetime,
    observation_window_start: datetime,
    window_end: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    async with create_public_api_client() as client:
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
