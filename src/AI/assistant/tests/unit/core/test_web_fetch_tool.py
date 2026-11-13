"""Tests for `web_fetch`. A mock transport replaces the network."""

from __future__ import annotations

from collections.abc import Callable

import httpx
import pytest

from agents.core import LoopContext, WebFetchTool
from agents.core.tools.web_fetch_tool import MAX_REDIRECTS

DOCS_URL = "https://docs.altinn.studio/nb/altinn-studio/guides/"
DOCS_URL_WITHOUT_SLASH = DOCS_URL.removesuffix("/")
HTML = "text/html; charset=utf-8"

Handler = Callable[[httpx.Request], httpx.Response]


def _respond(body: str, *, status: int = 200, content_type: str = HTML) -> Handler:
    return lambda request: httpx.Response(status, text=body, headers={"content-type": content_type})


def _redirect_to(location: str, *, status: int = 200) -> Handler:
    """Send `DOCS_URL_WITHOUT_SLASH` to `location`, and answer each other request with a page that has `status`."""

    def handle(request: httpx.Request) -> httpx.Response:
        if str(request.url) == DOCS_URL_WITHOUT_SLASH:
            return httpx.Response(301, headers={"location": location})
        return httpx.Response(status, text="<p>Guides</p>", headers={"content-type": HTML})

    return handle


def _ctx() -> LoopContext:
    return LoopContext(session_id="s1", repo_path="/repo", allow_app_changes=False)


async def _fetch(url: str, offset: int = 1, ctx: LoopContext | None = None):
    tool = WebFetchTool()
    return await tool.run(tool.input_schema(url=url, offset=offset), ctx or _ctx())


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

    @pytest.mark.parametrize("url", ["https://docs.altinn.studio:abc/", "https://docs.altinn.\tstudio/"])
    async def test_refuses_a_url_that_is_not_valid(self, serve, url):
        requests = serve(_respond("x"))

        result = await _fetch(url)

        assert result.is_error
        assert result.content.startswith("Invalid URL: ")
        assert requests == []


class TestFailedRequests:
    async def test_tells_the_model_not_to_guess_when_the_page_is_not_found(self, serve):
        serve(_respond("not found", status=404))

        result = await _fetch(DOCS_URL)

        assert result.is_error
        assert result.content.startswith(f"HTTP 404 fetching {DOCS_URL}.")
        assert "Do not guess URLs" in result.content

    async def test_names_the_url_that_was_not_found_after_a_redirect(self, serve):
        serve(_redirect_to(DOCS_URL, status=404))

        result = await _fetch(DOCS_URL_WITHOUT_SLASH)

        assert result.is_error
        assert result.content.startswith(f"HTTP 404 fetching {DOCS_URL}.")

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

    async def test_returns_a_long_page_in_parts(self, serve):
        page = "".join(f"Line {n} of the guide\n" for n in range(1_500))
        serve(_respond(page, content_type="text/plain"))

        ctx = _ctx()
        first = await _fetch(DOCS_URL, ctx=ctx)
        last_line = first.metadata["end_line"]
        rest = await _fetch(DOCS_URL, offset=last_line + 1, ctx=ctx)

        assert not first.is_error
        assert first.content.endswith(
            f"in {DOCS_URL}.  So far, you have not read lines {last_line + 1}–1500.  "
            f"To read them, call `web_fetch` with the same `url` and `offset` {last_line + 1}.]"
        )
        assert rest.content.endswith(f"You have now read all of {DOCS_URL}.]")
        assert first.metadata["source"]["url"] == rest.metadata["source"]["url"] == DOCS_URL

    async def test_refuses_an_offset_past_the_end_of_the_page(self, serve):
        serve(_respond("<p>Guides</p>"))

        result = await _fetch(DOCS_URL, offset=5)

        assert result.is_error
        # An error result must not record the page as a consulted source.
        assert "source" not in result.metadata


class TestRedirects:
    async def test_follows_a_redirect_to_an_allowed_host(self, serve):
        """The docs site sends each URL without a final slash to the URL with the slash."""
        requests = serve(_redirect_to(DOCS_URL))

        result = await _fetch(DOCS_URL_WITHOUT_SLASH)

        assert not result.is_error
        assert result.content == "Guides"
        assert [str(request.url) for request in requests] == [DOCS_URL_WITHOUT_SLASH, DOCS_URL]

    async def test_refuses_a_redirect_to_a_host_that_is_not_allowed(self, serve):
        requests = serve(_redirect_to("https://example.com/guides/"))

        result = await _fetch(DOCS_URL_WITHOUT_SLASH)

        assert result.is_error
        assert result.content.startswith("Fetch failed: Redirect to https://example.com/guides/ refused.")
        assert "Host 'example.com' is not allowed." in result.content
        assert [str(request.url) for request in requests] == [DOCS_URL_WITHOUT_SLASH]

    async def test_refuses_a_redirect_to_http(self, serve):
        requests = serve(_redirect_to(DOCS_URL.replace("https://", "http://")))

        result = await _fetch(DOCS_URL_WITHOUT_SLASH)

        assert result.is_error
        assert "Only https:// URLs are allowed." in result.content
        assert [str(request.url) for request in requests] == [DOCS_URL_WITHOUT_SLASH]

    async def test_stops_after_the_maximum_number_of_redirects(self, serve):
        def redirect_each_time(request: httpx.Request) -> httpx.Response:
            return httpx.Response(301, headers={"location": f"{request.url}next/"})

        requests = serve(redirect_each_time)

        result = await _fetch(DOCS_URL)

        assert result.is_error
        assert result.content.startswith("Fetch failed: ")
        assert len(requests) == MAX_REDIRECTS + 1


class TestSourceRecord:
    async def test_uses_the_page_title(self, serve):
        serve(_respond("<title>\n  Guides  |  Altinn\n</title><p>x</p>"))

        result = await _fetch(DOCS_URL)

        assert result.metadata["url"] == DOCS_URL
        assert result.metadata["source"] == {"title": "Guides | Altinn", "url": DOCS_URL, "kind": "docs"}

    async def test_uses_the_url_after_a_redirect(self, serve):
        serve(_redirect_to(DOCS_URL))

        result = await _fetch(DOCS_URL_WITHOUT_SLASH)

        assert result.metadata["url"] == DOCS_URL
        assert result.metadata["source"]["url"] == DOCS_URL

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
