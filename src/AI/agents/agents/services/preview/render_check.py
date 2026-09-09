"""Renders every ordered page of a branch in Studio's app preview, headless.

A pure engine: callers supply the configuration and read the results. Checkout
runs on the browser session, not an API key, which the repo endpoints reject,
and it keeps the working copy owned by the user the preview renders for.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

PAGE_RENDER_TIMEOUT_MS = 30_000
LOGIN_STEP_TIMEOUT_MS = 30_000
ORG_PICKER_TIMEOUT_MS = 3_000
CHECKOUT_TIMEOUT_MS = 120_000
ERROR_SNIPPET_MAX_CHARS = 200

XSRF_COOKIE_NAME = "XSRF-TOKEN"
XSRF_HEADER_NAME = "X-XSRF-TOKEN"

ERROR_SELECTOR = '[data-testid="AltinnError"], [data-fatal-error]'
RENDERED_OR_ERROR_SELECTOR = f"#finishedLoading, #readyForPrint, {ERROR_SELECTOR}"
APP_DIR_NAME = "App"
UI_DIR_NAME = "ui"
LAYOUT_SETTINGS_FILE_NAME = "Settings.json"
PAGES_KEY = "pages"
PAGE_ORDER_KEY = "order"
PREVIEW_IFRAME_SELECTOR = "#app-frontend-react-iframe"

THROWN_ERROR_PATTERN = re.compile(
    r"\b[A-Z]\w*Error\b|\bError:|\b(?:Cannot read properties|is not a function|is not defined)\b"
    r"|\bat \S+ \(https?://"
)

LOGIN_BUTTON = "Logg inn"
ORG_PICKER_NEXT_BUTTON = "Neste"
SKIP_LOGIN_GUIDE_KEY = "altinn-studio-skip-login-guide"


@dataclass(frozen=True)
class PageRenderResult:
    page: str
    rendered: bool
    detail: str = ""


class PreviewCheckUnavailable(Exception):
    pass

def render_check(
    *,
    studio_base: str,
    username: str,
    org: str,
    app: str,
    branch: str,
    page_order: list[str],
    storage_state_path: Path,
    host_resolver_rules: str | None = None,
) -> list[PageRenderResult]:
    """Render-check every ordered page of `branch`.

    `host_resolver_rules` is Chromium's `--host-resolver-rules`. Chromium pins
    `*.localhost` to 127.0.0.1 (RFC 6761) and ignores DNS, so in a container it
    is the only way to reach compose addresses; route rewrites miss the login
    redirects. Synchronous Playwright; call via `asyncio.to_thread`.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise PreviewCheckUnavailable(
            "playwright is not installed (pip install playwright && playwright install chromium)"
        ) from error

    studio_base = studio_base.rstrip("/")
    launch_args = (
        [f"--host-resolver-rules={host_resolver_rules}"] if host_resolver_rules else []
    )
    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(args=launch_args)
        except Exception as error:
            raise PreviewCheckUnavailable(f"could not launch Chromium: {error}") from error
        try:
            context = _authenticated_context(browser, studio_base, username, storage_state_path)
            _checkout_branch(context, studio_base, org, app, branch)
            page = context.new_page()
            first_page_url = _resolve_preview_url(page, studio_base, org, app)
            return _check_pages(page, first_page_url, page_order)
        finally:
            browser.close()


