"""`read_file` — read one file, or one part of it, from the session repository.

Marks the file as read, so `edit_file` and `write_file` may change it.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, Tool, ToolResult

from .utils.repo_files import PathError, file_key, mark_read, resolve_repo_path
from .utils.text_parts import PartLimit, PartOffset, text_part


class ReadFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path, with no leading `/` and no `..`.")
    offset: PartOffset = 1
    limit: PartLimit = None


class ReadFileTool(Tool[ReadFileArgs]):
    name = "read_file"
    description = (
        "Read a file from the session repository and return its text.\n\n"
        "USE this BEFORE editing or overwriting any file — `edit_file` and "
        "`write_file` will refuse to touch a file you haven't read.  Also "
        "use it whenever you need to confirm the exact current text of a "
        "section (for example, before constructing an `edit_file` "
        "`old_string`).\n\n"
        "A long file comes back in parts.  Read every part before you act on "
        "the whole file, such as when you translate or check every text in a "
        "text resource file."
    )
    input_schema = ReadFileArgs
    is_concurrency_safe = True

    async def run(self, args: ReadFileArgs, ctx: LoopContext) -> ToolResult:
        full = _find_file(ctx, args.path)
        if isinstance(full, ToolResult):
            return full
        text = _read_text(full, args.path)
        if isinstance(text, ToolResult):
            return text

        result = text_part(
            ctx,
            text,
            offset=args.offset,
            limit=args.limit,
            key=file_key(args.path),
            source=args.path,
            tool=self.name,
            same_args="the same `path`",
        )
        if not result.is_error:
            mark_read(ctx, args.path)
        return result


def _find_file(ctx: LoopContext, rel_path: str) -> Path | ToolResult:
    try:
        full = resolve_repo_path(ctx.repo_path, rel_path)
    except PathError as exc:
        return ToolResult(content=str(exc), is_error=True)
    if not full.exists():
        return ToolResult(content=f"File does not exist: {rel_path}", is_error=True)
    if full.is_dir():
        return ToolResult(
            content=(
                f"Not a file: {rel_path} is a directory.  "
                "Call `scan_repo` to see the repo inventory, or call "
                "`read_file` on a specific file inside this directory."
            ),
            is_error=True,
        )
    if not full.is_file():
        return ToolResult(content=f"Not a file: {rel_path}", is_error=True)
    return full


def _read_text(full: Path, rel_path: str) -> str | ToolResult:
    try:
        return full.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return ToolResult(
            content=f"File {rel_path} is not UTF-8 text — cannot read.",
            is_error=True,
        )
    except OSError as exc:
        return ToolResult(content=f"Read failed: {exc}", is_error=True)
