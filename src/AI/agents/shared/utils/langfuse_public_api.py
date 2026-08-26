"""Builds an authenticated httpx client for the Langfuse public REST API."""

import base64
import json
from typing import Any

import httpx

from shared.config import get_config

PAGE_SIZE = 50
REQUEST_TIMEOUT_SECONDS = 30
OBSERVATIONS_PATH = "/api/public/v2/observations"
MAX_PAGES = 1000


def create_public_api_client() -> httpx.AsyncClient:
    config = get_config()
    auth_header = _basic_auth_header(
        config.LANGFUSE_PUBLIC_KEY, config.LANGFUSE_SECRET_KEY
    )
    return httpx.AsyncClient(
        base_url=config.LANGFUSE_HOST,
        headers={"Authorization": auth_header},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )


def _basic_auth_header(public_key: str | None, secret_key: str | None) -> str:
    if not public_key or not secret_key:
        raise RuntimeError("Langfuse credentials are not configured")
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    return f"Basic {token}"


def root_span_filter() -> str:
    """One row per trace: the root span carries its id, user and metadata."""
    return json.dumps(
        [{"column": "isRootObservation", "operator": "=", "value": True, "type": "boolean"}]
    )


def type_filter(observation_type: str) -> str:
    return json.dumps(
        [{"column": "type", "operator": "=", "value": observation_type, "type": "string"}]
    )


class ObservationsTruncated(RuntimeError):
    """The window holds more rows than the page cap allows."""


async def fetch_observations(
    client: httpx.AsyncClient, params: dict[str, Any]
) -> list[dict[str, Any]]:
    """Page the observations API, which is cursor-based.

    Raises `ObservationsTruncated` rather than returning a partial list: a
    caller that deletes or reports on what it gets back cannot tell the
    difference, and would under-delete or under-report in silence.
    """
    items: list[dict[str, Any]] = []
    cursor: str | None = None
    for _ in range(MAX_PAGES):
        page_params = {**params, "limit": PAGE_SIZE}
        if cursor:
            page_params["cursor"] = cursor
        response = await client.get(OBSERVATIONS_PATH, params=page_params)
        response.raise_for_status()
        body = response.json()
        page_items = body.get("data") or []
        items.extend(page_items)
        cursor = (body.get("meta") or {}).get("cursor")
        if not cursor or not page_items:
            return items
    raise ObservationsTruncated(
        f"more than {MAX_PAGES * PAGE_SIZE} observations in the requested window; "
        "narrow the time range"
    )
