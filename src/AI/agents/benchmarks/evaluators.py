"""Deterministic evaluators: score a candidate app against a rubric.

Each evaluator returns a Score the runner posts to Langfuse.  Boolean
scores are structural pass/fail; numeric scores are coverage ratios in
[0, 1] so partial regressions are visible instead of flapping a binary.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .app_model import AppModel, NAVIGATION_COMPONENT_TYPES, titles_match


@dataclass(frozen=True)
class Score:
    name: str
    value: float
    data_type: str  # "BOOLEAN" | "NUMERIC"
    comment: str


def evaluate(app: AppModel, rubric: dict[str, Any]) -> list[Score]:
    return [
        _pages(app, rubric),
        _order_integrity(app),
        _navigation(app, rubric),
        _field_coverage(app, rubric),
        _input_count(app, rubric),
        _texts_bound(app),
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


def _order_integrity(app: AppModel) -> Score:
    ordered = set(app.page_order)
    on_disk = set(app.layouts.keys())
    missing_files = sorted(ordered - on_disk)
    unlisted = sorted(on_disk - ordered)
    ok = not missing_files and not unlisted
    parts = []
    if missing_files:
        parts.append(f"in order but no layout file: {missing_files}")
    if unlisted:
        parts.append(f"layout file not in order: {unlisted}")
    return Score(
        name="bench_order_integrity",
        value=1.0 if ok else 0.0,
        data_type="BOOLEAN",
        comment="; ".join(parts) or "pages.order and layout files agree",
    )


def _navigation(app: AppModel, rubric: dict[str, Any]) -> Score:
    if not rubric.get("navigation_required") or len(app.page_order) < 2:
        return Score("bench_navigation", 1.0, "BOOLEAN", "single page — nothing to navigate")
    missing = [
        page
        for page in app.page_order
        if not any(
            c.get("type") in NAVIGATION_COMPONENT_TYPES for c in app.layouts.get(page, [])
        )
    ]
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
    candidate_titles = [t for t in (app.title_of(c) for c in app.input_components()) if t]
    missing = [
        expected
        for expected in expected_titles
        if not any(titles_match(expected, candidate) for candidate in candidate_titles)
    ]
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


def _texts_bound(app: AppModel) -> Score:
    """Every textResourceBindings value should resolve in resource.nb.json."""
    referenced: list[str] = []
    for component in app.ordered_components():
        for key in (component.get("textResourceBindings") or {}).values():
            if isinstance(key, str) and key.strip():
                referenced.append(key)
    if not referenced:
        return Score("bench_texts_bound", 0.0, "NUMERIC", "no text resource bindings at all")
    resolved = sum(1 for key in referenced if key in app.resources)
    missing = sorted({key for key in referenced if key not in app.resources})
    preview = "; ".join(missing[:8]) + ("; …" if len(missing) > 8 else "")
    return Score(
        name="bench_texts_bound",
        value=round(resolved / len(referenced), 4),
        data_type="NUMERIC",
        comment=(
            f"{resolved}/{len(referenced)} bindings resolve in resource.nb.json"
            + (f" — missing: {preview}" if missing else "")
        ),
    )
