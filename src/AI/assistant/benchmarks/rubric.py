"""The rubric of an e2e item, and its structural part from a checked app, which names no page, component or field."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from .app_model import DEFAULT_LANGUAGE, AppModel, load_app

RUBRIC_VERSION = 3


class _Part(BaseModel):
    # A key that no check reads fails, so that a misspelled key cannot turn its checks off unseen
    model_config = ConfigDict(extra="forbid", frozen=True)


class ConditionalField(_Part):
    field: str
    controller: str
    shown_for: str


class Pattern(_Part):
    field: str
    accepts: list[str]
    rejects: list[str]


class Prefill(_Part):
    source: Literal["ER", "DSF", "UserProfile"]
    title: str
    fields: list[str] = []
    versions: list[int] | None = None


class Attachment(_Part):
    content_types: list[str]
    max_size: int
    min_count: int
    max_count: int


class Gateway(_Part):
    field: str
    routes: dict[str, Literal["end", "signing"]]


class Receipt(_Part):
    fields: list[str] = []
    variable_fields: list[str] = []
    text: str


class Right(_Part):
    # None is the app as a whole, which instantiate needs
    task: Literal["data", "pdf", "signing", "end"] | None
    subject: str
    actions: list[str]
    only: list[str] = []


class Rubric(_Part):
    """What an item asks of the app, from its expectedOutput. A part the item leaves out turns its checks off."""

    rubric_version: int = RUBRIC_VERSION
    expected_pages: int | None = None
    min_input_components: int = 0
    expected_titles: list[str] = []
    navigation_required: bool = False
    languages: list[str] = [DEFAULT_LANGUAGE]
    language_selector: bool = False
    conditional_fields: list[ConditionalField] = []
    shared_code_list: list[str] = []
    code_list_files: list[str] = []
    required_fields: list[str] = []
    numeric_fields: list[str] = []
    patterns: list[Pattern] = []
    # The fields that an error rule in the validation file compares, one list for each rule
    compared_fields: list[list[str]] = []
    prefill: list[Prefill] = []
    party_types: dict[str, bool] = {}
    attachment: Attachment | None = None
    gateway: Gateway | None = None
    pdf_page_fields: list[str] = []
    signs: list[str] = []
    receipt: Receipt | None = None
    rights: list[Right] = []


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
