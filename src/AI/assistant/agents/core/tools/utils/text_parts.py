"""Long text in parts, shared by `read_file`, `web_fetch` and `skill`.

The loop cuts every tool result at `LoopContext.max_result_chars`, and the
model cannot get the cut text back.  A tool that can return long text gives
it in parts that fit under that size.  Each part ends with a note that names
the lines the model has not read yet and the `offset` of each part that holds
them.  Parts end where the characters run out, not after a set number of
lines, so the model takes offsets from the note instead of working them out.
It can then read every remaining part in one turn without leaving a gap.

The session keeps a record of the lines of each text that the model has
read.  When the text changes, the lines that stay the same keep counting as
read, and the note says when line numbers have moved.  `write_file` uses the
record to refuse to replace a file that the model has read only part of.
"""

from __future__ import annotations

import difflib
from dataclasses import dataclass, field
from typing import Annotated

from pydantic import Field

from agents.core.tool import LoopContext, ToolResult

# Room under the loop's cap for the note at the end of a part.
_NOTE_RESERVE_CHARS = 1_000
# The most line ranges, and the most offsets, that one note names.
_MAX_NOTE_ITEMS = 8
_MAX_SOURCE_CHARS = 200
_RECORDS_KEY = "text_part_records"

# The `offset` and `limit` arguments of a tool that returns text in parts.
PartOffset = Annotated[int, Field(ge=1, description="Line to start reading from. The first line is 1.")]
PartLimit = Annotated[
    int | None,
    Field(ge=1, description="Maximum number of lines to read. Leave out to read as much as one call returns."),
]

# The first and the last line of a range, counted from 1.
type LineRange = tuple[int, int]


@dataclass
class _Record:
    """The lines of one text when the model last saw it, and the ranges of
    those lines that the model has read."""

    lines: list[str]
    read: list[LineRange] = field(default_factory=list)
    # Since the model last read the text, lines were added or removed.
    renumbered: bool = False
    # Since the model last read the text, something other than the model changed it.
    changed_elsewhere: bool = False


