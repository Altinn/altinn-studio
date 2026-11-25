"""The structural scores of a built app: its pages, navigation, field titles and input count."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from agents.altinn.layout.components import has_navigation

from .app_model import AppModel


@dataclass(frozen=True)
class Score:
    name: str
    value: float
    data_type: str  # "BOOLEAN" | "NUMERIC"
    comment: str


SCORE_NAMES = (
    "bench_pages",
    "bench_navigation",
    "bench_field_coverage",
    "bench_input_count",
)


def evaluate(app: AppModel, rubric: dict[str, Any]) -> list[Score]:
    return [
        _pages(app, rubric),
        _navigation(app, rubric),
        _field_coverage(app, rubric),
        _input_count(app, rubric),
    ]


def _pages(app: AppModel, rubric: dict[str, Any]) -> Score:
    expected = int(rubric.get("expected_pages") or 0)
    actual = len(app.page_order)
    return Score(
        name="bench_pages",
        value=1.0 if actual == expected else 0.0,
        data_type="BOOLEAN",
        comment=f"expected {expected} ordered pages, found {actual}",
    )


def _navigation(app: AppModel, rubric: dict[str, Any]) -> Score:
    form = app.form
    if form is None or not rubric.get("navigation_required") or len(form.order) < 2:
        return Score("bench_navigation", 1.0, "BOOLEAN", "single page — nothing to navigate")
    missing = [page for page in form.order if not has_navigation(form.components(page))]
    return Score(
        name="bench_navigation",
        value=0.0 if missing else 1.0,
        data_type="BOOLEAN",
        comment=(
            f"pages without a navigation component: {missing}"
            if missing
            else "every ordered page has a navigation component"
        ),
    )


def _field_coverage(app: AppModel, rubric: dict[str, Any]) -> Score:
    expected_titles: list[str] = [t for t in rubric.get("expected_titles") or [] if t]
    if not expected_titles:
        return Score("bench_field_coverage", 1.0, "NUMERIC", "rubric has no expected titles")
    missing = [expected for expected in expected_titles if not app.fields(expected)]
    covered = len(expected_titles) - len(missing)
    preview = "; ".join(missing[:8]) + ("; …" if len(missing) > 8 else "")
    return Score(
        name="bench_field_coverage",
        value=round(covered / len(expected_titles), 4),
        data_type="NUMERIC",
        comment=(
            f"{covered}/{len(expected_titles)} expected field titles found"
            + (f" — missing: {preview}" if missing else "")
        ),
    )


def _input_count(app: AppModel, rubric: dict[str, Any]) -> Score:
    expected = int(rubric.get("min_input_components") or 0)
    actual = len(app.input_components())
    value = 1.0 if expected == 0 else round(min(1.0, actual / expected), 4)
    return Score(
        name="bench_input_count",
        value=value,
        data_type="NUMERIC",
        comment=f"{actual} input components (rubric expects at least {expected})",
    )
