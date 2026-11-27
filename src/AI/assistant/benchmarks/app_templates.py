"""The app templates in src/App/template that the e2e evals build on."""

from __future__ import annotations

from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parents[3] / "App" / "template"


def template_ids() -> list[str]:
    """The templates Designer offers: the folders whose `src` has an apptemplate.json."""
    return sorted(manifest.parent.parent.name for manifest in TEMPLATES_DIR.glob("*/src/apptemplate.json"))


def template_source(template: str) -> Path:
    available = template_ids()
    if template not in available:
        raise ValueError(f"{template!r} is not a known app template. Available: {', '.join(available) or 'none'}.")
    return TEMPLATES_DIR / template / "src"
