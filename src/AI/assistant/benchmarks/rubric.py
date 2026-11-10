"""Build a structural rubric from a golden app.

The rubric is stored as the dataset item's `expectedOutput` in Langfuse.
It is deliberately name-agnostic: no page IDs, no component IDs, no
data-model property names — different runs name those differently while
producing an equally correct form.  What must hold across any correct
run is structure (page count, navigation) and content (the field
titles a user actually sees).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .app_model import AppModel, load_app

RUBRIC_VERSION = 2


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
