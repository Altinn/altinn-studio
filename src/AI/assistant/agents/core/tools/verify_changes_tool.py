"""`verify_changes` — validate files modified this session.

Dispatches each changed file to the appropriate in-process validator
(from `agents.altinn`) based on its path:

  * `App/ui/**/layouts/*.json` → layout schema validation
  * `App/config/texts/resource.*.json` → text-resource validation
  * any other `.json` → JSON parseability only
  * anything else (`.cs`, `.xml`, …) → noted, no automated check

Successful verification records the file in `ctx.extras["verified_files"]`
so `commit_session_branch` can refuse to commit any changed file that
hasn't been verified since its last edit (the set is reset whenever a
file is edited or written — see `utils.repo_files.mark_changed`).

Validation runs in-process — no network round-trip except the (cached)
v8 schema fetch from altinncdn.no.  v9 schemas are read from disk.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any

from pydantic import BaseModel, ConfigDict

from agents.altinn.layout import get_layout_schema, get_referenced_schemas
from agents.altinn.layout.schema_validator import validate_layout_json
from agents.altinn.resources.validator import resource_validator_tool
from agents.core.tool import LoopContext, ToolResult, WriteTool
from shared.utils.langfuse_utils import trace_span

# App files can start with a UTF-8 BOM.
_JSON_FILE_ENCODING = "utf-8-sig"
_MAX_LISTED_ERRORS = 10
_MAX_LISTED_WARNINGS = 5
_MAX_LISTED_TEXT_KEYS = 8
_MAX_LISTED_COMPONENT_TYPES = 3
_SCHEMA_VIOLATION_KEYWORDS = (
    "additionalproperties",
    "unknown property",
    "not allowed",
    "required property",
    "is required",
)


class VerifyChangesArgs(BaseModel):
    """No inputs — verifies whatever the session has edited so far."""

    model_config = ConfigDict(extra="forbid")


class VerifyChangesTool(WriteTool[VerifyChangesArgs]):
    name = "verify_changes"
    description = (
        "Validate the files you've modified this session against the "
        "official Altinn schemas.  Routes each file to the right "
        "validator based on its path: layout JSON, text resource JSON, "
        "or basic JSON parse for everything else.  Returns "
        "`{passed, checked_files, notes}` where notes list per-file "
        "outcomes and any validation errors.\n\n"
        "WHEN to call: between your last edit and `commit_session_branch`.  "
        "Always.  `commit_session_branch` refuses to run if any changed "
        "file has not been verified since its last edit.\n\n"
        "ON FAILURE: the notes point at specific files and rules.  Do a "
        "targeted `edit_file` to address each issue, then call "
        "`verify_changes` again.\n\n"
        "Takes no input — reads the change set tracked across this session."
    )
    input_schema = VerifyChangesArgs
    is_concurrency_safe = True  # reads only

    async def run(self, args: VerifyChangesArgs, ctx: LoopContext) -> ToolResult:
        changed = sorted(ctx.extras.get("changed_files") or [])
        if not changed:
            return ToolResult(
                content=(
                    "No changed files recorded.  Use `edit_file` or `write_file` "
                    "to make changes first, then call `verify_changes`."
                ),
                is_error=True,
            )

        file_notes, verified_now = _verify_files(ctx, changed)
        cross_file_passed, cross_file_notes = _run_cross_file_checks(ctx, changed)
        notes = file_notes + cross_file_notes
        passed = verified_now == set(changed) and cross_file_passed

        # Only mark files verified-passed on the assertion that *this whole
        # run* passed.  A partial-pass would let the model commit some
        # files while others still fail — refuse the easy short-circuit.
        if passed:
            verified_set: set[str] = ctx.extras.setdefault("verified_files", set())
            verified_set.update(verified_now)

        body = {
            "passed": passed,
            "checked_files": changed,
            "notes": notes,
        }
        return ToolResult(
            content=json.dumps(body, ensure_ascii=False, indent=2),
            is_error=not passed,
            metadata={"file_count": len(changed), "passed": passed},
        )


def _verify_files(ctx: LoopContext, changed: list[str]) -> tuple[list[str], set[str]]:
    """Return the notes for each file and the files that passed."""
    notes: list[str] = []
    passed_files: set[str] = set()
    for file_path in changed:
        try:
            ok, file_notes = _verify_one(ctx, file_path)
        except Exception as exc:
            ok = False
            file_notes = [f"{file_path}: verifier crashed — {exc}"]
        notes.extend(file_notes)
        if ok:
            passed_files.add(file_path)
    return notes, passed_files


def _run_cross_file_checks(ctx: LoopContext, changed: list[str]) -> tuple[bool, list[str]]:
    notes: list[str] = []
    passed = True
    for cross_file_check in _CROSS_FILE_CHECKS:
        check_ok, check_notes = cross_file_check(ctx, changed)
        notes.extend(check_notes)
        passed = passed and check_ok
    return passed, notes


# ---------------------------------------------------------------------------
# Per-file dispatch
# ---------------------------------------------------------------------------


def _verify_one(ctx: LoopContext, file_path: str) -> tuple[bool, list[str]]:
    """Return `(passed, notes)` for a single changed file."""
    full_path = Path(ctx.repo_path) / file_path
    if not full_path.exists():
        # `discard_file_changes` removes the entry from `changed_files`,
        # so reaching this branch means the file was deleted some other
        # way — flag it rather than crash.
        return False, [f"{file_path}: file does not exist on disk"]

    if _is_layout_file(file_path):
        return _validate_layout(file_path, full_path, ctx.app_version_profile.layout_schema_location)
    if _is_text_resource(file_path):
        return _validate_resource(ctx, file_path, full_path)
    if _is_layout_settings(file_path):
        return _validate_layout_settings(file_path, full_path)
    if file_path.endswith(".json"):
        return _basic_json_check(file_path, full_path)
    # Non-JSON file (.cs, .xml, .razor, …): no automated validator wired
    # in.  Don't fail commit on these — flag for the model's awareness.
    return True, [f"{file_path}: no automated validator for this file type"]


def _is_layout_file(file_path: str) -> bool:
    """Is this a layout JSON (not Settings.json or layout-sets.json)?"""
    if not file_path.endswith(".json"):
        return False
    if "layouts" not in file_path:
        return False
    name = Path(file_path).name
    # Settings.json and layout-sets.json live near layouts but use
    # different schemas — the layout validator would reject them.
    return not (name == "Settings.json" or name == "layout-sets.json")


def _is_layout_settings(file_path: str) -> bool:
    """Settings.json / layout-sets.json next to a layouts dir."""
    return Path(file_path).name in ("Settings.json", "layout-sets.json") and "ui" in file_path


def _is_text_resource(file_path: str) -> bool:
    """Is this an Altinn text resource (App/config/texts/resource.*.json)?"""
    if not file_path.endswith(".json"):
        return False
    name = Path(file_path).name
    return "texts" in file_path and name.startswith("resource.")


# ---------------------------------------------------------------------------
# Cross-file check: page navigation
# ---------------------------------------------------------------------------


_NAVIGATION_COMPONENT_TYPES = {"NavigationButtons", "NavigationBar"}


def _check_page_navigation(ctx: LoopContext, changed: list[str]) -> tuple[bool, list[str]]:
    """In a multi-page layout set, every changed page must carry a
    navigation component.

    `pages.order` in Settings.json controls the page sequence, but without
    a `NavigationButtons` (or `NavigationBar`) component on the page the
    user has nothing to click to move between pages — a schema-valid
    layout that is unusable in the runtime.  Only pages the session
    actually touched are checked, so pre-existing pages with bespoke
    navigation never block a commit.
    """
    repo = Path(ctx.repo_path)
    candidates = (_describe_missing_navigation(repo, f) for f in changed if _is_layout_file(f))
    notes = [note for note in candidates if note]
    return not notes, notes


def _describe_missing_navigation(repo: Path, file_path: str) -> str | None:
    layouts_dir = Path(file_path).parent
    order = _read_page_order(repo / layouts_dir.parent / "Settings.json")
    if order is None or len(order) < 2:
        return None  # single-page set (or unreadable settings) — nothing to navigate
    if Path(file_path).stem not in order:
        return None  # not part of the ordered page flow
    if _has_navigation_component(repo / file_path):
        return None
    return (
        f"{file_path}: page is in a multi-page flow ({len(order)} pages in "
        "`pages.order`) but has no `NavigationButtons` component — users "
        "cannot move between pages.  Add a `NavigationButtons` component "
        "to the layout (check `altinn_layout_props(component_type="
        "'NavigationButtons')` for its schema)."
    )


# ---------------------------------------------------------------------------
# Cross-file check: text resource keys
# ---------------------------------------------------------------------------


def _check_text_keys(ctx: LoopContext, changed: list[str]) -> tuple[bool, list[str]]:
    """Every `textResourceBindings` key must exist in every language the app serves.

    A key missing from one language renders as the key itself in that language.
    """
    repo = Path(ctx.repo_path)
    by_language = _text_keys_by_language(repo)
    if not by_language:
        return True, []  # no readable text resources — nothing to resolve against

    notes = [
        note
        for layout in _select_layouts_to_check(repo, changed)
        for note in _describe_missing_text_keys(repo, layout, by_language)
    ]
    return not notes, notes


def _select_layouts_to_check(repo: Path, changed: list[str]) -> list[Path]:
    # A changed resource file can strip a key any layout still references.
    if any(_is_text_resource(f) for f in changed):
        return _all_layout_files(repo)
    return [repo / f for f in changed if _is_layout_file(f)]


def _describe_missing_text_keys(repo: Path, layout: Path, by_language: dict[str, set[str]]) -> list[str]:
    referenced = _referenced_text_keys(layout)
    notes: list[str] = []
    for language, known in sorted(by_language.items()):
        missing = sorted(key for key in referenced if key not in known)
        if missing:
            notes.append(
                f"{layout.relative_to(repo)}: text key(s) {_list_text_keys(missing)} have no entry in "
                f"`App/config/texts/resource.{language}.json`, so the page shows the "
                "key instead of the text in that language."
            )
    return notes


def _list_text_keys(keys: list[str]) -> str:
    listed = ", ".join(f"`{key}`" for key in keys[:_MAX_LISTED_TEXT_KEYS])
    if len(keys) > _MAX_LISTED_TEXT_KEYS:
        listed += f", and {len(keys) - _MAX_LISTED_TEXT_KEYS} more"
    return listed


def _text_keys_by_language(repo: Path) -> dict[str, set[str]]:
    """The ids each `resource.<language>.json` defines."""
    texts_dir = repo / "App" / "config" / "texts"
    by_language: dict[str, set[str]] = {}
    for path in sorted(texts_dir.glob("resource.*.json")):
        keys = _read_text_keys(path)
        if keys is not None:
            by_language[_infer_resource_language(str(path))] = keys
    return by_language


def _read_text_keys(resource_path: Path) -> set[str] | None:
    try:
        parsed = json.loads(resource_path.read_text(encoding=_JSON_FILE_ENCODING))
    except OSError, json.JSONDecodeError:
        return None
    return {
        entry["id"]
        for entry in parsed.get("resources") or []
        if isinstance(entry, dict) and isinstance(entry.get("id"), str)
    }


def _all_layout_files(repo: Path) -> list[Path]:
    return sorted(p for p in repo.glob("App/ui/**/*.json") if _is_layout_file(str(p)))


def _referenced_text_keys(layout_path: Path) -> set[str]:
    keys: set[str] = set()
    # An unreadable layout has no keys here: the schema validator owns unreadable layouts.
    for component in _read_layout_components(layout_path) or []:
        if isinstance(component, dict):
            keys.update(_get_bound_text_keys(component))
    return keys


def _get_bound_text_keys(component: dict[str, Any]) -> set[str]:
    bindings = component.get("textResourceBindings") or {}
    return {value for value in bindings.values() if isinstance(value, str) and value.strip()}


def _read_page_order(settings_path: Path) -> list[str] | None:
    """Return `pages.order` from a layout-set Settings.json, or None."""
    try:
        settings = json.loads(settings_path.read_text(encoding=_JSON_FILE_ENCODING))
    except OSError, json.JSONDecodeError:
        return None
    order = (settings.get("pages") or {}).get("order")
    if isinstance(order, list) and all(isinstance(p, str) for p in order):
        return order
    return None


def _has_navigation_component(layout_path: Path) -> bool:
    """Does the layout contain a NavigationButtons/NavigationBar component?"""
    components = _read_layout_components(layout_path)
    if components is None:
        return True  # unreadable/invalid JSON is the schema validator's problem
    return any(isinstance(c, dict) and c.get("type") in _NAVIGATION_COMPONENT_TYPES for c in components)


def _read_layout_components(layout_path: Path) -> list[Any] | None:
    """Return `data.layout`, or None when the file is unreadable or has no layout list."""
    try:
        parsed = json.loads(layout_path.read_text(encoding=_JSON_FILE_ENCODING))
    except OSError, json.JSONDecodeError:
        return None
    layout = ((parsed.get("data") or {}).get("layout")) if isinstance(parsed, dict) else None
    return layout if isinstance(layout, list) else None


# ---------------------------------------------------------------------------
# Cross-file check: files the app version does not have
# ---------------------------------------------------------------------------


def _check_forbidden_new_files(ctx: LoopContext, changed: list[str]) -> tuple[bool, list[str]]:
    """A file the app version does not have may only change if it is already in the repo.

    An unfinished v9 upgrade keeps `layout-sets.json` and the rule files, and
    those must still be editable and deletable.
    """
    forbidden_patterns = ctx.app_version_profile.forbidden_new_file_patterns
    notes = [
        f"{file_path}: {replacement}"
        for file_path in changed
        for pattern, replacement in forbidden_patterns.items()
        if PurePosixPath(file_path).match(pattern) and not _exists_in_head(ctx.repo_path, file_path)
    ]
    return not notes, notes


def _exists_in_head(repo_path: str, file_path: str) -> bool:
    result = subprocess.run(
        ["git", "cat-file", "-e", f"HEAD:{file_path}"],
        cwd=repo_path,
        capture_output=True,
    )
    return result.returncode == 0


_CROSS_FILE_CHECKS = (_check_page_navigation, _check_text_keys, _check_forbidden_new_files)


# ---------------------------------------------------------------------------
# Validators (in-process, from agents.altinn)
# ---------------------------------------------------------------------------


def _validate_layout(file_path: str, full_path: Path, schema_location: str) -> tuple[bool, list[str]]:
    """Validate a layout JSON in-process against the app version's layout schema."""
    try:
        json_content = full_path.read_text(encoding=_JSON_FILE_ENCODING)
    except OSError as exc:
        return False, [f"{file_path}: cannot read — {exc}"]

    try:
        layout = json.loads(json_content)
    except json.JSONDecodeError as exc:
        return False, [f"{file_path}: invalid JSON — {exc}"]

    # The span carries the full file content as `file_content` — the
    # benchmark's rubric extraction reads exactly this shape from traces.
    with trace_span(
        "layout_schema_validation",
        metadata={"span_type": "TOOL", "file_path": file_path},
    ) as span:
        span.update(input={"file_content": json_content})
        try:
            schema = get_layout_schema(schema_location)
            referenced_schemas = get_referenced_schemas(schema_location)
        except Exception as exc:
            span.update(output={"error": str(exc)})
            return False, [f"{file_path}: could not load layout schema — {exc}"]

        result = validate_layout_json(_as_full_layout(layout), schema, referenced_schemas)
        span.update(output={"result": {"status": result.get("status")}})

    return _describe_layout_result(file_path, result)


