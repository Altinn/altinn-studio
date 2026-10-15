"""`web_fetch` — fetch a documentation page from an allowlisted domain.

Exists so the model can follow the `altinn-docs` skill's llms.txt index:
scan the index, pick the relevant page, fetch it.  Deliberately narrow:

  * Allowlisted hosts only (docs.altinn.studio, altinncdn.no) — this is
    a docs reader, not a general HTTP client.  Keeping the list tight
    also keeps prompt-injection surface small: pages fetched are
    first-party Altinn documentation.
  * GET only, response capped, HTML reduced to readable text.
  * Redirects are followed, because the docs site sends each URL without
    a final slash to the URL with the slash.  Each redirect must pass the
    same allowlist check as the first URL.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, Field

from agents.core.tool import LoopContext, Tool, ToolResult

ALLOWED_HOSTS = {"docs.altinn.studio", "altinncdn.no", "www.altinn.studio", "altinn.studio"}
MAX_RESPONSE_CHARS = 60_000
FETCH_TIMEOUT_SECONDS = 20.0
MAX_REDIRECTS = 3

_TAG_STRIP_RE = re.compile(r"<(script|style|nav|header|footer)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\n{3,}")
_ANY_WHITESPACE_RE = re.compile(r"\s+")
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.DOTALL | re.IGNORECASE)


class WebFetchArgs(BaseModel):
    url: str = Field(description="HTTPS URL to fetch. Allowed hosts: docs.altinn.studio, altinncdn.no, altinn.studio.")


class WebFetchTool(Tool[WebFetchArgs]):
    """Fetch an allowlisted documentation page as readable text."""

    name = "web_fetch"
    description = (
        "Fetch a page from the official Altinn documentation "
        "(docs.altinn.studio) or an official schema (altinncdn.no).  Use "
        "together with the `altinn-docs` skill: load the skill, scan its "
        "llms.txt index for the right page, then fetch that page's URL.  "
        "HTML is reduced to readable text; responses are capped at "
        f"{MAX_RESPONSE_CHARS} characters."
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
        return ToolResult(
            content=text,
            metadata={
                "url": url,
                "chars": len(text),
                # Consulted-source record, collected by the loop and shown
                # in the chat UI.  Ground truth: this page WAS fetched.
                "source": {
                    "title": title or _title_from_url(url),
                    "url": url,
                    "kind": "docs",
                },
            },
        )


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
            hint = "  Do not guess URLs — load `skill(altinn-docs)` and use a URL verbatim from its index."
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
    if len(text) > MAX_RESPONSE_CHARS:
        text = text[:MAX_RESPONSE_CHARS] + "\n…[truncated]"
    return text, title


def _page_title(html: str) -> str | None:
    match = _TITLE_RE.search(html)
    if not match:
        return None
    title = _ANY_WHITESPACE_RE.sub(" ", match.group(1)).strip()
    return title or None


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
