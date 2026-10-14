"""`write_file` — create a file, or overwrite one the model has read."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult, WriteTool

from .utils.repo_files import PathError, is_read, mark_changed, mark_read, resolve_repo_path
from .utils.studio_json import describe_formatting, format_json_like_studio


class WriteFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path.")
    content: str = Field(description="Full new contents of the file.")


class WriteFileTool(WriteTool[WriteFileArgs]):
    name = "write_file"
    description = (
        "Create a new file, or completely overwrite an existing one.\n\n"
        "PREFER `edit_file` for modifications — it only sends the changed "
        "region and keeps unrelated content intact.  Use `write_file` only "
        "when:\n"
        "  - You are creating a brand-new file (the path does not exist), or\n"
        "  - You are doing a wholesale rewrite of a small file.\n\n"
        "PRECONDITION (existing files): you MUST call `read_file` first so "
        "your replacement is informed by current content.  For new files "
        "this is skipped — there's nothing to read.\n\n"
        "Parent directories are created as needed."
    )
    input_schema = WriteFileArgs
    is_concurrency_safe = False

    async def run(self, args: WriteFileArgs, ctx: LoopContext) -> ToolResult:
        try:
            full = resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        existing = full.exists()
        if existing and not is_read(ctx, args.path):
            return ToolResult(
                content=(
                    f"{args.path} already exists.  Call `read_file` first or use "
                    "`edit_file` if you only want to change a section."
                ),
                is_error=True,
            )
        content = format_json_like_studio(args.path, args.content)
        try:
            full.parent.mkdir(parents=True, exist_ok=True)
            full.write_text(content, encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Write failed: {exc}", is_error=True)

        mark_changed(ctx, args.path)
        # A fresh write counts as having "read" the file at its current
        # state — future edits on the same path are safe.
        mark_read(ctx, args.path)
        verb = "Overwrote" if existing else "Created"
        note = describe_formatting(is_reformatted=content != args.content, matched_on_whitespace=False)
        return ToolResult(
            content=f"{verb} {args.path} ({len(content)} chars).{note}",
            metadata={"path": args.path, "created": not existing},
        )
