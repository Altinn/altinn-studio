"""Read the components of a layout file."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

NAVIGATION_COMPONENT_TYPES = frozenset({"NavigationButtons", "NavigationBar"})


def layout_components(parsed: Any) -> list[Any] | None:
    """`data.layout` of a parsed layout file, or None when it has no list there."""
    data = parsed.get("data") if isinstance(parsed, dict) else None
    layout = data.get("layout") if isinstance(data, dict) else None
    return layout if isinstance(layout, list) else None


def text_key_bindings(component: Any) -> dict[str, str]:
    """The text keys of a component's `textResourceBindings`, by binding. A binding to an expression has no key."""
    bindings = component.get("textResourceBindings") if isinstance(component, dict) else None
    if not isinstance(bindings, dict):
        return {}
    return {name: key for name, key in bindings.items() if isinstance(key, str) and key.strip()}


def has_navigation(components: Iterable[Any]) -> bool:
    return any(isinstance(c, dict) and c.get("type") in NAVIGATION_COMPONENT_TYPES for c in components)
