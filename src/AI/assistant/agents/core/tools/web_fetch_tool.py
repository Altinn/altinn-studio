"""`web_fetch` — fetch a documentation page from an allowlisted domain."""

from __future__ import annotations

import re
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, Field

from agents.core.tool import LoopContext, Tool, ToolResult

from .utils.text_parts import PartLimit, PartOffset, text_part

ALLOWED_HOSTS = {"docs.altinn.studio", "altinncdn.no", "www.altinn.studio", "altinn.studio"}
FETCH_TIMEOUT_SECONDS = 20.0
MAX_REDIRECTS = 3

DOCS_HOST = "docs.altinn.studio"
INDEX_FILENAME = "llms.txt"
MARKDOWN_PAGE = "index.md"
# The docs site ends each HTML title with this, and the index leaves it out.
_TITLE_SUFFIX = " – Altinn"
_INDEX_ENTRY_RE = re.compile(r"^- \[(?P<title>[^\]]+)\]\((?P<url>[^)\s]+)\)", re.MULTILINE)

_TAG_STRIP_RE = re.compile(r"<(script|style|nav|header|footer)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\n{3,}")
_ANY_WHITESPACE_RE = re.compile(r"\s+")
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.DOTALL | re.IGNORECASE)


class WebFetchArgs(BaseModel):
    url: str = Field(description="HTTPS URL to fetch. Allowed hosts: docs.altinn.studio, altinncdn.no, altinn.studio.")
    filter: str | None = Field(
        default=None,
        description=(
            "Return only the lines that contain every word in this text, ignoring case. Use it to search the "
            "docs index, for example `/altinn-studio/v9/ signering` on https://docs.altinn.studio/nb/llms.txt."
        ),
    )
    offset: PartOffset = 1
    limit: PartLimit = None


class WebFetchTool(Tool[WebFetchArgs]):
    """Fetch an allowlisted documentation page as readable text."""

    name = "web_fetch"
    description = (
        "Fetch a page from the official Altinn documentation "
        "(docs.altinn.studio) or an official schema (altinncdn.no).  Use "
        "together with the `studio-docs` skill: search the docs index with "
        "`filter` for the right page, then fetch that page's URL.  "
        "HTML is reduced to readable text."
    )
    input_schema = WebFetchArgs
    is_concurrency_safe = True

    async def run(self, args: WebFetchArgs, ctx: LoopContext) -> ToolResult:
        refusal = _check_url(args.url)
        if refusal is not None:
            return refusal
        response = await _fetch(args.url)
        if isinstance(response, ToolResult):
            return response
        text, title = _extract_page(response)
        url = str(response.url)
        line_filter = " ".join((args.filter or "").split())
        if line_filter:
            text = _matching_lines(text, line_filter)
        result = text_part(
            ctx,
            text,
            offset=args.offset,
            limit=args.limit,
            key=f"url:{url}#filter:{line_filter}",
            source=f"the lines of {url} that match `{line_filter}`" if line_filter else url,
            tool=self.name,
            same_args="the same `url` and `filter`" if line_filter else "the same `url`",
        )
        if result.is_error:
            return result
        result.metadata["url"] = url
        # Consulted-source record, collected by the loop and shown in the
        # chat UI.  Ground truth: this page WAS fetched.
        source = _source(response, title, ctx)
        if source is not None:
            result.metadata["source"] = source
        return result


def _check_url(url: str) -> ToolResult | None:
    try:
        parsed = httpx.URL(url)
    except httpx.InvalidURL as exc:
        return ToolResult(content=f"Invalid URL: {exc}", is_error=True)
    if parsed.scheme != "https":
        return ToolResult(content="Only https:// URLs are allowed.", is_error=True)
    if parsed.host not in ALLOWED_HOSTS:
        return ToolResult(
            content=(f"Host {parsed.host!r} is not allowed. Allowed hosts: " + ", ".join(sorted(ALLOWED_HOSTS))),
            is_error=True,
        )
    return None


async def _fetch(url: str) -> httpx.Response | ToolResult:
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            timeout=FETCH_TIMEOUT_SECONDS,
            event_hooks={"request": [_check_redirect]},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        hint = ""
        if status == 404:
            hint = "  Do not guess URLs — load the `studio-docs` skill and take the URL from the docs index."
        return ToolResult(
            content=f"HTTP {status} fetching {exc.response.url}.{hint}",
            is_error=True,
        )
    except httpx.HTTPError as exc:
        return ToolResult(content=f"Fetch failed: {exc}", is_error=True)
    return response


class _RefusedRedirectError(httpx.RequestError):
    """A redirect goes to a URL that `_check_url` refuses."""


async def _check_redirect(request: httpx.Request) -> None:
    """httpx calls this before each request, so also before each redirect."""
    refusal = _check_url(str(request.url))
    if refusal is not None:
        raise _RefusedRedirectError(f"Redirect to {request.url} refused. {refusal.content}", request=request)


def _extract_page(response: httpx.Response) -> tuple[str, str | None]:
    """Return the readable text of the page and its title."""
    text = response.text
    title = None
    if "html" in response.headers.get("content-type", ""):
        title = _page_title(text)
        text = _html_to_text(text)
    return text, title


def _matching_lines(text: str, line_filter: str) -> str:
    words = [word.casefold() for word in line_filter.split()]
    lines = [line for line in text.splitlines() if all(word in line.casefold() for word in words)]
    if not lines:
        return f"No lines contain all of: {line_filter}"
    return "\n".join(lines)


def _page_title(html: str) -> str | None:
    match = _TITLE_RE.search(html)
    if not match:
        return None
    title = _ANY_WHITESPACE_RE.sub(" ", match.group(1)).strip()
    return title or None


def _source(response: httpx.Response, html_title: str | None, ctx: LoopContext) -> dict[str, str] | None:
    """The page to list as a source, named as in the docs index the model searched. None for the index."""
    index_titles: dict[str, str] = ctx.extras.setdefault("docs_index_titles", {})
    if response.url.host == DOCS_HOST and response.url.path.endswith(f"/{INDEX_FILENAME}"):
        for entry in _INDEX_ENTRY_RE.finditer(response.text):
            index_titles.setdefault(entry["url"].removesuffix(MARKDOWN_PAGE), entry["title"].strip())
        return None
    page = _page_url(response.url)
    title = index_titles.get(page) or _without_suffix(html_title) or _title_from_url(page)
    return {"title": title, "url": page, "kind": "docs"}


def _page_url(url: httpx.URL) -> str:
    """The URL that opens the page in a browser: without `index.md`, a query or an anchor."""
    path = url.path.removesuffix(MARKDOWN_PAGE) if url.path.endswith(f"/{MARKDOWN_PAGE}") else url.path
    return str(url.copy_with(path=path, query=None, fragment=None))


def _without_suffix(title: str | None) -> str | None:
    return (title.removesuffix(_TITLE_SUFFIX) or None) if title else None


def _title_from_url(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    last_segment = path.rsplit("/", 1)[-1] if path else ""
    return last_segment or urlparse(url).hostname or url


def _html_to_text(html: str) -> str:
    """Cheap readable-text reduction — good enough for docs pages."""
    stripped = _TAG_STRIP_RE.sub("", html)
    no_tags = _HTML_TAG_RE.sub("", stripped)
    unescaped = (
        no_tags.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
    )
    lines = [line.strip() for line in unescaped.splitlines()]
    return _WHITESPACE_RE.sub("\n\n", "\n".join(line for line in lines if line))
