"""`altinn_datamodel_sync` — make the data model files from a JSON Schema model.

Designer generates the files (`agents.services.designer`), so they are the
files that "Generate model" in Studio writes.  This class reads the app
files that the generation needs from the clone and writes the result back.
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

from .utils.repo_files import PathError, mark_changed, resolve_repo_path

SCHEMA_FILE_SUFFIX = ".schema.json"
APPLICATION_METADATA_PATH = "App/config/applicationmetadata.json"
STUDIO_SETTINGS_PATH = ".altinnstudio/settings.json"


class DatamodelSyncArgs(BaseModel):
    schema_path: str = Field(
        description="Repo-relative path to the JSON Schema model file, e.g. 'App/models/model.schema.json'."
    )


class DatamodelSyncTool(WriteTool[DatamodelSyncArgs]):
    """Generate the C# class, XSD and data type of a JSON Schema model with Designer."""

    name = "altinn_datamodel_sync"
    description = (
        "Generate the C# class and XSD files of a JSON Schema data model "
        "with Altinn Studio Designer, exactly as 'Generate model' in Studio "
        "does.  Writes them next to the schema, writes the schema in Studio's "
        "format, and adds or updates the model's data type in "
        "App/config/applicationmetadata.json.  Call this after creating or "
        "changing any `App/models/*.schema.json`, and never write the .cs "
        "or .xsd file yourself.  Returns the list of files written."
    )
    input_schema = DatamodelSyncArgs
    is_concurrency_safe = False  # writes files

    async def run(self, args: DatamodelSyncArgs, ctx: LoopContext) -> ToolResult:
        if not ctx.designer_api_key or not ctx.repo_owner or not ctx.extras.get("app_name"):
            return ToolResult(content="Datamodel generation needs a Designer session for this app.", is_error=True)

        request = _read_generation_request(ctx, args.schema_path)
        if isinstance(request, ToolResult):
            return request

        try:
            generated = await generate_datamodel(request, ctx.designer_api_key)
        except DatamodelGenerationError as exc:
            return ToolResult(content=str(exc), is_error=True)

        written = _write_generated_files(ctx, args.schema_path, request.model_name, generated)
        if isinstance(written, ToolResult):
            return written

        return ToolResult(content=json.dumps({"status": "success", "files_written": written}, ensure_ascii=False))


def _read_generation_request(ctx: LoopContext, schema_path: str) -> DatamodelGenerationRequest | ToolResult:
    if not schema_path.endswith(SCHEMA_FILE_SUFFIX):
        return ToolResult(content=f"schema_path must name a {SCHEMA_FILE_SUFFIX} file: {schema_path}", is_error=True)
    schema = _read_json_file(ctx, schema_path)
    if isinstance(schema, ToolResult):
        return schema
    application_metadata = _read_json_file(ctx, APPLICATION_METADATA_PATH)
    if isinstance(application_metadata, ToolResult):
        return application_metadata
    use_nullable_reference_types = _read_use_nullable_reference_types(ctx)
    if isinstance(use_nullable_reference_types, ToolResult):
        return use_nullable_reference_types

    return DatamodelGenerationRequest(
        repo_owner=ctx.repo_owner,
        app_name=ctx.extras["app_name"],
        model_name=Path(schema_path).name.removesuffix(SCHEMA_FILE_SUFFIX),
        schema=schema,
        application_metadata=application_metadata,
        use_nullable_reference_types=use_nullable_reference_types,
        is_v9_or_newer=ctx.app_version_profile.major_version >= V9_PROFILE.major_version,
    )


def _read_use_nullable_reference_types(ctx: LoopContext) -> bool | ToolResult:
    """Designer treats an app without Studio settings as one without nullable reference types."""
    try:
        settings_file = resolve_repo_path(ctx.repo_path, STUDIO_SETTINGS_PATH)
    except PathError as exc:
        return ToolResult(content=str(exc), is_error=True)
    if not settings_file.is_file():
        return False
    settings = _read_json_file(ctx, STUDIO_SETTINGS_PATH)
    if isinstance(settings, ToolResult):
        return settings
    return isinstance(settings, dict) and settings.get("useNullableReferenceTypes") is True


def _read_json_file(ctx: LoopContext, rel_path: str) -> Any | ToolResult:
    try:
        file = resolve_repo_path(ctx.repo_path, rel_path)
    except PathError as exc:
        return ToolResult(content=str(exc), is_error=True)
    if not file.is_file():
        return ToolResult(content=f"File not found: {rel_path}", is_error=True)
    try:
        return json.loads(file.read_text(encoding="utf-8-sig"))
    except OSError as exc:
        return ToolResult(content=f"Cannot read {rel_path}: {exc}", is_error=True)
    except ValueError as exc:
        return ToolResult(content=f"{rel_path} is not valid JSON: {exc}", is_error=True)


def _write_generated_files(
    ctx: LoopContext, schema_path: str, model_name: str, generated: GeneratedDatamodel
) -> list[str] | ToolResult:
    """Writes each file whose content changed, and marks it changed so that it is verified again before commit.

    Every path is checked before the first write, so a refused path leaves the model files as they were.
    """
    schema_dir = Path(schema_path).parent
    files = {
        schema_path: generated.json_schema,
        str(schema_dir / f"{model_name}.cs"): generated.csharp_classes,
        str(schema_dir / f"{model_name}.xsd"): generated.xsd,
        APPLICATION_METADATA_PATH: generated.application_metadata,
    }
    out_paths: dict[str, Path] = {}
    for rel_path in files:
        try:
            out_paths[rel_path] = resolve_repo_path(ctx.repo_path, rel_path)
        except PathError as exc:
            return ToolResult(content=f"Could not write {rel_path}: {exc}", is_error=True)

    written: list[str] = []
    for rel_path, content in files.items():
        out_path = out_paths[rel_path]
        try:
            if out_path.is_file() and out_path.read_text(encoding="utf-8") == content:
                continue
            out_path.write_text(content, encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Could not write {rel_path}: {exc}", is_error=True)
        written.append(rel_path)
        mark_changed(ctx, rel_path)
    return written
