"""Tests for services.traces.delete_expired_traces."""

import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import httpx
import pytest

from services.traces.delete_expired_traces import (
    PAGE_SIZE,
    _delete_traces_before,
    _fetch_oldest_trace_ids,
    delete_expired_traces,
)

CUTOFF = datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc)


class TestDeleteTracesBefore:
    async def test_deletes_nothing_when_no_old_traces(self):
        client, deleted_batches = _create_client_mock(total_old_traces=0)

        deleted = await _delete_traces_before(client, CUTOFF)

        assert deleted == 0
        assert deleted_batches == []

    async def test_returns_total_deleted_count(self):
        client, _ = _create_client_mock(total_old_traces=PAGE_SIZE + 3)

        deleted = await _delete_traces_before(client, CUTOFF)

        assert deleted == PAGE_SIZE + 3

    async def test_chunks_deletions_into_batches_of_page_size(self):
        client, deleted_batches = _create_client_mock(total_old_traces=PAGE_SIZE * 2 + 7)

        await _delete_traces_before(client, CUTOFF)

        assert [len(batch) for batch in deleted_batches] == [PAGE_SIZE, PAGE_SIZE, 7]


class TestFetchOldestTraceIds:
    async def test_sends_cutoff_as_to_timestamp(self):
        captured_params: dict[str, str] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured_params.update(request.url.params)
            return httpx.Response(200, json={"data": []})

        client = _client_with_handler(handler)

        await _fetch_oldest_trace_ids(client, CUTOFF)

        assert captured_params["toTimestamp"] == CUTOFF.isoformat()


class TestDeleteExpiredTraces:
    async def test_raises_when_credentials_missing(self):
        config = SimpleNamespace(
            LANGFUSE_PUBLIC_KEY=None,
            LANGFUSE_SECRET_KEY=None,
            LANGFUSE_HOST="https://langfuse.test",
        )
        with patch("services.traces.delete_expired_traces.get_config", return_value=config):
            with pytest.raises(RuntimeError, match="credentials are not configured"):
                await delete_expired_traces()


def _client_with_handler(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url="https://langfuse.test", transport=httpx.MockTransport(handler)
    )


def _create_client_mock(
    total_old_traces: int,
) -> tuple[httpx.AsyncClient, list[list[str]]]:
    remaining = [f"trace-{i}" for i in range(total_old_traces)]
    deleted_batches: list[list[str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "DELETE":
            batch = _read_trace_ids(request)
            deleted_batches.append(batch)
            for trace_id in batch:
                remaining.remove(trace_id)
            return httpx.Response(200, json={})
        page = [{"id": trace_id} for trace_id in remaining[:PAGE_SIZE]]
        return httpx.Response(200, json={"data": page})

    return _client_with_handler(handler), deleted_batches


def _read_trace_ids(request: httpx.Request) -> list[str]:
    return json.loads(request.content)["traceIds"]
