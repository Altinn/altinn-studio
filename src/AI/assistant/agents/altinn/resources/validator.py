"""Resource validator tool with schema validation and business rules."""

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .base_validator import BaseValidator, SchemaPath


@dataclass(frozen=True)
class ResourceIssue:
    """An error in a text resource file"""

    message: str
    # The indexes in `resources` of the entries with the error. Empty for an error in the file itself.
    entries: tuple[int, ...] = ()


class ResourceValidator(BaseValidator):
    """Validator for Altinn text resource files"""

    def validate(
        self,
        data: dict[str, Any],
        context: dict[str, Any] | None = None,
        previous: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Validate against the schema and the business rules

        Context keys:
            - language: Language code (nb, nn, en)
            - layout_files: List of layout file paths to check usage
            - repo_path: Path to repository root

        `previous` is the file before the change. An error that the change did not cause is
        reported as a warning, so that old errors in a file do not block a correct change.
        Without `previous`, every error is reported as an error.
        """
        context = context or {}
        issues = self.find_issues(data, context)
        if previous is None:
            caused, existing = issues, []
        else:
            caused, existing = _split_by_cause(issues, data, previous, self.find_issues(previous, context))

        hints = self.find_hints(data, context)
        existing_warnings = [f"Existing error that this change did not cause: {issue.message}" for issue in existing]

        return {
            "valid": len(caused) == 0,
            "errors": [issue.message for issue in caused],
            "warnings": existing_warnings + hints["warnings"],
            "suggestions": hints["suggestions"],
        }

    def find_issues(self, data: dict[str, Any], context: dict[str, Any]) -> list[ResourceIssue]:
        """The schema errors and the business rule errors"""
        issues = [ResourceIssue(message, _entries_at(path)) for path, message in self.iter_schema_errors(data)]

        entries = _entries(data)
        if not entries:
            issues.append(ResourceIssue("No resources found in file"))
            return issues

        # Rule 1: Check for duplicate resource IDs
        issues.extend(_duplicate_id_issues(entries))

        # Rule 2: Check for resources referenced in layouts but not defined
        layout_files = context.get("layout_files", [])
        if layout_files:
            missing = self._extract_text_refs_from_layouts(layout_files) - set(_resource_ids(entries))
            if missing:
                issues.append(ResourceIssue(f"Resources referenced in layouts but not defined: {sorted(missing)}"))

        return issues

    def find_hints(self, data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        """Warnings and suggestions, which do not make the file invalid"""
        warnings = []
        suggestions = {}

        entries = _entries(data)
        resource_ids = _resource_ids(entries)

        # Rule 2: Check if resources are actually used in layouts
        layout_files = context.get("layout_files", [])
        if layout_files:
            unused = set(resource_ids) - self._extract_text_refs_from_layouts(layout_files)
            if unused:
                warnings.append(f"Unused resources (not referenced in layouts): {list(unused)[:5]}")
                if len(unused) > 5:
                    warnings.append(f"... and {len(unused) - 5} more unused resources")

        # Rule 3: Check for missing translations
        language = context.get("language", "nb")
        repo_path = context.get("repo_path")

        if repo_path:
            other_resources = self._get_other_language_resources(repo_path, language)

            for lang, other_ids in other_resources.items():
                missing_in_current = set(other_ids) - set(resource_ids)
                missing_in_other = set(resource_ids) - set(other_ids)

                if missing_in_current:
                    warnings.append(f"Missing translations from {lang}: {list(missing_in_current)[:3]}")
                    if len(missing_in_current) > 3:
                        warnings.append(f"... and {len(missing_in_current) - 3} more")

                if missing_in_other:
                    suggestions[f"add_to_{lang}_file"] = list(missing_in_other)[:5]

        # Rule 4: Check for empty values
        empty_values = [entry.get("id") for entry in _objects(entries) if _is_blank(entry.get("value", ""))]
        if empty_values:
            warnings.append(f"Resources with empty values: {empty_values}")

        # Rule 5: Suggest next ID based on pattern
        if resource_ids:
            suggestions["id_pattern_detected"] = self._detect_resource_id_pattern(resource_ids)
            suggestions["next_suggested_id"] = self._suggest_next_id(resource_ids)

        return {"warnings": warnings, "suggestions": suggestions}

    def _extract_text_refs_from_layouts(self, layout_files: list[str]) -> set[str]:
        return {ref for layout_file in layout_files for ref in self._extract_text_refs_from_layout(layout_file)}

    def _extract_text_refs_from_layout(self, layout_path: str) -> list[str]:
        """Extract all textResourceBindings references from a layout file"""
        try:
            with open(layout_path, encoding="utf-8") as f:
                data = json.load(f)

            # Extract components
            if "data" in data and "layout" in data["data"]:
                components = data["data"]["layout"]
            elif isinstance(data, list):
                components = data
            else:
                return []

            refs = []
            for comp in components:
                text_bindings = comp.get("textResourceBindings", {})
                for value in text_bindings.values():
                    if value:
                        refs.append(value)

            return refs
        except Exception:
            return []

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
                        other_resources[lang] = _resource_ids(_entries(data))
                    except Exception:
                        continue

            return other_resources
        except Exception:
            return {}

    def _detect_resource_id_pattern(self, resource_ids: list[str]) -> str:
        """Detect common resource ID pattern"""
        if not resource_ids:
            return "unknown"

        # Check for common patterns
        patterns = {
            "dotted": 0,  # label.field.name
            "underscored": 0,  # label_field_name
            "simple": 0,  # fieldname
        }

        for rid in resource_ids:
            if "." in rid:
                patterns["dotted"] += 1
            elif "_" in rid:
                patterns["underscored"] += 1
            else:
                patterns["simple"] += 1

        # Return most common pattern
        return max(patterns, key=lambda pattern: patterns[pattern])

    def _suggest_next_id(self, resource_ids: list[str]) -> str:
        """Suggest next resource ID based on pattern"""
        if not resource_ids:
            return "label.new.field"

        pattern = self._detect_resource_id_pattern(resource_ids)

        if pattern == "dotted":
            # Try to find common prefix
            if all("." in rid for rid in resource_ids):
                prefixes = [rid.split(".")[0] for rid in resource_ids]
                most_common_prefix = max(set(prefixes), key=prefixes.count)
                return f"{most_common_prefix}.new.field"

        elif pattern == "underscored":
            return "label_new_field"

        return "new_field"


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


def _entries_at(path: SchemaPath) -> tuple[int, ...]:
    """A schema error at `resources.3.value` is in entry 3. Any other path is in the file itself."""
    if len(path) >= 2 and path[0] == "resources" and isinstance(path[1], int):
        return (path[1],)
    return ()


def _duplicate_id_issues(entries: list[Any]) -> list[ResourceIssue]:
    indexes_by_id: dict[str, list[int]] = defaultdict(list)
    for index, entry in enumerate(entries):
        if isinstance(entry, dict) and _is_id(entry.get("id")):
            indexes_by_id[entry["id"]].append(index)
    return [
        ResourceIssue(f"Duplicate resource ID: {resource_id!r}", tuple(indexes))
        for resource_id, indexes in indexes_by_id.items()
        if len(indexes) > 1
    ]


def _split_by_cause(
    issues: list[ResourceIssue],
    data: dict[str, Any],
    previous: dict[str, Any],
    previous_issues: list[ResourceIssue],
) -> tuple[list[ResourceIssue], list[ResourceIssue]]:
    """Split the issues into those the change from `previous` caused and those it did not.

    The change caused an issue in entries when it added or changed one of them. It caused an
    issue in the file itself when `previous` does not have the same issue.
    """
    changed_entries = _changed_entries(_entries(data), _entries(previous))
    previous_file_issues = {issue.message for issue in previous_issues if not issue.entries}

    caused: list[ResourceIssue] = []
    existing: list[ResourceIssue] = []
    for issue in issues:
        if issue.entries:
            is_caused = not changed_entries.isdisjoint(issue.entries)
        else:
            is_caused = issue.message not in previous_file_issues
        (caused if is_caused else existing).append(issue)
    return caused, existing


def _changed_entries(entries: list[Any], previous_entries: list[Any]) -> set[int]:
    """The indexes of the entries that `previous_entries` does not have.

    An entry counts as unchanged where it is identical to an entry in `previous_entries`, so
    moving entries does not change them. Each previous entry matches one entry only, so a copy
    of an entry counts as added.
    """
    unmatched = Counter(_canonical(entry) for entry in previous_entries)
    changed: set[int] = set()
    for index, entry in enumerate(entries):
        key = _canonical(entry)
        if unmatched[key] > 0:
            unmatched[key] -= 1
        else:
            changed.add(index)
    return changed


def _canonical(entry: Any) -> str:
    return json.dumps(entry, sort_keys=True)


def _parse_previous(previous_resource_json: str | None) -> dict[str, Any] | None:
    """The file before the change, or None when there is no readable previous version to compare with"""
    if previous_resource_json is None:
        return None
    try:
        previous = json.loads(previous_resource_json)
    except json.JSONDecodeError:
        return None
    return previous if isinstance(previous, dict) else None


def resource_validator_tool(
    user_goal: str,
    resource_json: str,
    schema: dict[str, Any],
    language: str = "nb",
    layout_files: list[str] | None = None,
    repo_path: str | None = None,
    previous_resource_json: str | None = None,
) -> dict[str, Any]:
    """
    Validate text resource JSON against the schema and the business rules

    With `previous_resource_json`, the file before the change, errors that the change did not
    cause are warnings.
    """
    try:
        # Parse input
        try:
            data = json.loads(resource_json)
        except json.JSONDecodeError as e:
            return {
                "valid": False,
                "error_code": "INVALID_JSON",
                "errors": [f"JSON_PARSE_ERROR: The resource_json is not valid JSON. Error: {e!s}"],
                "warnings": [],
                "suggestions": {},
                "hint": "Check for: missing quotes, trailing commas, unescaped characters in the JSON.",
                "retry_allowed": False,
            }

        # Create validator and run validation
        validator = ResourceValidator(schema)

        context: dict[str, Any] = {"language": language}
        if layout_files:
            context["layout_files"] = layout_files
        if repo_path:
            context["repo_path"] = repo_path

        return validator.validate(data, context, _parse_previous(previous_resource_json))

    except Exception as e:
        return {
            "valid": False,
            "errors": [f"Validation error: {e!s}"],
            "warnings": [],
            "suggestions": {},
        }
