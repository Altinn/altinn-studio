import json
from datetime import datetime, timezone

import httpx

from services.traces.delete_expired_traces import (
    PAGE_SIZE,
    _delete_traces_before,
    _fetch_trace_id_page,
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


class TestFetchTraceIdPage:
    async def test_sends_cutoff_as_to_timestamp(self):
        captured_params: dict[str, str] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured_params.update(request.url.params)
            return httpx.Response(200, json={"data": []})

        client = _client_with_handler(handler)

        await _fetch_trace_id_page(client, CUTOFF, page_number=1)

        assert captured_params["toTimestamp"] == CUTOFF.isoformat()


def _client_with_handler(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url="https://langfuse.test", transport=httpx.MockTransport(handler)
    )


def _create_client_mock(
    total_old_traces: int,
) -> tuple[httpx.AsyncClient, list[list[str]]]:
    all_trace_ids = [f"trace-{i}" for i in range(total_old_traces)]
    deleted_batches: list[list[str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "DELETE":
            deleted_batches.append(_read_trace_ids(request))
            return httpx.Response(200, json={})
        page = _page_of(all_trace_ids, int(request.url.params["page"]))
        return httpx.Response(200, json={"data": [{"id": tid} for tid in page]})

    return _client_with_handler(handler), deleted_batches


def _page_of(trace_ids: list[str], page_number: int) -> list[str]:
    start = (page_number - 1) * PAGE_SIZE
    return trace_ids[start : start + PAGE_SIZE]


def _read_trace_ids(request: httpx.Request) -> list[str]:
    return json.loads(request.content)["traceIds"]
