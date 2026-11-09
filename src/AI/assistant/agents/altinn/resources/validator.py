"""Text resource validation: errors as findings, and warnings that never make a file invalid."""

import json
from collections import Counter
from pathlib import Path
from typing import Any

from agents.altinn.findings import Finding

from .base_validator import BaseValidator, SchemaPath


class ResourceValidator(BaseValidator):
    """Validator for Altinn text resource files"""

    def find_errors_in_text(self, content: str) -> list[Finding]:
        """The errors in the text of a resource file, starting with whether it is JSON"""
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            return [Finding("invalid-json", "", f"invalid JSON — {exc}")]
        return self.find_errors(data)

    def find_errors(self, data: Any) -> list[Finding]:
        """The schema errors and the business rule errors"""
        entries = _entries(data)
        findings = [_schema_finding(path, message, entries) for path, message in self.iter_schema_errors(data)]
        if not entries:
            findings.append(Finding("no-resources", "", "No resources found in file"))
            return findings

        # Rule 1: Check for duplicate resource IDs
        findings.extend(_duplicate_id_findings(entries))
        return findings

    def find_warnings(self, data: Any, language: str, repo_path: str | None) -> list[str]:
        """Hints about the file, which never make it invalid"""
        warnings: list[str] = []

        entries = _entries(data)
        resource_ids = _resource_ids(entries)

        # Rule 2: Check for missing translations
        if repo_path:
            other_resources = self._get_other_language_resources(repo_path, language)

            for lang, other_ids in other_resources.items():
                missing_in_current = set(other_ids) - set(resource_ids)

                if missing_in_current:
                    warnings.append(f"Missing translations from {lang}: {list(missing_in_current)[:3]}")
                    if len(missing_in_current) > 3:
                        warnings.append(f"... and {len(missing_in_current) - 3} more")

        # Rule 3: Check for empty values
        empty_values = [entry.get("id") for entry in _objects(entries) if _is_blank(entry.get("value", ""))]
        if empty_values:
            warnings.append(f"Resources with empty values: {empty_values}")

        return warnings

    def _get_other_language_resources(self, repo_path: str, current_lang: str) -> dict[str, list[str]]:
        """Get resource IDs from other language files"""
        try:
            resource_dir = Path(repo_path) / "App" / "config" / "texts"
            if not resource_dir.exists():
                return {}

            other_resources = {}
            for resource_file in resource_dir.glob("resource.*.json"):
                # Extract language code (e.g., 'nb' from 'resource.nb.json')
                lang = resource_file.stem.split(".")[-1]

                if lang != current_lang:
                    try:
                        with open(resource_file, encoding="utf-8") as f:
                            data = json.load(f)
                        other_resources[lang] = text_resource_ids(data)
                    except Exception:
                        continue

            return other_resources
        except Exception:
            return {}


def text_resource_ids(data: Any) -> list[str]:
    """The ids in a parsed text resource file, in file order. Entries without a readable id are left out."""
    return _resource_ids(_entries(data))


def _entries(data: Any) -> list[Any]:
    """The `resources` array as it is in the file, so that indexes match the schema error paths"""
    resources = data.get("resources") if isinstance(data, dict) else None
    return resources if isinstance(resources, list) else []


def _objects(entries: list[Any]) -> list[dict[str, Any]]:
    """The entries the business rules can read. The schema reports the others."""
    return [entry for entry in entries if isinstance(entry, dict)]


def _resource_ids(entries: list[Any]) -> list[str]:
    return [entry["id"] for entry in _objects(entries) if _is_id(entry.get("id"))]


def _is_id(value: Any) -> bool:
    return isinstance(value, str) and value != ""


def _is_blank(value: Any) -> bool:
    return isinstance(value, str) and not value.strip()


def _schema_finding(path: SchemaPath, message: str, entries: list[Any]) -> Finding:
    """An error at `resources.3.value` is at the text resource in entry 3, under its ID. Any other error is at its
    path in the file."""
    if len(path) >= 2 and path[0] == "resources" and isinstance(path[1], int):
        inside = path[2:]
        return Finding("schema", _name(entries[path[1]]), f"{_dotted(inside)}: {message}" if inside else message)
    return Finding("schema", _dotted(path), message)


def _name(entry: Any) -> str:
    """A text resource's ID, or its content when it has no ID"""
    if isinstance(entry, dict) and _is_id(entry.get("id")):
        return entry["id"]
    return json.dumps(entry, ensure_ascii=False, sort_keys=True)


def _dotted(path: SchemaPath) -> str:
    return ".".join(str(part) for part in path)


def _duplicate_id_findings(entries: list[Any]) -> list[Finding]:
    """One finding for each text resource that repeats an ID, so that a third copy of an ID is a new finding"""
    return [
        Finding("duplicate-id", resource_id, "more than one text resource has this ID")
        for resource_id, count in Counter(_resource_ids(entries)).items()
        for _ in range(count - 1)
    ]
