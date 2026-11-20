"""Validation of text resource files. Errors are findings. Warnings do not make a file invalid."""

import json
from collections import Counter
from typing import Any

from agents.altinn.findings import Finding

from .base_validator import BaseValidator, SchemaPath


class ResourceValidator(BaseValidator):
    """Validator for Altinn text resource files"""

    def find_errors(self, data: Any) -> list[Finding]:
        """The schema errors and the duplicate text resource IDs in a parsed file."""
        entries = _entries(data)
        findings = [_schema_finding(path, message, entries) for path, message in self.iter_schema_errors(data)]
        if not entries:
            findings.append(Finding("no-resources", "", "No resources found in file"))
        return findings + _duplicate_id_findings(entries)


def text_resource_warnings(data: Any, ids_in_other_languages: dict[str, set[str]]) -> list[str]:
    """The missing translations and the empty texts in a parsed file."""
    warnings: list[str] = []
    entries = _entries(data)
    resource_ids = set(_resource_ids(entries))

    for language, other_ids in sorted(ids_in_other_languages.items()):
        missing = sorted(other_ids - resource_ids)
        if missing:
            warnings.append(f"Missing translations from {language}: {missing[:3]}")
            if len(missing) > 3:
                warnings.append(f"... and {len(missing) - 3} more")

    empty_values = [entry.get("id") for entry in _objects(entries) if _is_blank(entry.get("value", ""))]
    if empty_values:
        warnings.append(f"Resources with empty values: {empty_values}")

    return warnings


def text_resource_ids(data: Any) -> list[str]:
    """The IDs in a parsed file, in file order. An entry that has no valid ID gives no ID."""
    return _resource_ids(_entries(data))


def _entries(data: Any) -> list[Any]:
    """The `resources` array as it is in the file. Thus the indexes agree with the schema error paths."""
    resources = data.get("resources") if isinstance(data, dict) else None
    return resources if isinstance(resources, list) else []


def _objects(entries: list[Any]) -> list[dict[str, Any]]:
    """The entries that the business rules can read. The schema finds the errors in the other entries."""
    return [entry for entry in entries if isinstance(entry, dict)]


def _resource_ids(entries: list[Any]) -> list[str]:
    return [entry["id"] for entry in _objects(entries) if _is_id(entry.get("id"))]


def _is_id(value: Any) -> bool:
    return isinstance(value, str) and value != ""


def _is_blank(value: Any) -> bool:
    return isinstance(value, str) and not value.strip()


def _schema_finding(path: SchemaPath, message: str, entries: list[Any]) -> Finding:
    """The location of an error at `resources.3.value` is the ID of the text resource in entry 3.

    The location of any other error is its path in the file.
    """
    if len(path) >= 2 and path[0] == "resources" and isinstance(path[1], int):
        inside = path[2:]
        return Finding("schema", _name(entries[path[1]]), f"{_dotted(inside)}: {message}" if inside else message)
    return Finding("schema", _dotted(path), message)


def _name(entry: Any) -> str:
    """The ID of a text resource, or its content when it has no ID."""
    if isinstance(entry, dict) and _is_id(entry.get("id")):
        return entry["id"]
    return json.dumps(entry, ensure_ascii=False, sort_keys=True)


def _dotted(path: SchemaPath) -> str:
    return ".".join(str(part) for part in path)


def _duplicate_id_findings(entries: list[Any]) -> list[Finding]:
    """One finding for each text resource that repeats an ID. Thus a third copy of an ID is a new finding."""
    return [
        Finding("duplicate-id", resource_id, "more than one text resource has this ID")
        for resource_id, count in Counter(_resource_ids(entries)).items()
        for _ in range(count - 1)
    ]