def part_chars(ctx: LoopContext) -> int:
    """The most characters in one part, not counting its note."""
    return max(ctx.max_result_chars - _NOTE_RESERVE_CHARS, ctx.max_result_chars // 2)


def text_part(
    ctx: LoopContext,
    text: str,
    *,
    offset: int,
    limit: int | None,
    key: str,
    source: str,
    tool: str,
    same_args: str = "",
) -> ToolResult:
    """Return the lines of `text` from line `offset`, at most `limit` lines,
    and record them as read under `key`.

    A text that fits under the loop's cap comes back whole.  A longer one
    comes back in parts of at most `part_chars` characters, and a line
    longer than that counts as several lines.  A part ends with a note that
    names `source` and says how to read the rest: call `tool` with
    `same_args`, such as "the same `url`", and an `offset`.
    """
    size = part_chars(ctx)
    whole_lines = _split_lines(text)
    lines = _split_long_lines(whole_lines, size)
    total = len(lines)
    if offset > max(total, 1):
        return ToolResult(
            content=f"offset {offset} is past the end of {source}, which has {total} lines.", is_error=True
        )

    record = _synced_record(ctx, key, lines)
    metadata = {"chars": len(text), "lines": total}
    if offset == 1 and (limit is None or limit >= total) and len(text) <= ctx.max_result_chars:
        record.read = [(1, total)] if total else []
        record.renumbered = record.changed_elsewhere = False
        return ToolResult(content=text, metadata=metadata)

    start = offset - 1
    stop = total if limit is None else min(total, start + limit)
    end = _fit_lines(lines, start, stop, size)
    part = "".join(lines[start:end])
    record.read = _merge([*record.read, (offset, end)])
    note = _note(
        record,
        offset=offset,
        end=end,
        split=total > len(whole_lines),
        source=source,
        tool=tool,
        same_args=same_args,
        size=size,
        budget=ctx.max_result_chars - len(part) - 2,
    )
    record.renumbered = record.changed_elsewhere = False
    return ToolResult(
        content=f"{part}\n\n{note}",
        metadata={**metadata, "truncated": end < total, "start_line": offset, "end_line": end},
    )


def record_edit(ctx: LoopContext, key: str, before: str, after: str) -> None:
    """Record that the model changed the text under `key` from `before` to
    `after`.  Read lines that the change moves keep counting as read, and so
    do changed lines when the model had read all the lines it replaced."""
    record = (ctx.extras.get(_RECORDS_KEY) or {}).get(key)
    if record is None:
        return
    size = part_chars(ctx)
    before_lines = _split_long_lines(_split_lines(before), size)
    if record.lines != before_lines:
        _remap(record, before_lines, by_model=False)
    _remap(record, _split_long_lines(_split_lines(after), size), by_model=True)


def record_whole_read(ctx: LoopContext, key: str, text: str) -> None:
    """Record that the model knows all of `text`, such as a file it wrote."""
    lines = _split_long_lines(_split_lines(text), part_chars(ctx))
    records: dict[str, _Record] = ctx.extras.setdefault(_RECORDS_KEY, {})
    records[key] = _Record(lines=lines, read=[(1, len(lines))] if lines else [])


def forget_reads(ctx: LoopContext, key: str) -> None:
    """Forget what the model has read of the text under `key`."""
    (ctx.extras.get(_RECORDS_KEY) or {}).pop(key, None)


def describe_unread(ctx: LoopContext, key: str, text: str) -> str | None:
    """Name the lines of `text` that the model has not read, such as
    "lines 802–4605 of 4605".  None when it has read all of them, or when
    there is no record of `key`."""
    if key not in (ctx.extras.get(_RECORDS_KEY) or {}):
        return None
    lines = _split_long_lines(_split_lines(text), part_chars(ctx))
    unread = _unread(_synced_record(ctx, key, lines).read, len(lines))
    if not unread:
        return None
    return f"{_describe_ranges(unread, _MAX_NOTE_ITEMS)} of {len(lines)}"


def _synced_record(ctx: LoopContext, key: str, lines: list[str]) -> _Record:
    """The record of `key`, brought up to date with `lines`."""
    records: dict[str, _Record] = ctx.extras.setdefault(_RECORDS_KEY, {})
    record = records.get(key)
    if record is None:
        record = records[key] = _Record(lines=lines)
    elif record.lines != lines:
        _remap(record, lines, by_model=False)
    return record


def _remap(record: _Record, new_lines: list[str], *, by_model: bool) -> None:
    """Carry the read ranges over to `new_lines`.

    Read lines that are still there keep counting as read, at their new
    line numbers.  Changed or added lines count as read only when the model
    made the change and had read every line it replaced.
    """
    read: list[LineRange] = []
    renumbered = False
    for tag, old_start, old_end, new_start, new_end in _line_changes(record.lines, new_lines):
        if tag == "equal":
            shift = new_start - old_start
            renumbered = renumbered or shift != 0
            for first, last in record.read:
                first, last = max(first, old_start + 1), min(last, old_end)
                if first <= last:
                    read.append((first + shift, last + shift))
        elif tag != "delete" and by_model and _covers(record.read, old_start + 1, old_end):
            read.append((new_start + 1, new_end))

    record.lines = new_lines
    record.read = _merge(read)
    record.renumbered = record.renumbered or renumbered
    record.changed_elsewhere = record.changed_elsewhere or not by_model


def _line_changes(old: list[str], new: list[str]) -> list[tuple[str, int, int, int, int]]:
    """`difflib` opcodes from `old` to `new`.

    The unchanged lines at the start and the end are matched first.  `difflib`
    treats a line that fills much of a long text as noise, so in a file of
    repeated lines it would otherwise count an edit at one end as replacing
    everything.
    """
    same_start = 0
    while same_start < min(len(old), len(new)) and old[same_start] == new[same_start]:
        same_start += 1
    same_end = 0
    while (
        same_end < min(len(old), len(new)) - same_start and old[len(old) - 1 - same_end] == new[len(new) - 1 - same_end]
    ):
        same_end += 1

    middle = difflib.SequenceMatcher(None, old[same_start : len(old) - same_end], new[same_start : len(new) - same_end])
    changes = [("equal", 0, same_start, 0, same_start)] if same_start else []
    changes += [
        (tag, i1 + same_start, i2 + same_start, j1 + same_start, j2 + same_start)
        for tag, i1, i2, j1, j2 in middle.get_opcodes()
    ]
    if same_end:
        changes.append(("equal", len(old) - same_end, len(old), len(new) - same_end, len(new)))
    return changes


def _note(
    record: _Record,
    *,
    offset: int,
    end: int,
    split: bool,
    source: str,
    tool: str,
    same_args: str,
    size: int,
    budget: int,
) -> str:
    """The note at the end of a part, shortened to fit in `budget` characters
    when it can be."""
    total = len(record.lines)
    unread = _unread(record.read, total)
    calls = _calls_for(record.lines, unread, size, _MAX_NOTE_ITEMS + 1)
    if len(source) > _MAX_SOURCE_CHARS:
        source = source[: _MAX_SOURCE_CHARS - 1] + "…"
    note = ""
    for items in range(_MAX_NOTE_ITEMS, 0, -1):
        sentences = [f"[Showing lines {offset}–{end} of {total} in {source}."]
        if record.changed_elsewhere:
            sentences.append(f"{source} has changed since your last read.")
        if record.renumbered:
            sentences.append(
                "Lines have been added or removed since your last read, so line numbers in earlier notes no longer apply."
            )
        if split:
            sentences.append(f"Lines longer than {size:,} characters count as several lines here.")
        if not unread:
            sentences.append(f"You have now read all of {source}.")
        else:
            sentences.append(f"So far, you have not read {_describe_ranges(unread, items)}.")
            shown = calls[:items]
            sentences.append(f"To read them, {_describe_calls(tool, same_args, shown)}.")
            if len(shown) > 1:
                sentences.append("You can make these calls in one turn.")
            if len(calls) > len(shown):
                sentences.append("The notes at the end of those parts name the rest.")
        note = "  ".join(sentences) + "]"
        if len(note) <= budget:
            break
    return note


def _calls_for(lines: list[str], unread: list[LineRange], size: int, most: int) -> list[tuple[int, int | None]]:
    """The `offset` and `limit` of each part that reads the `unread` lines,
    in order, at most `most` of them.

    A call without `limit` returns the same lines as one with it when the
    part ends because it is full, so `limit` is given only where a part must
    stop before lines that the model has read.
    """
    calls: list[tuple[int, int | None]] = []
    for first, last in unread:
        offset = first
        while offset <= last and len(calls) < most:
            end = _fit_lines(lines, offset - 1, last, size)
            needs_limit = end == last and last < len(lines)
            calls.append((offset, end - offset + 1 if needs_limit else None))
            offset = end + 1
    return calls


def _describe_calls(tool: str, same_args: str, calls: list[tuple[int, int | None]]) -> str:
    if all(limit is None for _, limit in calls):
        same = f"{same_args} and " if same_args else ""
        return f"call `{tool}` with {same}`offset` {_join([str(offset) for offset, _ in calls])}"
    each = [f"`offset` {offset}" + (f" and `limit` {limit}" if limit else "") for offset, limit in calls]
    if len(each) == 1:
        same = f"{same_args}, " if same_args else ""
        return f"call `{tool}` with {same}{each[0]}"
    same = f" with {same_args}" if same_args else ""
    return f"call `{tool}`{same} once for each of these: {'; '.join(each)}"


def _describe_ranges(ranges: list[LineRange], most: int) -> str:
    words = [str(first) if first == last else f"{first}–{last}" for first, last in ranges[:most]]
    if len(ranges) > most:
        words.append(f"{len(ranges) - most} more ranges")
    one_line = len(ranges) == 1 and ranges[0][0] == ranges[0][1]
    return ("line " if one_line else "lines ") + _join(words)


def _join(words: list[str]) -> str:
    return words[0] if len(words) == 1 else ", ".join(words[:-1]) + " and " + words[-1]


def _unread(read: list[LineRange], total: int) -> list[LineRange]:
    unread: list[LineRange] = []
    next_line = 1
    for first, last in read:
        if first > next_line:
            unread.append((next_line, first - 1))
        next_line = max(next_line, last + 1)
    if next_line <= total:
        unread.append((next_line, total))
    return unread


def _covers(read: list[LineRange], first: int, last: int) -> bool:
    return first > last or any(start <= first and last <= stop for start, stop in read)


def _merge(ranges: list[LineRange]) -> list[LineRange]:
    merged: list[LineRange] = []
    for first, last in sorted(r for r in ranges if r[0] <= r[1]):
        if merged and first <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], last))
        else:
            merged.append((first, last))
    return merged


