"""The structural scores of a built app: its pages, navigation, field titles and input count."""

from __future__ import annotations

from dataclasses import dataclass

from agents.altinn.layout.components import has_navigation

from .app_model import AppModel, normalize_title
from .rubric import Rubric


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


def evaluate(app: AppModel, rubric: Rubric) -> list[Score]:
    return [
        _pages(app, rubric),
        _navigation(app, rubric),
        _field_coverage(app, rubric),
        _input_count(app, rubric),
    ]


def _pages(app: AppModel, rubric: Rubric) -> Score:
    expected, actual = rubric.expected_pages, len(app.page_order)
    return Score(
        name="bench_pages",
        value=1.0 if expected in (None, actual) else 0.0,
        data_type="BOOLEAN",
        comment=f"expected {expected} ordered pages, found {actual}"
        if expected is not None
        else "rubric has no page count",
    )


def _navigation(app: AppModel, rubric: Rubric) -> Score:
    form = app.form
    if form is None or not rubric.navigation_required or len(form.order) < 2:
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


def _field_coverage(app: AppModel, rubric: Rubric) -> Score:
    expected_titles = [t for t in rubric.expected_titles if t]
    if not expected_titles:
        return Score("bench_field_coverage", 1.0, "NUMERIC", "rubric has no expected titles")
    # Titles that only their numbers tell apart, such as «A1. Navn» and «B2. Navn», need a field each
    same: dict[str, list[str]] = {}
    for title in expected_titles:
        same.setdefault(normalize_title(title), []).append(title)
    found = {key: {id(c) for title in titles for _, c in app.fields(title)} for key, titles in same.items()}
    missing = [title for key, titles in same.items() for title in titles[len(found[key]) :]]
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


def _input_count(app: AppModel, rubric: Rubric) -> Score:
    expected = rubric.min_input_components
    actual = len(app.input_components())
    value = 1.0 if expected == 0 else round(min(1.0, actual / expected), 4)
    return Score(
        name="bench_input_count",
        value=value,
        data_type="NUMERIC",
        comment=f"{actual} input components (rubric expects at least {expected})",
    )
