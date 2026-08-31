import json
from datetime import datetime, timezone

import httpx

from services.traces.delete_expired_traces import (
    DELETE_BATCH_SIZE,
    _delete_traces_before,
    _fetch_expired_trace_ids,
)
from shared.utils.langfuse_public_api import PAGE_SIZE

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

    async def test_chunks_deletions_into_batches(self):
        client, deleted_batches = _create_client_mock(
            total_old_traces=DELETE_BATCH_SIZE * 2 + 7
        )

        await _delete_traces_before(client, CUTOFF)

        assert [len(batch) for batch in deleted_batches] == [
            DELETE_BATCH_SIZE,
            DELETE_BATCH_SIZE,
            7,
        ]


class TestFetchTraceIdPage:
    async def test_sends_cutoff_as_to_timestamp(self):
        captured_params: dict[str, str] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured_params.update(request.url.params)
            return httpx.Response(200, json={"data": []})

        client = _client_with_handler(handler)

        await _fetch_expired_trace_ids(client, CUTOFF)

        assert captured_params["toStartTime"] == CUTOFF.isoformat()
        assert "isRootObservation" in captured_params["filter"]

    async def test_filters_on_production_environments_only(self):
        captured_environments: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            captured_environments.extend(
                request.url.params.get_list("environment")
            )
            return httpx.Response(200, json={"data": []})

        client = _client_with_handler(handler)

        await _fetch_expired_trace_ids(client, CUTOFF)

        assert captured_environments == ["prod", "production"]


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
        cursor = request.url.params.get("cursor")
        page, next_cursor = _page_of(all_trace_ids, cursor)
        return httpx.Response(
            200,
            json={
                "data": [{"id": f"span-{tid}", "traceId": tid} for tid in page],
                "meta": {"cursor": next_cursor} if next_cursor else {},
            },
        )

    return _client_with_handler(handler), deleted_batches


def _page_of(trace_ids: list[str], cursor: str | None) -> tuple[list[str], str | None]:
    start = int(cursor) if cursor else 0
    page = trace_ids[start : start + PAGE_SIZE]
    nxt = start + PAGE_SIZE
    return page, str(nxt) if nxt < len(trace_ids) else None


def _read_trace_ids(request: httpx.Request) -> list[str]:
    return json.loads(request.content)["traceIds"]