def _describe_layout_result(file_path: str, result: dict[str, Any]) -> tuple[bool, list[str]]:
    status = result.get("status")
    if status == "validation_passed":
        return True, [f"{file_path}: layout schema valid"]
    if status == "validation_failed":
        return False, _describe_layout_errors(file_path, result.get("validation_errors") or [])

    # status == "error" or unknown — the validator itself failed
    message = result.get("message", "validator error")
    return False, [f"{file_path}: layout validator error — {message}"]


def _describe_layout_errors(file_path: str, errors: list[Any]) -> list[str]:
    notes = [f"{file_path}: layout validation failed ({len(errors)} error(s))"]
    notes.extend(_format_errors(errors))
    breadcrumb = _layout_props_breadcrumb(errors)
    if breadcrumb:
        notes.append(breadcrumb)
    return notes


def _as_full_layout(parsed: Any) -> dict[str, Any]:
    """Layout files are stored as full documents; guard against snippets."""
    if isinstance(parsed, dict) and "data" in parsed:
        return parsed
    if isinstance(parsed, list):
        return {"data": {"layout": parsed}}
    if isinstance(parsed, dict):
        return {"data": {"layout": [parsed]}}
    return {"data": {"layout": []}}


def _validate_resource(ctx: LoopContext, file_path: str, full_path: Path) -> tuple[bool, list[str]]:
    """Validate a text resource in-process (schema + business rules).

    Language is inferred from the filename (`resource.nb.json` → `nb`);
    defaults to `nb` when the pattern doesn't match.
    """
    try:
        resource_json = full_path.read_text(encoding=_JSON_FILE_ENCODING)
    except OSError as exc:
        return False, [f"{file_path}: cannot read — {exc}"]

    language = _infer_resource_language(file_path)
    with trace_span(
        "resource_text_validation",
        metadata={"span_type": "TOOL", "file_path": file_path, "language": language},
    ) as span:
        span.update(input={"file_content": resource_json})
        result = resource_validator_tool(
            user_goal="verify_changes",
            resource_json=resource_json,
            language=language,
            repo_path=ctx.repo_path,
        )
        span.update(output={"result": {"valid": result.get("valid")}})

    if result.get("valid") is True:
        notes = [f"{file_path}: resource schema valid"]
        warnings = result.get("warnings") or []
        for w in warnings[:_MAX_LISTED_WARNINGS]:
            notes.append(f"  - warning: {w}")
        return True, notes

    errors = result.get("errors") or []
    notes = [f"{file_path}: resource validation failed ({len(errors)} error(s))"]
    notes.extend(_format_errors(errors))
    return False, notes


