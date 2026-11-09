"""`read_file` — read one file, or one part of it, from the session repository.

Marks the file as read, so `edit_file` and `write_file` may change it.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from agents.core.compaction import DEFAULT_MAX_RESULT_CHARS
from agents.core.tool import LoopContext, Tool, ToolResult

from .utils.repo_files import PathError, mark_read, resolve_repo_path

# The loop cuts every tool result at DEFAULT_MAX_RESULT_CHARS and the
# model cannot get the cut text back.  A part must fit under that cap
# together with the note that tells the model where the next part starts.
_NOTE_RESERVE_CHARS = 1_000
_MAX_PART_CHARS = DEFAULT_MAX_RESULT_CHARS - _NOTE_RESERVE_CHARS


class ReadFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path.")
    offset: int = Field(default=1, ge=1, description="Line number to start reading from. The first line is 1.")
    limit: int | None = Field(
        default=None,
        ge=1,
        description="Maximum number of lines to read. Leave out to read as much as one call returns.",
    )


class ReadFileTool(Tool[ReadFileArgs]):
    name = "read_file"
    description = (
        "Read a file from the session repository and return its text.\n\n"
        "USE this BEFORE editing or overwriting any file — `edit_file` and "
        "`write_file` will refuse to touch a file you haven't read.  Also "
        "use it whenever you need to confirm the exact current text of a "
        "section (for example, before constructing an `edit_file` "
        "`old_string`).\n\n"
        f"One call returns at most {_MAX_PART_CHARS:,} characters, in whole lines.  "
        "When a file is longer, the result ends with a note that names the "
        "lines you got, the file's line count and the `offset` of the next "
        "part.  You have not seen the lines after that note: read the "
        "remaining parts before you act on the whole file, such as when you "
        "translate or check every text in a text resource file.\n\n"
        "Inputs:\n"
        "  - `path` — repo-relative (no leading `/`, no `..`).\n"
        "  - `offset` — line to start at, from 1.  Default 1.\n"
        "  - `limit` — maximum number of lines.  Default: as many as fit."
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

        lines = _split_lines(text)
        total = len(lines)
        if args.offset > max(total, 1):
            return ToolResult(
                content=f"offset {args.offset} is past the end of {args.path}, which has {total} lines.",
                is_error=True,
            )

        mark_read(ctx, args.path)

        start = args.offset - 1
        stop = total if args.limit is None else min(total, start + args.limit)
        # Always include the first line, even when it alone is over budget.
        end = max(_fit_lines(lines, start, stop, _MAX_PART_CHARS), min(start + 1, stop))
        part = "".join(lines[start:end])
        metadata = {"chars": len(text), "lines": total}

        line = part.removesuffix("\n")
        if len(line) > _MAX_PART_CHARS:
            # One line alone is longer than a part.  Show its start rather
            # than nothing, and say that the rest of the line is out of reach.
            line_no = start + 1
            return ToolResult(
                content=(
                    line[:_MAX_PART_CHARS] + f"\n\n[Line {line_no} of {args.path} has "
                    f"{len(line):,} characters.  This shows only its first "
                    f"{_MAX_PART_CHARS:,}, and `read_file` cannot show the rest of the line."
                    + _next_part_hint(line_no, total)
                    + "]"
                ),
                metadata={**metadata, "truncated": True, "start_line": line_no, "end_line": line_no},
            )

        if start == 0 and end == total:
            return ToolResult(content=part, metadata=metadata)

        first, last = start + 1, end
        note = f"[Showing lines {first}–{last} of {total} in {args.path}."
        note += _next_part_hint(last, total) + "]"
        return ToolResult(
            content=f"{part}\n\n{note}",
            metadata={**metadata, "truncated": last < total, "start_line": first, "end_line": last},
        )


def _split_lines(text: str) -> list[str]:
    """Split on `\\n` only, keeping each line's ending, so the parts join
    back into the exact text.  `str.splitlines` also splits on characters
    such as U+2028 that editors do not count as line breaks."""
    pieces = text.split("\n")
    lines = [piece + "\n" for piece in pieces[:-1]]
    if pieces[-1]:
        lines.append(pieces[-1])
    return lines


def _fit_lines(lines: list[str], start: int, stop: int, max_chars: int) -> int:
    """Return the end index of the longest run of whole lines from
    `start`, at most to `stop`, whose total length fits in `max_chars`."""
    size = 0
    end = start
    while end < stop and size + len(lines[end]) <= max_chars:
        size += len(lines[end])
        end += 1
    return end


def _next_part_hint(last_line: int, total: int) -> str:
    if last_line >= total:
        return "  This is the end of the file."
    return f"  To read the next part, call `read_file` with `offset` {last_line + 1}."


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