def read_page_order(repo_root: Path) -> list[str]:
    """`pages.order` of the app's primary layout set.

    With several ordered layout sets the longest wins, as the benchmark does.
    """
    best: list[str] = []
    ui_dir = repo_root / APP_DIR_NAME / UI_DIR_NAME
    if not ui_dir.is_dir():
        return best
    for settings_path in sorted(ui_dir.rglob(LAYOUT_SETTINGS_FILE_NAME)):
        try:
            settings = json.loads(settings_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(settings, dict):
            continue
        pages = settings.get(PAGES_KEY)
        if not isinstance(pages, dict):
            continue
        order = pages.get(PAGE_ORDER_KEY)
        if isinstance(order, list) and len(order) > len(best):
            best = [p for p in order if isinstance(p, str)]
    return best


def swap_layout_in_preview_url(url: str, layout: str) -> str | None:
    parts = urlsplit(url)
    segments = parts.fragment.split("/")
    if len(segments) < 5 or segments[1] != "instance":
        return None
    task_segments = segments[:5]
    fragment = "/".join([*task_segments, layout])
    return urlunsplit(parts._replace(fragment=fragment))



def _authenticated_context(browser, studio_base: str, username: str, storage_state_path: Path):
    if storage_state_path.is_file():
        context = browser.new_context(storage_state=str(storage_state_path))
        if _is_logged_in(context, studio_base):
            return context
        context.close()

    context = browser.new_context()
    try:
        _login(context, studio_base, username)
    except Exception as error:
        context.close()
        raise PreviewCheckUnavailable(f"Studio login as {username!r} failed: {error}") from error
    cookies = context.cookies()
    for cookie in cookies:
        cookie["secure"] = False
    context.clear_cookies()
    context.add_cookies(cookies)
    context.storage_state(path=str(storage_state_path))
    return context


def _is_logged_in(context, studio_base: str) -> bool:
    try:
        return context.request.get(f"{studio_base}/designer/api/user/current").ok
    except Exception:
        return False


def _login(context, studio_base: str, username: str) -> None:
    """Log in through the fake-Ansattporten mock: a user picker, no password."""
    page = context.new_page()
    page.goto(f"{studio_base}/")
    page.evaluate(f"localStorage.setItem('{SKIP_LOGIN_GUIDE_KEY}', 'true')")
    page.get_by_role("button", name=LOGIN_BUTTON).click()
    page.wait_for_url("**/authorize**", timeout=LOGIN_STEP_TIMEOUT_MS)
    page.get_by_role("button", name=re.compile(re.escape(username))).click()
    # An org picker only appears when Designer requests authorization_details.
    org_picker_next = page.get_by_role("button", name=ORG_PICKER_NEXT_BUTTON)
    try:
        org_picker_next.click(timeout=ORG_PICKER_TIMEOUT_MS)
    except Exception:
        pass
    page.wait_for_url(f"{studio_base}/dashboard/**", timeout=LOGIN_STEP_TIMEOUT_MS)
    page.close()



def _checkout_branch(context, studio_base: str, org: str, app: str, branch: str) -> None:
    """Reset and check out through the Designer API on the browser's cookie
    session, mirroring the frontend's reset/checkout flow.
    """
    repo_api = f"{studio_base}/designer/api/repos/repo/{org}/{app}"

    reset = context.request.get(f"{repo_api}/reset", timeout=CHECKOUT_TIMEOUT_MS)
    if not reset.ok:
        raise PreviewCheckUnavailable(
            f"reset before checkout of {branch!r} failed: {reset.status} {reset.status_text}"
        )

    checkout = context.request.post(
        f"{repo_api}/checkout",
        data={"branchName": branch},
        headers={XSRF_HEADER_NAME: _xsrf_token(context, studio_base)},
        timeout=CHECKOUT_TIMEOUT_MS,
    )
    if not checkout.ok:
        raise PreviewCheckUnavailable(
            f"checkout of {branch!r} failed: {checkout.status} {checkout.status_text}"
        )


def _xsrf_token(context, studio_base: str) -> str:
    context.request.get(f"{studio_base}/designer/api/user/current")
    for cookie in context.cookies():
        if cookie["name"] == XSRF_COOKIE_NAME:
            return cookie["value"]
    raise PreviewCheckUnavailable("no XSRF token cookie after login")



def _resolve_preview_url(page, studio_base: str, org: str, app: str) -> str:
    """Open Studio's preview page, which creates the mock instance, and return the
    app-specific-preview URL its iframe points at.
    """
    try:
        page.goto(f"{studio_base}/preview/{org}/{app}")
        iframe = page.wait_for_selector(PREVIEW_IFRAME_SELECTOR, timeout=PAGE_RENDER_TIMEOUT_MS)
        src = iframe.get_attribute("src")
    except Exception as error:
        raise PreviewCheckUnavailable(f"preview page did not produce an iframe: {error}") from error
    if not src:
        raise PreviewCheckUnavailable("preview iframe has no src")
    return urljoin(f"{studio_base}/", src)


def _check_pages(page, first_page_url: str, page_order: list[str]) -> list[PageRenderResult]:
    results: list[PageRenderResult] = []
    for layout in page_order:
        url = swap_layout_in_preview_url(first_page_url, layout)
        if url is None:
            # Scoring a subset would report a pass the run never earned.
            raise PreviewCheckUnavailable(
                f"preview url {first_page_url!r} cannot select layouts; cannot check {len(page_order)} page(s)"
            )
        results.append(_check_single_page(page, url, layout))
    return results


def _check_single_page(page, url: str, layout: str) -> PageRenderResult:
    uncaught_errors: list[str] = []
    console_errors: list[str] = []
    on_page_error = lambda error: uncaught_errors.append(str(error))  # noqa: E731
    on_console = lambda message: (  # noqa: E731
        console_errors.append(message.text) if message.type == "error" else None
    )
    page.on("pageerror", on_page_error)
    page.on("console", on_console)
    try:
        page.goto("about:blank")
        page.goto(url)
        page.wait_for_selector(
            RENDERED_OR_ERROR_SELECTOR, state="attached", timeout=PAGE_RENDER_TIMEOUT_MS
        )
    except Exception as error:
        detail = uncaught_errors[0] if uncaught_errors else str(error)
        return PageRenderResult(layout, False, f"no render marker: {_snippet(detail)}")
    finally:
        page.remove_listener("pageerror", on_page_error)
        page.remove_listener("console", on_console)

    error_element = page.query_selector(ERROR_SELECTOR)
    if error_element:
        detail = _describe_error_page(page, error_element, uncaught_errors, console_errors)
        return PageRenderResult(layout, False, f"error page: {detail}")
    if uncaught_errors:
        return PageRenderResult(layout, False, f"uncaught error: {_snippet(uncaught_errors[0])}")
    thrown = [message for message in console_errors if _is_thrown_error(message)]
    if thrown:
        return PageRenderResult(layout, False, f"component failed to render: {_snippet(thrown[0])}")
    detail = f"console errors: {_snippet('; '.join(console_errors))}" if console_errors else ""
    return PageRenderResult(layout, True, detail)


def _describe_error_page(
    page, error_element, uncaught_errors: list[str], console_errors: list[str]
) -> str:
    """Status code, error-page text and any uncaught or console errors: "error page
    shown" alone tells whoever must fix it nothing.
    """
    parts: list[str] = []
    status = page.query_selector('[data-testid="StatusCode"]')
    if status:
        parts.append(_snippet(status.inner_text()))
    try:
        page_text = error_element.inner_text()
    except Exception:
        page_text = ""
    if page_text.strip():
        parts.append(_snippet(page_text))
    if uncaught_errors:
        parts.append(f"uncaught: {_snippet('; '.join(uncaught_errors))}")
    if console_errors:
        parts.append(f"console: {_snippet('; '.join(console_errors))}")
    return " — ".join(parts) if parts else "error page shown (no further detail)"


def _is_thrown_error(message: str) -> bool:
    """A component that cannot render throws, app-frontend catches it, and nothing
    marks the DOM. Log noise and failed requests carry no exception or stack.
    """
    return bool(THROWN_ERROR_PATTERN.search(message))


def _snippet(text: str) -> str:
    flattened = " ".join(text.split())
    return flattened[:ERROR_SNIPPET_MAX_CHARS]
