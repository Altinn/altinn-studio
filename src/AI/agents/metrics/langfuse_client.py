"""Fetches raw traces and observations from the Langfuse public API."""

import asyncio
import base64
from datetime import datetime
from typing import Any

import httpx

from shared.config import get_config

PAGE_SIZE = 50
REQUEST_TIMEOUT_SECONDS = 30


async def fetch_traces_and_observations(
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
