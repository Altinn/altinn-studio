"""Long text in parts, shared by `read_file` and `web_fetch`.

The loop cuts every tool result at DEFAULT_MAX_RESULT_CHARS, and the model
cannot get the cut text back.  A tool that can return long text gives it in
parts that fit under that cap, each with a note that says where the next
part starts, so the model can read all of it.
"""

from __future__ import annotations

from typing import Annotated

from pydantic import Field

from agents.core.compaction import DEFAULT_MAX_RESULT_CHARS
from agents.core.tool import ToolResult

# Room under the loop's cap for the note at the end of a part.
_NOTE_RESERVE_CHARS = 1_000
MAX_PART_CHARS = DEFAULT_MAX_RESULT_CHARS - _NOTE_RESERVE_CHARS

# The `offset` and `limit` arguments of a tool that returns text in parts.
PartOffset = Annotated[int, Field(ge=1, description="Line to start reading from. The first line is 1.")]
PartLimit = Annotated[
    int | None,
    Field(ge=1, description="Maximum number of lines to read. Leave out to read as much as one call returns."),
]


def text_part(text: str, *, offset: int, limit: int | None, source: str, next_call: str) -> ToolResult:
    """Return the lines of `text` from line `offset`, at most `limit` lines
    and at most MAX_PART_CHARS characters.

    A line longer than MAX_PART_CHARS counts as several lines, so every
    part fits and the model can always read on.  When the result is not
    all of `text`, it ends with a note that names `source` and finishes the
    sentence "To read the next part, `next_call` `offset` N".
    """
    whole_lines = _split_lines(text)
    lines = [piece for line in whole_lines for piece in _split_long_line(line)]
    total = len(lines)
    if offset > max(total, 1):
        return ToolResult(
            content=f"offset {offset} is past the end of {source}, which has {total} lines.", is_error=True
        )

    start = offset - 1
    stop = total if limit is None else min(total, start + limit)
    end = _fit_lines(lines, start, stop)
    part = "".join(lines[start:end])
    metadata = {"chars": len(text), "lines": total}
    if start == 0 and end == total:
        return ToolResult(content=part, metadata=metadata)

    note = f"[Showing lines {offset}–{end} of {total} in {source}."
    if total > len(whole_lines):
        note += f"  Lines longer than {MAX_PART_CHARS:,} characters count as several lines here."
    if end < total:
        note += f"  To read the next part, {next_call} `offset` {end + 1}."
    else:
        note += f"  This is the end of {source}."
    return ToolResult(
        content=f"{part}\n\n{note}]",
        metadata={**metadata, "truncated": end < total, "start_line": offset, "end_line": end},
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


def _split_long_line(line: str) -> list[str]:
    """Split a line longer than a part into pieces of MAX_PART_CHARS
    characters.  The last piece keeps the line break."""
    body = line.removesuffix("\n")
    if len(body) <= MAX_PART_CHARS:
        return [line]
    pieces = [body[i : i + MAX_PART_CHARS] for i in range(0, len(body), MAX_PART_CHARS)]
    pieces[-1] += line[len(body) :]
    return pieces


def _fit_lines(lines: list[str], start: int, stop: int) -> int:
    """Return the end index of the longest run of lines from `start`, at
    most to `stop`, that fits in a part.  The first line is always taken:
    a line whose text fills a whole part is one character over, because
    of its line break."""
    size = 0
    end = start
    while end < stop and (end == start or size + len(lines[end]) <= MAX_PART_CHARS):
        size += len(lines[end])
        end += 1
    return end
