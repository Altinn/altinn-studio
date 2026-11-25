"""Everything the assistant does differently per Altinn app version."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import PurePosixPath


@dataclass(frozen=True)
class AppVersionProfile:
    major_version: int
    ui_anatomy_prompt: str
    version_rules_prompt: str
    layout_schema_location: str
    layout_schema_display_url: str
    text_resources_schema_location: str
    binding_constraints: Mapping[str, Sequence[str]]
    forbidden_new_file_patterns: Mapping[str, str]
    # v8 maps UI folders to tasks and data types in App/ui/layout-sets.json. v9 names a folder after its task.
    uses_layout_sets: bool
    # The key in a data type of applicationmetadata.json that names its tasks.
    data_type_tasks_key: str
    heading_component: str
    # Functions in the expression schema that the version lacks. Only the backend evaluates a gateway condition,
    # so a condition may use the functions that only the frontend lacks.
    missing_expression_functions: frozenset[str]
    missing_frontend_expression_functions: frozenset[str]

    @property
    def version_label(self) -> str:
        return f"v{self.major_version}"

    def forbidden_file(self, path: str) -> str | None:
        """Why the version has no file at `path` and what it has instead, or None when it may have one."""
        patterns = self.forbidden_new_file_patterns.items()
        return next((instead for pattern, instead in patterns if PurePosixPath(path).match(pattern)), None)
