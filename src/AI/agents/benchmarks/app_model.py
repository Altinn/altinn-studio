"""Load an Altinn app directory into a minimal structure for evaluation.

The benchmark evaluates the app as committed to the session branch (a
git clone), NOT a reconstruction from trace spans — traces truncate
long payloads and don't carry every file, the repo is the ground truth.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

# Component types that collect user input.  Used both for counting
# fields and for collecting the field titles the rubric matches on.
INPUT_COMPONENT_TYPES = {
    "Input",
    "TextArea",
    "RadioButtons",
    "Checkboxes",
    "Dropdown",
    "Datepicker",
    "DatePicker",
    "FileUpload",
    "FileUploadWithTag",
    "MultipleSelect",
    "List",
    "Address",
}

NAVIGATION_COMPONENT_TYPES = {"NavigationButtons", "NavigationBar"}


@dataclass
class AppModel:
    """One layout set + the app's Norwegian text resources."""

    page_order: list[str] = field(default_factory=list)
    # page name -> flat component list (dicts as parsed from layout JSON)
    layouts: dict[str, list[dict]] = field(default_factory=dict)
    # resource id -> value (from resource.nb.json)
    resources: dict[str, str] = field(default_factory=dict)

    def ordered_components(self) -> list[dict]:
        out: list[dict] = []
        for page in self.page_order:
            out.extend(self.layouts.get(page, []))
        return out

    def input_components(self) -> list[dict]:
        return [
            c for c in self.ordered_components() if c.get("type") in INPUT_COMPONENT_TYPES
        ]

    def title_of(self, component: dict) -> str | None:
        """Resolve a component's title binding to its nb text, if any."""
        key = (component.get("textResourceBindings") or {}).get("title")
        if not isinstance(key, str):
            return None
        return self.resources.get(key, key if key.strip() else None)


def load_app(root: Path) -> AppModel:
    """Load the app at `root` (repo root containing `App/`).

    Picks the layout set whose Settings.json has a `pages.order`; when
    several exist, the one with the most ordered pages wins.
    """
    model = AppModel()

    best_order: list[str] = []
    best_layouts_dir: Path | None = None
    for settings_path in sorted((root / "App" / "ui").rglob("Settings.json")):
        try:
            settings = json.loads(settings_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        order = (settings.get("pages") or {}).get("order")
        if isinstance(order, list) and len(order) > len(best_order):
            best_order = [p for p in order if isinstance(p, str)]
            best_layouts_dir = settings_path.parent / "layouts"

    model.page_order = best_order
    if best_layouts_dir and best_layouts_dir.is_dir():
        for layout_path in sorted(best_layouts_dir.glob("*.json")):
            try:
                parsed = json.loads(layout_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            components = ((parsed.get("data") or {}).get("layout")) or []
            if isinstance(components, list):
                model.layouts[layout_path.stem] = [c for c in components if isinstance(c, dict)]

    resource_path = root / "App" / "config" / "texts" / "resource.nb.json"
    try:
        resource = json.loads(resource_path.read_text(encoding="utf-8"))
        for entry in resource.get("resources") or []:
            if isinstance(entry, dict) and isinstance(entry.get("id"), str):
                model.resources[entry["id"]] = str(entry.get("value", ""))
    except (OSError, json.JSONDecodeError):
        pass

    return model


_WHITESPACE_RE = re.compile(r"\s+")
_NOISE_RE = re.compile(r"[^0-9a-zæøå ]")
# Leading enumeration like "A.1 ", "B2. ", "1.2.3 " — form titles often
# carry these while the source PDF (or another run) doesn't.  The token
# must contain a digit (so real words are never stripped) and end at
# whitespace.
_ENUMERATION_RE = re.compile(r"^(?=[a-zæøå0-9.)]*\d)[a-zæøå]?[\d.)]+\s+")


def normalize_title(text: str) -> str:
    """Normalize a field title for cross-run comparison.

    Lowercase, strip diacritic-free noise and leading enumeration, and
    collapse whitespace — so "A.1 Leverandørvirksomhetens navn:" matches
    "leverandørvirksomhetens navn" regardless of naming style.
    """
    text = unicodedata.normalize("NFKC", text).lower().strip()
    text = _ENUMERATION_RE.sub("", text)
    text = _NOISE_RE.sub(" ", text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def titles_match(expected: str, candidate: str) -> bool:
    """One expected title matches a candidate when either normalized
    form contains the other (runs disagree about prefixes/suffixes, not
    about the core wording)."""
    e, c = normalize_title(expected), normalize_title(candidate)
    if not e or not c:
        return False
    return e in c or c in e
