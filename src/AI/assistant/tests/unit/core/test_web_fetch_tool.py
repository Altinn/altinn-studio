"""Tests for `web_fetch`. A mock transport replaces the network."""

from __future__ import annotations

from collections.abc import Callable

import httpx
import pytest

from agents.core import LoopContext, WebFetchTool
from agents.core.tools.web_fetch_tool import MAX_RESPONSE_CHARS

DOCS_URL = "https://docs.altinn.studio/nb/altinn-studio/guides/"
HTML = "text/html; charset=utf-8"
REAL_CLIENT = httpx.AsyncClient

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture
def serve(monkeypatch) -> Callable[[Handler], list[httpx.Request]]:
    """Send the requests of the tool to `handler`, and return the list of requests that it got."""

    def install(handler: Handler) -> list[httpx.Request]:
        requests: list[httpx.Request] = []

        def record(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return handler(request)

        def make_client(**kwargs) -> httpx.AsyncClient:
            return REAL_CLIENT(transport=httpx.MockTransport(record), **kwargs)

        monkeypatch.setattr("agents.core.tools.web_fetch_tool.httpx.AsyncClient", make_client)
        return requests

    return install


def _respond(body: str, *, status: int = 200, content_type: str = HTML) -> Handler:
    return lambda request: httpx.Response(status, text=body, headers={"content-type": content_type})


async def _fetch(url: str):
    tool = WebFetchTool()
    ctx = LoopContext(session_id="s1", repo_path="/repo", allow_app_changes=False)
    return await tool.run(tool.input_schema(url=url), ctx)


class TestRefusedUrls:
    async def test_refuses_a_url_that_is_not_https(self, serve):
        requests = serve(_respond("x"))

        result = await _fetch("http://docs.altinn.studio/nb/")

        assert result.is_error
        assert result.content == "Only https:// URLs are allowed."
        assert requests == []

    async def test_refuses_a_host_that_is_not_in_the_allowlist(self, serve):
        requests = serve(_respond("x"))

        result = await _fetch("https://example.com/docs")

        assert result.is_error
        assert "'example.com' is not allowed" in result.content
        assert "docs.altinn.studio" in result.content
        assert requests == []


class TestFailedRequests:
    async def test_tells_the_model_not_to_guess_when_the_page_is_not_found(self, serve):
        serve(_respond("not found", status=404))

        result = await _fetch(DOCS_URL)

        assert result.is_error
        assert result.content.startswith(f"HTTP 404 fetching {DOCS_URL}.")
        assert "Do not guess URLs" in result.content

    async def test_reports_other_http_errors_without_the_hint(self, serve):
        serve(_respond("error", status=500))

        result = await _fetch(DOCS_URL)

        assert result.is_error
        assert result.content == f"HTTP 500 fetching {DOCS_URL}."

    async def test_reports_a_network_failure(self, serve):
        def refuse(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("connection refused", request=request)

        serve(refuse)

        result = await _fetch(DOCS_URL)

        assert result.is_error
        assert result.content == "Fetch failed: connection refused"


class TestPageContent:
    async def test_changes_html_to_readable_text(self, serve):
        serve(
            _respond(
                "<html><head><style>p {}</style></head><body><nav>Menu</nav>"
                "<p>Forms &amp; data</p>\n\n\n\n<p>Use&nbsp;layouts</p></body></html>"
            )
        )

        result = await _fetch(DOCS_URL)

        assert not result.is_error
        assert result.content == "Forms & data\nUse layouts"
        assert result.metadata["chars"] == len(result.content)

    async def test_returns_a_page_that_is_not_html_without_changes(self, serve):
        serve(_respond('{"<b>": 1}', content_type="application/json"))

        result = await _fetch("https://altinncdn.no/schemas/json/layout/layout.schema.v1.json")

        assert result.content == '{"<b>": 1}'

    async def test_truncates_a_long_response(self, serve):
        serve(_respond("x" * (MAX_RESPONSE_CHARS + 1), content_type="text/plain"))

        result = await _fetch(DOCS_URL)

        assert result.content == "x" * MAX_RESPONSE_CHARS + "\n…[truncated]"

    async def test_follows_a_redirect(self, serve):
        moved_url = "https://docs.altinn.studio/nb/altinn-studio/v8/guides/"

        def redirect(request: httpx.Request) -> httpx.Response:
            if str(request.url) == DOCS_URL:
                return httpx.Response(301, headers={"location": moved_url})
            return httpx.Response(200, text="<p>Guides</p>", headers={"content-type": HTML})

        requests = serve(redirect)

        result = await _fetch(DOCS_URL)

        assert result.content == "Guides"
        assert [str(request.url) for request in requests] == [DOCS_URL, moved_url]


class TestSourceRecord:
    async def test_uses_the_page_title(self, serve):
        serve(_respond("<title>\n  Guides  |  Altinn\n</title><p>x</p>"))

        result = await _fetch(DOCS_URL)

        assert result.metadata["url"] == DOCS_URL
        assert result.metadata["source"] == {"title": "Guides | Altinn", "url": DOCS_URL, "kind": "docs"}

    @pytest.mark.parametrize(
        ("url", "title"),
        [
            (DOCS_URL, "guides"),
            ("https://altinn.studio", "altinn.studio"),
        ],
    )
    async def test_uses_the_url_when_the_page_has_no_title(self, serve, url, title):
        serve(_respond("<title> </title><p>x</p>"))

        result = await _fetch(url)

        assert result.metadata["source"]["title"] == title
