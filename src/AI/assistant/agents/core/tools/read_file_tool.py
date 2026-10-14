"""`read_file` — read one file from the session repository.

Marks the file as read, so `edit_file` and `write_file` may change it.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, Tool, ToolResult

from .utils.repo_files import PathError, mark_read, resolve_repo_path

# Cap on a single read's payload — without this, a 200kB schema file
# would dominate the model's context budget.  Truncation marker mirrors
# the compaction layer's style so the model recognizes it.
_MAX_READ_CHARS = 60_000


class ReadFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path.")


class ReadFileTool(Tool[ReadFileArgs]):
    name = "read_file"
    description = (
        "Read a file from the session repository and return its contents.\n\n"
        "USE this BEFORE editing or overwriting any file — `edit_file` and "
        "`write_file` will refuse to touch a file you haven't read.  Also "
        "use it whenever you need to confirm the exact current text of a "
        "section (for example, before constructing an `edit_file` "
        "`old_string`).\n\n"
        "Returns the file's full text.  Very large files are truncated; if "
        "the truncation marker appears, narrow your inspection by reading a "
        "more specific file or using one of the `altinn_*` lookup tools.\n\n"
        "Takes one input: `path` — repo-relative (no leading `/`, no `..`)."
    )
    input_schema = ReadFileArgs
    is_concurrency_safe = True

    async def run(self, args: ReadFileArgs, ctx: LoopContext) -> ToolResult:
        try:
            full = resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        if not full.exists():
            return ToolResult(content=f"File does not exist: {args.path}", is_error=True)
        if full.is_dir():
            return ToolResult(
                content=(
                    f"Not a file: {args.path} is a directory.  "
                    "Call `scan_repo` to see the repo inventory, or call "
                    "`read_file` on a specific file inside this directory."
                ),
                is_error=True,
            )
        if not full.is_file():
            return ToolResult(content=f"Not a file: {args.path}", is_error=True)
        try:
            text = full.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return ToolResult(
                content=f"File {args.path} is not UTF-8 text — cannot read.",
                is_error=True,
            )
        except OSError as exc:
            return ToolResult(content=f"Read failed: {exc}", is_error=True)

        mark_read(ctx, args.path)

        if len(text) > _MAX_READ_CHARS:
            head = text[:_MAX_READ_CHARS]
            return ToolResult(
                content=(
                    head + f"\n\n[…truncated {len(text) - _MAX_READ_CHARS} chars. "
                    "Use a more specific tool or read a smaller file if you need the rest.]"
                ),
                metadata={"truncated": True, "chars": len(text)},
            )
        return ToolResult(content=text, metadata={"chars": len(text)})
