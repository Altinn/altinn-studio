import httpx

from services.token_usage.langfuse_client import PAGE_SIZE, _fetch_all_pages


class TestFetchAllPages:
    async def test_stops_on_a_short_page(self):
        client, requested_pages = _create_client_mock(
            {1: _make_page_items(PAGE_SIZE - 1)}
        )

        items = await _fetch_all_pages(client, "/api/public/traces", {})

        assert len(items) == PAGE_SIZE - 1
        assert requested_pages == [1]

    async def test_advances_on_a_full_page(self):
        client, requested_pages = _create_client_mock(
            {1: _make_page_items(PAGE_SIZE), 2: _make_page_items(3)}
        )

        items = await _fetch_all_pages(client, "/api/public/traces", {})

        assert len(items) == PAGE_SIZE + 3
        assert requested_pages == [1, 2]


def _make_page_items(count: int) -> list[dict]:
    return [{"id": i} for i in range(count)]


def _create_client_mock(
    pages_by_number: dict[int, list[dict]],
) -> tuple[httpx.AsyncClient, list[int]]:
    requested_pages: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = int(request.url.params["page"])
        requested_pages.append(page)
        return httpx.Response(200, json={"data": pages_by_number.get(page, [])})

    client = httpx.AsyncClient(
        base_url="https://langfuse.test", transport=httpx.MockTransport(handler)
    )
    return client, requested_pages
