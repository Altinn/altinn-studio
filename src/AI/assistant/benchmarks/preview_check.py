"""Benchmark wrapper around `agents.services.preview.render_check`: environment
configuration, and the `bench_renders` and `bench_pages_render` scores.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from agents.services.preview.render_check import (
    PageRenderResult,
    PreviewCheckUnavailable,
    render_check,
    swap_layout_in_preview_url,
)

from .bench_app import BenchAppError, clone_branch
from .evaluators import Score

RENDERS_SCORE_NAME = "bench_renders"
PAGES_RENDER_SCORE_NAME = "bench_pages_render"
RENDER_FIX_ROUNDS_SCORE_NAME = "bench_render_fix_rounds"
PAGES_RENDER_AFTER_FIX_SCORE_NAME = "bench_pages_render_after_fix"

__all__ = [
    "PageRenderResult",
    "PreviewCheckUnavailable",
    "build_scores",
    "collect",
    "is_enabled",
    "run",
    "swap_layout_in_preview_url",
]

ENABLE_FLAG = "BENCH_PREVIEW_CHECK"
DEFAULT_STUDIO_BASE_URL = "http://studio.localhost"
DEFAULT_STUDIO_USERNAME = "localgiteaadmin"
STORAGE_STATE_PATH = Path(__file__).parent / ".playwright-auth.json"


def is_enabled() -> bool:
    return os.environ.get(ENABLE_FLAG, "0") == "1"


def run(repo: str, session_branch: str, page_order: list[str]) -> list[Score]:
    """Scores for every ordered page of `repo` (`org/app`), or [] when the check could not run."""
    results = collect(repo, session_branch, page_order)
    return build_scores(results) if results is not None else []


def collect(repo: str, session_branch: str, page_order: list[str]) -> list[PageRenderResult] | None:
    """Per-page results, or None when infrastructure rather than the app under test
    prevented the check. Use instead of `run` when the failure details matter.
    """
    try:
        return _in_worker_thread(repo, session_branch, page_order)
    except PreviewCheckUnavailable as reason:
        print(f"  preview check skipped: {reason}", file=sys.stderr)
        return None


def _in_worker_thread(repo: str, session_branch: str, page_order: list[str]) -> list[PageRenderResult]:
    """Playwright's sync API will not start on a thread with a running event loop."""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(_render_results, repo, session_branch, page_order).result()


def _render_results(repo: str, session_branch: str, page_order: list[str]) -> list[PageRenderResult]:
    repo_owner, _, app = repo.partition("/")
    return render_check(
        studio_base=os.environ.get("BENCH_STUDIO_BASE_URL", DEFAULT_STUDIO_BASE_URL),
        username=os.environ.get("BENCH_STUDIO_USER", DEFAULT_STUDIO_USERNAME),
        repo_owner=repo_owner,
        app=app,
        branch=session_branch,
        page_order=page_order,
        storage_state_path=STORAGE_STATE_PATH,
    )


def build_scores(results: list[PageRenderResult]) -> list[Score]:
    """Pages the preview never answered for are left out, not counted as failures."""
    measured = [result for result in results if result.measured]
    skipped = [result for result in results if not result.measured]
    rendered_count = sum(1 for result in measured if result.rendered)
    failures = [result for result in measured if not result.rendered]
    failure_summary = "; ".join(f"{failure.page}: {failure.detail}" for failure in failures)
    skipped_note = (
        f" — {len(skipped)} page(s) the preview never answered for: " + ", ".join(result.page for result in skipped)
        if skipped
        else ""
    )

    entry = results[0] if results else None
    entry_unmeasured = entry is not None and not entry.measured
    renders = Score(
        name=RENDERS_SCORE_NAME,
        value=1.0 if entry and entry.rendered else 0.0,
        data_type="BOOLEAN",
        comment=(
            f"first page {entry.page!r} rendered"
            if entry and entry.rendered
            else f"first page failed — {entry.page}: {entry.detail}"
            if entry
            else "no ordered pages to render"
        ),
    )

    pages_render = Score(
        name=PAGES_RENDER_SCORE_NAME,
        value=rendered_count / len(measured) if measured else 0.0,
        data_type="NUMERIC",
        comment=(
            f"{rendered_count}/{len(measured)} pages rendered"
            + (f" — failed: {failure_summary}" if failures else "")
            + skipped_note
            if measured
            else f"no ordered pages to render{skipped_note}"
        ),
    )
    # An unmeasured entry page is not evidence either way, and a later page's
    # result is not the entry page's.
    return [pages_render] if entry_unmeasured else [renders, pages_render]


def _main() -> None:
    import argparse
    import tempfile

    from .app_model import load_app

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="the bench app, e.g. ttd/bench-v9-20261125-101500")
    parser.add_argument("--branch", required=True, help="session branch, e.g. assistant_1a2b3c4d")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="altinity-preview-") as tmp:
        try:
            clone = clone_branch(args.repo, args.branch, Path(tmp) / "app", os.environ["AGENT_DESIGNER_API_KEY"])
        except BenchAppError as error:
            sys.exit(str(error))
        page_order = load_app(clone).page_order
    if not page_order:
        sys.exit("no ordered pages found on that branch")

    scores = run(args.repo, args.branch, page_order)
    if not scores:
        sys.exit(1)
    for score in scores:
        print(f"{score.name} = {score.value}  ({score.comment})")


if __name__ == "__main__":
    _main()


SCORE_NAMES = (RENDERS_SCORE_NAME, PAGES_RENDER_SCORE_NAME)