def _infer_resource_language(file_path: str) -> str:
    """`App/config/texts/resource.nb.json` → `nb`."""
    name = Path(file_path).stem  # 'resource.nb'
    parts = name.split(".")
    if len(parts) == 2 and parts[0] == "resource":
        return parts[1]
    return "nb"


def _validate_layout_settings(file_path: str, full_path: Path) -> tuple[bool, list[str]]:
    """JSON-parse check for Settings.json / layout-sets.json — wrapped in
    a span that carries the full file content.

    No schema validation is wired in for these files, but the span
    matters for observability: `pages.order` is otherwise invisible in
    traces, and downstream tooling reads exactly this
    `input.file_content` shape.
    """
    try:
        json_content = full_path.read_text(encoding=_JSON_FILE_ENCODING)
    except OSError as exc:
        return False, [f"{file_path}: cannot read — {exc}"]

    with trace_span(
        "layout_settings_validation",
        metadata={"span_type": "TOOL", "file_path": file_path},
    ) as span:
        span.update(input={"file_content": json_content})
        try:
            json.loads(json_content)
        except json.JSONDecodeError as exc:
            span.update(output={"result": {"status": "invalid_json"}})
            return False, [f"{file_path}: invalid JSON — {exc}"]
        span.update(output={"result": {"status": "json_parsed"}})

    return True, [f"{file_path}: JSON parses (no schema validator for this path)"]


