"""`altinn_datamodel_sync`: make the files of a data model from its JSON schema.

Designer makes the files (`agents.services.designer`). This tool reads the app
files that Designer uses from the clone, and writes the result to the clone.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from agents.altinn.app_version import V9_PROFILE
from agents.core.tool import LoopContext, ToolResult, WriteTool
from agents.services.designer import (
    DatamodelGenerationError,
    DatamodelGenerationRequest,
    GeneratedDatamodel,
    generate_datamodel,
)

from .utils.repo_files import PathError, mark_changed, mark_unread, resolve_repo_path

SCHEMA_FILE_SUFFIX = ".schema.json"
APPLICATION_METADATA_PATH = "App/config/applicationmetadata.json"
STUDIO_SETTINGS_PATH = ".altinnstudio/settings.json"


class DatamodelSyncArgs(BaseModel):
    schema_path: str = Field(
        description="Repo-relative path to the JSON Schema model file, e.g. 'App/models/model.schema.json'."
    )


class DatamodelSyncTool(WriteTool[DatamodelSyncArgs]):
    name = "altinn_datamodel_sync"
    description = (
        "Generate the C# class and XSD files of a JSON Schema data model "
        "with Altinn Studio Designer, exactly as 'Generate model' in Studio "
        "does.  Writes them next to the schema, writes the schema in Studio's "
        "format, and adds or updates the model's data type in "
        "App/config/applicationmetadata.json.  Call this after creating or "
        "changing any `App/models/*.schema.json`, and never write the .cs "
        "or .xsd file yourself.  Returns the list of files written.  Read a "
        "written file again before you change it."
    )
    input_schema = DatamodelSyncArgs
    is_concurrency_safe = False  # writes files

    async def run(self, args: DatamodelSyncArgs, ctx: LoopContext) -> ToolResult:
        if not ctx.designer_api_key or not ctx.repo_owner or not ctx.extras.get("app_name"):
            return ToolResult(content="Datamodel generation needs a Designer session for this app.", is_error=True)

        try:
            request = _read_generation_request(ctx, args.schema_path)
            generated = await generate_datamodel(request, ctx.designer_api_key)
            written = _write_generated_files(ctx, args.schema_path, request.model_name, generated)
        except (_SyncError, DatamodelGenerationError) as exc:
            return ToolResult(content=str(exc), is_error=True)

        return ToolResult(content=json.dumps({"status": "success", "files_written": written}, ensure_ascii=False))


class _SyncError(Exception):
    """The tool stops, and `run` gives the message to the agent as an error."""


def _read_generation_request(ctx: LoopContext, schema_path: str) -> DatamodelGenerationRequest:
    if not schema_path.endswith(SCHEMA_FILE_SUFFIX):
        raise _SyncError(f"schema_path must name a {SCHEMA_FILE_SUFFIX} file: {schema_path}")
    schema = _read_json_file(ctx, schema_path)
    application_metadata = _read_json_file(ctx, APPLICATION_METADATA_PATH)
    # If the app has no Studio settings file, Designer uses no nullable reference types.
    settings = _read_json_file(ctx, STUDIO_SETTINGS_PATH, missing_ok=True)

    return DatamodelGenerationRequest(
        repo_owner=ctx.repo_owner,
        app_name=ctx.extras["app_name"],
        model_name=Path(schema_path).name.removesuffix(SCHEMA_FILE_SUFFIX),
        schema=schema,
        application_metadata=application_metadata,
        use_nullable_reference_types=isinstance(settings, dict) and settings.get("useNullableReferenceTypes") is True,
        is_v9_or_newer=ctx.app_version_profile.major_version >= V9_PROFILE.major_version,
    )


def _read_json_file(ctx: LoopContext, rel_path: str, *, missing_ok: bool = False) -> Any:
    """Gives None for a missing file if `missing_ok` is true."""
    try:
        file = resolve_repo_path(ctx.repo_path, rel_path)
    except PathError as exc:
        raise _SyncError(str(exc)) from exc
    if not file.is_file():
        if missing_ok:
            return None
        raise _SyncError(f"File not found: {rel_path}")
    try:
        return json.loads(file.read_text(encoding="utf-8-sig"))
    except OSError as exc:
        raise _SyncError(f"Cannot read {rel_path}: {exc}") from exc
    except ValueError as exc:
        raise _SyncError(f"{rel_path} is not valid JSON: {exc}") from exc


def _write_generated_files(
    ctx: LoopContext, schema_path: str, model_name: str, generated: GeneratedDatamodel
) -> list[str]:
    """Writes each file that has new content, and marks it as changed and not read.

    The agent read the schema and the application metadata before the tool changed them. If the agent writes
    a file from that earlier read, the write removes the changes of the tool.

    The tool examines all paths before it writes a file. If it does not accept a path, it writes no file.
    """
    schema_dir = Path(schema_path).parent
    files = {
        schema_path: generated.json_schema,
        str(schema_dir / f"{model_name}.cs"): generated.csharp_classes,
        str(schema_dir / f"{model_name}.xsd"): generated.xsd,
        APPLICATION_METADATA_PATH: generated.application_metadata,
    }
    targets: list[tuple[str, Path, str]] = []
    for rel_path, content in files.items():
        try:
            targets.append((rel_path, resolve_repo_path(ctx.repo_path, rel_path), content))
        except PathError as exc:
            raise _SyncError(f"Could not write {rel_path}: {exc}") from exc

    written: list[str] = []
    for rel_path, out_path, content in targets:
        try:
            if out_path.is_file() and out_path.read_text(encoding="utf-8") == content:
                continue
            out_path.write_text(content, encoding="utf-8")
        except OSError as exc:
            raise _SyncError(f"Could not write {rel_path}: {exc}") from exc
        written.append(rel_path)
        mark_changed(ctx, rel_path)
        mark_unread(ctx, rel_path)
    return written
