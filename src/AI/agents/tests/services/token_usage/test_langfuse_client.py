import json

import httpx

from services.token_usage.langfuse_client import _as_trace_payload
import pytest

from shared.utils.langfuse_public_api import (
    MAX_PAGES,
    PAGE_SIZE,
    ObservationsTruncated,
    fetch_observations,
)


class TestFetchObservations:
    async def test_stops_when_no_cursor_comes_back(self):
        client, cursors = _create_client_mock([(_rows(3), None)])

        items = await fetch_observations(client, {})

        assert len(items) == 3
        assert cursors == [None]

    async def test_follows_the_cursor_across_pages(self):
        client, cursors = _create_client_mock(
            [(_rows(PAGE_SIZE), "CUR1"), (_rows(2), None)]
        )

        items = await fetch_observations(client, {})

        assert len(items) == PAGE_SIZE + 2
        assert cursors == [None, "CUR1"]

    async def test_stops_on_an_empty_page_even_with_a_cursor(self):
        """A cursor that never clears must not page forever."""
        client, cursors = _create_client_mock([([], "CUR1")])

        items = await fetch_observations(client, {})

        assert items == []
        assert cursors == [None]


    async def test_hitting_the_page_cap_raises_instead_of_truncating(self):
        """A caller that deletes or reports on the result cannot tell a partial
        list from a complete one."""
        client, _ = _create_client_mock(
            [(_rows(PAGE_SIZE), f"CUR{i}") for i in range(MAX_PAGES)]
        )

        with pytest.raises(ObservationsTruncated):
            await fetch_observations(client, {})


class TestAsTracePayload:
    def test_maps_the_root_span_onto_a_trace(self):
        """A trace is its root span, so the id lives in traceId."""
        payload = _as_trace_payload(
            {
                "id": "span-1",
                "traceId": "trace-1",
                "userId": "dev",
                "environment": "default",
                "metadata": {"session_id": "s1"},
            }
        )

        assert payload == {
            "id": "trace-1",
            "userId": "dev",
            "environment": "default",
            "metadata": {"session_id": "s1"},
        }

    def test_missing_fields_do_not_raise(self):
        assert _as_trace_payload({}) == {
            "id": None,
            "userId": None,
            "environment": None,
            "metadata": None,
        }


def _rows(count: int) -> list[dict]:
    return [{"id": f"span-{i}", "traceId": f"trace-{i}"} for i in range(count)]


def _create_client_mock(pages) -> tuple[httpx.AsyncClient, list]:
    seen_cursors: list = []
    remaining = list(pages)

    def handler(request: httpx.Request) -> httpx.Response:
        seen_cursors.append(request.url.params.get("cursor"))
        rows, cursor = remaining.pop(0) if remaining else ([], None)
        return httpx.Response(
            200, json={"data": rows, "meta": {"cursor": cursor} if cursor else {}}
        )

    client = httpx.AsyncClient(
        base_url="https://langfuse.test", transport=httpx.MockTransport(handler)
    )
    return client, seen_cursors
