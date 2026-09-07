"""Benchmark wrapper around `agents.services.preview.render_check`: environment
configuration, and the `bench_renders` and `bench_pages_render` scores.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from agents.services.preview.render_check import (
    PageRenderResult,
    PreviewCheckUnavailable,
    render_check,
    swap_layout_in_preview_url,
)

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


def run(session_branch: str, page_order: list[str]) -> list[Score]:
    """Scores for every ordered page, or [] when the check could not run."""
    results = collect(session_branch, page_order)
    return build_scores(results) if results is not None else []


def collect(session_branch: str, page_order: list[str]) -> list[PageRenderResult] | None:
    """Per-page results, or None when infrastructure rather than the app under test
    prevented the check. Use instead of `run` when the failure details matter.
    """
    try:
        return _render_results(session_branch, page_order)
    except PreviewCheckUnavailable as reason:
        print(f"  preview check skipped: {reason}", file=sys.stderr)
        return None


def _render_results(session_branch: str, page_order: list[str]) -> list[PageRenderResult]:
    org, app = _repo_org_and_app()
    return render_check(
        studio_base=os.environ.get("BENCH_STUDIO_BASE_URL", DEFAULT_STUDIO_BASE_URL),
        username=os.environ.get("BENCH_STUDIO_USER", DEFAULT_STUDIO_USERNAME),
        org=org,
        app=app,
        branch=session_branch,
        page_order=page_order,
        storage_state_path=STORAGE_STATE_PATH,
    )


def _repo_org_and_app() -> tuple[str, str]:
    segments = [s for s in urlparse(os.environ["BENCH_REPO_URL"]).path.split("/") if s]
    return segments[0], segments[1].removesuffix(".git")


def build_scores(results: list[PageRenderResult]) -> list[Score]:
    rendered_count = sum(1 for result in results if result.rendered)
    failures = [result for result in results if not result.rendered]
    failure_summary = "; ".join(f"{failure.page}: {failure.detail}" for failure in failures)

    first = results[0] if results else None
    renders = Score(
        name=RENDERS_SCORE_NAME,
        value=1.0 if first and first.rendered else 0.0,
        data_type="BOOLEAN",
        comment=(
            f"first page {first.page!r} rendered"
            if first and first.rendered
            else f"first page failed — {first.page}: {first.detail}"
            if first
            else "no ordered pages to render"
        ),
    )
    pages_render = Score(
        name=PAGES_RENDER_SCORE_NAME,
        value=rendered_count / len(results) if results else 0.0,
        data_type="NUMERIC",
        comment=(
            f"{rendered_count}/{len(results)} pages rendered"
            + (f" — failed: {failure_summary}" if failures else "")
            if results
            else "no ordered pages to render"
        ),
    )
    return [renders, pages_render]



def _clone_branch(branch: str, workdir: Path) -> Path:
    import subprocess

    clone_base = os.environ.get("BENCH_GITEA_CLONE_BASE", "http://localhost/repos").rstrip("/")
    repo_path = urlparse(os.environ["BENCH_REPO_URL"]).path
    destination = workdir / "app"
    command = [
        "git",
        "-c",
        f"http.extraHeader=X-Api-Key: {os.environ['AGENT_DESIGNER_API_KEY']}",
        "clone",
        "--depth",
        "1",
        "--branch",
        branch,
        f"{clone_base}{repo_path}",
        str(destination),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"clone of {branch!r} failed: {result.stderr.strip().splitlines()[-1:]}")
    return destination


def _main() -> None:
    import argparse
    import tempfile

    from .app_model import load_app

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branch", required=True, help="session branch, e.g. altinity_session_1a2b3c4d")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="altinity-preview-") as tmp:
        page_order = load_app(_clone_branch(args.branch, Path(tmp))).page_order
    if not page_order:
        sys.exit("no ordered pages found on that branch")

    scores = run(args.branch, page_order)
    if not scores:
        sys.exit(1)
    for score in scores:
        print(f"{score.name} = {score.value}  ({score.comment})")


if __name__ == "__main__":
    _main()