def _split_lines(text: str) -> list[str]:
    """Split on `\\n` only, keeping each line's ending, so the parts join
    back into the exact text.  `str.splitlines` also splits on characters
    such as U+2028 that editors do not count as line breaks."""
    pieces = text.split("\n")
    lines = [piece + "\n" for piece in pieces[:-1]]
    if pieces[-1]:
        lines.append(pieces[-1])
    return lines


def _split_long_lines(lines: list[str], size: int) -> list[str]:
    """Split each line longer than a part into pieces of `size` characters.
    The last piece keeps the line break."""
    pieces: list[str] = []
    for line in lines:
        body = line.removesuffix("\n")
        if len(body) <= size:
            pieces.append(line)
            continue
        line_pieces = [body[i : i + size] for i in range(0, len(body), size)]
        line_pieces[-1] += line[len(body) :]
        pieces.extend(line_pieces)
    return pieces


def _fit_lines(lines: list[str], start: int, stop: int, size: int) -> int:
    """Return the end index of the longest run of lines from `start`, at
    most to `stop`, that fits in `size` characters.  The first line is
    always taken: a line whose text fills a whole part is one character
    over, because of its line break."""
    used = 0
    end = start
    while end < stop and (end == start or used + len(lines[end]) <= size):
        used += len(lines[end])
        end += 1
    return end
