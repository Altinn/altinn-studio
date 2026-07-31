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
file is edited or written — see `_write_base.WriteToolMixin`).

Validation runs in-process — no network round-trip except the (cached)
schema fetch from altinncdn.no.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

from agents.altinn.layout import LAYOUT_SCHEMA_URL, get_layout_schema
from agents.altinn.layout.schema_validator import validate_layout_json
from agents.altinn.resources.validator import resource_validator_tool
from agents.core.tool import LoopContext, ToolResult
from shared.utils.langfuse_utils import trace_span

from ._write_base import WriteToolMixin


class VerifyChangesArgs(BaseModel):
    """No inputs — verifies whatever the session has edited so far."""

    model_config = ConfigDict(extra="forbid")


class VerifyChangesTool(WriteToolMixin):
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
    is_read_only = True

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

        notes: list[str] = []
        passed = True
        verified_now: set[str] = set()

        for file_path in changed:
            try:
                ok, file_notes = _verify_one(ctx, file_path)
            except Exception as exc:  # noqa: BLE001 — never let one file's crash skip the rest
                ok = False
                file_notes = [f"{file_path}: verifier crashed — {exc}"]

            notes.extend(file_notes)
            if ok:
                verified_now.add(file_path)
            else:
                passed = False

        nav_ok, nav_notes = _check_page_navigation(ctx, changed)
        notes.extend(nav_notes)
        if not nav_ok:
            passed = False

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
        return _validate_layout(file_path, full_path)
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
    if name == "Settings.json" or name == "layout-sets.json":
        return False
    return True


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
    notes: list[str] = []
    ok = True

    changed_layouts = [f for f in changed if _is_layout_file(f)]
    for file_path in changed_layouts:
        layouts_dir = Path(file_path).parent
        settings_path = repo / layouts_dir.parent / "Settings.json"
        order = _read_page_order(settings_path)
        if order is None or len(order) < 2:
            continue  # single-page set (or unreadable settings) — nothing to navigate
        if Path(file_path).stem not in order:
            continue  # not part of the ordered page flow
        if _has_navigation_component(repo / file_path):
            continue
        ok = False
        notes.append(
            f"{file_path}: page is in a multi-page flow ({len(order)} pages in "
            "`pages.order`) but has no `NavigationButtons` component — users "
            "cannot move between pages.  Add a `NavigationButtons` component "
            "to the layout (check `altinn_layout_props(component_type="
            "'NavigationButtons')` for its schema)."
        )

    return ok, notes


