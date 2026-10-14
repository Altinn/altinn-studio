"""`altinn_datamodel_sync` — make XSD and C# from a JSON Schema model.

Replaces the MCP wrapper of the same name, with a similar contract.
Logic lives in `agents.altinn.datamodel`; this class is a thin `Tool`
shim.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field

from agents.altinn.datamodel import datamodel_sync
from agents.core.tool import LoopContext, ToolResult, WriteTool

from .utils.repo_files import PathError, resolve_repo_path


class DatamodelSyncArgs(BaseModel):
    schema_path: str = Field(
        description="Repo-relative path to the JSON Schema model file, e.g. 'App/models/model.schema.json'."
    )


class DatamodelSyncTool(WriteTool[DatamodelSyncArgs]):
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

    async def run(self, args: DatamodelSyncArgs, ctx: LoopContext) -> ToolResult:
        try:
            schema_file = resolve_repo_path(ctx.repo_path, args.schema_path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        if not schema_file.is_file():
            return ToolResult(content=f"Schema file not found: {args.schema_path}", is_error=True)
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

        schema_dir = Path(args.schema_path).parent
        written: list[str] = []
        changed: set[str] = ctx.extras.setdefault("changed_files", set())
        verified: set[str] = ctx.extras.setdefault("verified_files", set())
        for entry in result.get("generated") or []:
            rel = str(schema_dir / entry["path"])
            try:
                out_path = resolve_repo_path(ctx.repo_path, rel)
                out_path.write_text(entry["content"], encoding="utf-8")
            except (PathError, OSError) as exc:
                return ToolResult(content=f"Could not write {rel}: {exc}", is_error=True)
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
