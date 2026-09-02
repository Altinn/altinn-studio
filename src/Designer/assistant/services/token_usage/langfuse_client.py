"""Fetches trace and generation rows from the Langfuse public API."""

import asyncio
from datetime import datetime
from typing import Any

from shared.utils.langfuse_public_api import (
    create_public_api_client,
    fetch_observations,
    root_span_filter,
    type_filter,
)


async def fetch_traces_and_observations(
    trace_window_start: datetime,
    observation_window_start: datetime,
    window_end: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    async with create_public_api_client() as client:
        root_spans, observations = await asyncio.gather(
            fetch_observations(
                client,
                {
                    "filter": root_span_filter(),
                    "fields": "core,basic,metadata",
                    "fromStartTime": trace_window_start.isoformat(),
                    "toStartTime": window_end.isoformat(),
                },
            ),
            fetch_observations(
                client,
                {
                    "filter": type_filter("GENERATION"),
                    "fields": "core,basic,usage,model",
                    "fromStartTime": observation_window_start.isoformat(),
                    "toStartTime": window_end.isoformat(),
                },
            ),
        )

    return [_as_trace_payload(span) for span in root_spans], observations


def _as_trace_payload(root_span: dict[str, Any]) -> dict[str, Any]:
    """A trace is represented by its root span, under a different id."""
    return {
        "id": root_span.get("traceId"),
        "userId": root_span.get("userId"),
        "environment": root_span.get("environment"),
        "metadata": root_span.get("metadata"),
    }
