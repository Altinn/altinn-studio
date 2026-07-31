"""In-process Altinn tools — schema introspection and datamodel codegen.

These replace the MCP wrappers of the same names.  Same tool names and
similar contracts, so the system prompt's guidance ("call
`altinn_layout_props` before layout edits") keeps working unchanged.
Logic lives in `agents.altinn`; these classes are thin `Tool` shims.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field

from agents.altinn.datamodel import datamodel_sync
from agents.altinn.layout import LAYOUT_SCHEMA_URL
from agents.altinn.layout.properties import layout_properties_tool
from agents.core.tool import LoopContext, Tool, ToolResult


class LayoutPropsArgs(BaseModel):
    component_type: str = Field(
        description="Layout component type exactly as it appears in `\"type\"`, e.g. 'Input', 'Checkboxes', 'NavigationButtons'."
    )


class LayoutPropsTool(Tool):
    """Canonical property list for a layout component type."""

    name = "altinn_layout_props"
    description = (
        "Get the canonical schema for one layout component type: allowed "
        "properties, required properties, and their types — extracted live "
        "from the official Altinn layout schema.  Call this BEFORE adding "
        "or editing any layout component; the validator rejects unknown "
        "properties and your memory of the schema may be stale."
    )
    input_schema = LayoutPropsArgs
    is_concurrency_safe = True
    is_read_only = True

    async def run(self, args: LayoutPropsArgs, ctx: LoopContext) -> ToolResult:
        try:
            result = layout_properties_tool(
                user_goal="agentic-loop",
                component_type=args.component_type,
                schema_url=LAYOUT_SCHEMA_URL,
            )
        except Exception as exc:  # noqa: BLE001 — CDN fetch / parse errors
            return ToolResult(
                content=f"Could not load component schema: {exc}", is_error=True
            )
        is_error = isinstance(result, dict) and result.get("status") == "error"
        return ToolResult(
            content=json.dumps(result, ensure_ascii=False),
            is_error=bool(is_error),
            metadata={
                "source": {
                    "title": f"Layout-skjema ({args.component_type})",
                    "url": LAYOUT_SCHEMA_URL,
                    "kind": "schema",
                }
            },
        )


class DatamodelSyncArgs(BaseModel):
    schema_path: str = Field(
        description="Repo-relative path to the JSON Schema model file, e.g. 'App/models/model.schema.json'."
    )


class DatamodelSyncTool(Tool):
    """Generate XSD + C# from a JSON Schema model (Altinn Studio parity)."""

    name = "altinn_datamodel_sync"
    description = (
        "Regenerate the XSD and C# class files from a JSON Schema data "
        "model, using the same conversion logic as Altinn Studio Designer, "
        "and write them next to the schema.  Call this after creating or "
        "changing any `App/models/*.schema.json` so the backend model stays "
        "in sync.  Returns the list of files written."
    )
    input_schema = DatamodelSyncArgs
    is_concurrency_safe = False  # writes files
    is_read_only = False

    async def run(self, args: DatamodelSyncArgs, ctx: LoopContext) -> ToolResult:
        schema_file = Path(ctx.repo_path) / args.schema_path
        if not schema_file.is_file():
            return ToolResult(
                content=f"Schema file not found: {args.schema_path}", is_error=True
            )
        try:
            schema_content = schema_file.read_text(encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Cannot read schema: {exc}", is_error=True)

        result = datamodel_sync(
            user_goal="agentic-loop",
            schema_content=schema_content,
            schema_filename=schema_file.name,
        )
        if not isinstance(result, dict) or result.get("status") != "ok":
            errors = result.get("errors") if isinstance(result, dict) else [str(result)]
            return ToolResult(
                content="Datamodel generation failed:\n" + "\n".join(str(e) for e in (errors or ["unknown error"])),
                is_error=True,
            )

        written: list[str] = []
        changed: set[str] = ctx.extras.setdefault("changed_files", set())
        verified: set[str] = ctx.extras.setdefault("verified_files", set())
        for entry in result.get("generated") or []:
            out_path = schema_file.parent / entry["path"]
            try:
                out_path.write_text(entry["content"], encoding="utf-8")
            except OSError as exc:
                return ToolResult(
                    content=f"Could not write {entry['path']}: {exc}", is_error=True
                )
            rel = str(out_path.relative_to(ctx.repo_path))
            written.append(rel)
            changed.add(rel)
            # Generated files must be re-verified before commit like any
            # other write.
            verified.discard(rel)

        return ToolResult(
            content=json.dumps(
                {
                    "status": "success",
                    "files_written": written,
                    "warnings": result.get("warnings") or [],
                },
                ensure_ascii=False,
            )
        )
