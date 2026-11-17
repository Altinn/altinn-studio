"""Make each PDF in assets/ from the HTML file with the same name.

Chromium writes the time into the PDF, so run it only after you change the HTML.

    python -m benchmarks.render_assets
"""

from __future__ import annotations

from .planner import ASSETS_DIR


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise SystemExit("playwright is not installed (uv sync && uv run playwright install chromium)") from error

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            page = browser.new_page()
            for source in sorted(ASSETS_DIR.glob("*.html")):
                page.goto(source.resolve().as_uri())
                page.pdf(path=source.with_suffix(".pdf"), prefer_css_page_size=True, print_background=True)
                print(f"rendered {source.with_suffix('.pdf').name}")
        finally:
            browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
