"""The page count, the input count, the field titles and the navigation of a checked app, for an item's rubric."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .app_model import AppModel, load_app

RUBRIC_VERSION = 3


def build_rubric(app: AppModel) -> dict[str, Any]:
    titles: list[str] = []
    seen: set[str] = set()
    for component in app.input_components():
        title = app.title_of(component)
        if title and title not in seen:
            seen.add(title)
            titles.append(title)

    return {
        "rubric_version": RUBRIC_VERSION,
        "expected_pages": len(app.page_order),
        "min_input_components": len(app.input_components()),
        "expected_titles": titles,
        "navigation_required": len(app.page_order) > 1,
    }


def build_rubric_from_dir(root: Path) -> dict[str, Any]:
    return build_rubric(load_app(root))