def _basic_json_check(file_path: str, full_path: Path) -> tuple[bool, list[str]]:
    """Last-resort check — does the file parse as JSON?"""
    try:
        with full_path.open("r", encoding=_JSON_FILE_ENCODING) as handle:
            json.load(handle)
    except json.JSONDecodeError as exc:
        return False, [f"{file_path}: invalid JSON — {exc}"]
    except OSError as exc:
        return False, [f"{file_path}: cannot read — {exc}"]
    return True, [f"{file_path}: JSON parses (no schema validator for this path)"]


def _format_errors(errors: list[Any]) -> list[str]:
    formatted = [f"  - {_describe_error(e)}" for e in errors[:_MAX_LISTED_ERRORS]]
    if len(errors) > _MAX_LISTED_ERRORS:
        formatted.append(f"  - …and {len(errors) - _MAX_LISTED_ERRORS} more")
    return formatted


def _describe_error(err: Any) -> str:
    """Compact description of one validator error entry."""
    if isinstance(err, dict):
        path = err.get("path") or err.get("location") or ""
        message = _get_error_message(err) or json.dumps(err)
        return f"{path}: {message}" if path else str(message)
    return str(err)


def _get_error_message(err: dict[str, Any]) -> Any:
    return err.get("message") or err.get("error")


