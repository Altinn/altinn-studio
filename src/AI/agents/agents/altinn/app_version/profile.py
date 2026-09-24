"""Everything the assistant does differently per Altinn app version."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class AppVersionProfile:
    major_version: int
    ui_anatomy_prompt: str
    version_rules_prompt: str
    layout_schema_location: str
    layout_schema_display_url: str
    binding_constraints: Mapping[str, Sequence[str]]