def _read_page_order(settings_path: Path) -> list[str] | None:
    """Return `pages.order` from a layout-set Settings.json, or None."""
    try:
        settings = json.loads(settings_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    order = (settings.get("pages") or {}).get("order")
    if isinstance(order, list) and all(isinstance(p, str) for p in order):
        return order
    return None


def _has_navigation_component(layout_path: Path) -> bool:
    """Does the layout contain a NavigationButtons/NavigationBar component?"""
    try:
        parsed = json.loads(layout_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return True  # unreadable/invalid JSON is the schema validator's problem
    layout = ((parsed.get("data") or {}).get("layout")) if isinstance(parsed, dict) else None
    if not isinstance(layout, list):
        return True
    return any(
        isinstance(c, dict) and c.get("type") in _NAVIGATION_COMPONENT_TYPES for c in layout
    )


# ---------------------------------------------------------------------------
# Validators (in-process, from agents.altinn)
# ---------------------------------------------------------------------------


def _validate_layout(file_path: str, full_path: Path) -> tuple[bool, list[str]]:
    """Validate a layout JSON in-process against the official schema."""
    try:
        json_content = full_path.read_text(encoding="utf-8")
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
            schema = get_layout_schema(LAYOUT_SCHEMA_URL)
        except Exception as exc:  # noqa: BLE001 — CDN fetch can fail
            span.update(output={"error": str(exc)})
            return False, [f"{file_path}: could not load layout schema — {exc}"]

        result = validate_layout_json(_as_full_layout(layout), schema)
        span.update(output={"result": {"status": result.get("status")}})

    status = result.get("status")
    if status == "validation_passed":
        return True, [f"{file_path}: layout schema valid"]

    errors = result.get("validation_errors") or []
    if status == "validation_failed":
        formatted = [f"  - {_describe_error(e)}" for e in errors[:10]]
        if len(errors) > 10:
            formatted.append(f"  - …and {len(errors) - 10} more")
        notes = [f"{file_path}: layout validation failed ({len(errors)} error(s))"]
        notes.extend(formatted)
        breadcrumb = _layout_props_breadcrumb(errors)
        if breadcrumb:
            notes.append(breadcrumb)
        return False, notes

    # status == "error" or unknown — the validator itself failed
    message = result.get("message", "validator error")
    return False, [f"{file_path}: layout validator error — {message}"]


def _as_full_layout(parsed: Any) -> dict[str, Any]:
    """Layout files are stored as full documents; guard against snippets."""
    if isinstance(parsed, dict) and "data" in parsed:
        return parsed
    if isinstance(parsed, list):
        return {"data": {"layout": parsed}}
    if isinstance(parsed, dict):
        return {"data": {"layout": [parsed]}}
    return {"data": {"layout": []}}


def _validate_resource(
    ctx: LoopContext, file_path: str, full_path: Path
) -> tuple[bool, list[str]]:
    """Validate a text resource in-process (schema + business rules).

    Language is inferred from the filename (`resource.nb.json` → `nb`);
    defaults to `nb` when the pattern doesn't match.
    """
    try:
        resource_json = full_path.read_text(encoding="utf-8")
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
        for w in warnings[:5]:
            notes.append(f"  - warning: {w}")
        return True, notes

    errors = result.get("errors") or []
    formatted = [f"  - {_describe_error(e)}" for e in errors[:10]]
    if len(errors) > 10:
        formatted.append(f"  - …and {len(errors) - 10} more")
    notes = [f"{file_path}: resource validation failed ({len(errors)} error(s))"]
    notes.extend(formatted)
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
        json_content = full_path.read_text(encoding="utf-8")
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
        with full_path.open("r", encoding="utf-8") as handle:
            json.load(handle)
    except json.JSONDecodeError as exc:
        return False, [f"{file_path}: invalid JSON — {exc}"]
    except OSError as exc:
        return False, [f"{file_path}: cannot read — {exc}"]
    return True, [f"{file_path}: JSON parses (no schema validator for this path)"]


def _describe_error(err: Any) -> str:
    """Compact description of one validator error entry."""
    if isinstance(err, dict):
        path = err.get("path") or err.get("location") or ""
        message = err.get("message") or err.get("error") or json.dumps(err)
        return f"{path}: {message}" if path else str(message)
    return str(err)


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
    keywords = (
        "additionalproperties",
        "unknown property",
        "not allowed",
        "required property",
        "is required",
    )
    component_types: list[str] = []
    matched = False
    for err in errors:
        if not isinstance(err, dict):
            text = str(err).lower()
            if any(k in text for k in keywords):
                matched = True
            continue
        message = str(err.get("message") or err.get("error") or "").lower()
        if any(k in message for k in keywords):
            matched = True
            ctype = err.get("component_type") or err.get("componentType")
            if isinstance(ctype, str) and ctype not in component_types:
                component_types.append(ctype)

    if not matched:
        return None
    if component_types:
        joined = ", ".join(f"'{c}'" for c in component_types[:3])
        return (
            f"  → call `altinn_layout_props(component_type={joined})` for the "
            "canonical schema; trust the tool, not memory."
        )
    return (
        "  → call `altinn_layout_props(component_type='<Type>')` for the "
        "component you're editing to get the canonical property list."
    )