def _layout_props_breadcrumb(errors: list[Any]) -> str | None:
    """If any layout error suggests an unknown/missing property, point at
    `altinn_layout_props` so the model fixes the gap with the schema
    instead of guessing.

    Searches the error messages for known schema-violation keywords
    ('additionalProperties', 'unknown property', 'not allowed',
    'required property') and surfaces the component type when we can
    spot one in the error path (e.g. `$.data.layout[3].type == "Input"`
    or the component shape via the message).
    """
    violations = [err for err in errors if _is_schema_violation(err)]
    if not violations:
        return None
    component_types = _collect_component_types(violations)
    if component_types:
        joined = ", ".join(f"'{c}'" for c in component_types[:_MAX_LISTED_COMPONENT_TYPES])
        return (
            f"  → call `altinn_layout_props(component_type={joined})` for the "
            "canonical schema; trust the tool, not memory."
        )
    return (
        "  → call `altinn_layout_props(component_type='<Type>')` for the "
        "component you're editing to get the canonical property list."
    )


def _is_schema_violation(err: Any) -> bool:
    text = str(_get_error_message(err) or "") if isinstance(err, dict) else str(err)
    return any(keyword in text.lower() for keyword in _SCHEMA_VIOLATION_KEYWORDS)


def _collect_component_types(violations: list[Any]) -> list[str]:
    component_types: list[str] = []
    for err in violations:
        if not isinstance(err, dict):
            continue
        component_type = err.get("component_type") or err.get("componentType")
        if isinstance(component_type, str) and component_type not in component_types:
            component_types.append(component_type)
    return component_types
