"""Tests for `text_part`, which `read_file`, `web_fetch` and `skill` use to return long text in parts."""

from __future__ import annotations

import re

import pytest

from agents.core.compaction import DEFAULT_MAX_RESULT_CHARS, cap_tool_result
from agents.core.tool import LoopContext, ToolResult
from agents.core.tools.utils.text_parts import (
    describe_unread,
    part_chars,
    record_edit,
    record_whole_read,
    text_part,
)

KEY = "file:f.txt"
MANY_LINES = ("y" * 79 + "\n") * 5_000
_OFFSETS = re.compile(r"call `tool` with `offset` ([\d, and]+)\.")


def _ctx(max_result_chars: int = DEFAULT_MAX_RESULT_CHARS) -> LoopContext:
    return LoopContext(session_id="s1", repo_path="/repo", allow_app_changes=False, max_result_chars=max_result_chars)


def _part(ctx: LoopContext, text: str, offset: int = 1, limit: int | None = None, source: str = "f.txt") -> ToolResult:
    return text_part(ctx, text, offset=offset, limit=limit, key=KEY, source=source, tool="tool")


def _note_offsets(result: ToolResult) -> list[int]:
    """The offsets that a note tells the model to read, when it names no `limit`."""
    match = _OFFSETS.search(result.content)
    return [int(offset) for offset in re.split(r", | and ", match.group(1))] if match else []


def _read_all(ctx: LoopContext, text: str) -> list[ToolResult]:
    """Read `text` the way the note asks: the first part, then every offset
    its note names, in one batch, until a note names none."""
    results = [_part(ctx, text)]
    offsets = _note_offsets(results[-1])
    while offsets:
        batch = [_part(ctx, text, offset=offset) for offset in offsets]
        results.extend(batch)
        offsets = _note_offsets(batch[-1])
    return results


def _without_note(result: ToolResult) -> str:
    return result.content.rsplit("\n\n[Showing lines", 1)[0]


@pytest.mark.parametrize("text", ["", "one line", "a\nb\n", "a\n\nb"])
def test_short_text_comes_back_unchanged_without_a_note(text: str):
    result = _part(_ctx(), text)
    assert not result.is_error
    assert result.content == text


def test_text_that_fits_under_the_cap_comes_back_whole():
    # Longer than one part, but the loop would not cut it.
    text = "x" * (DEFAULT_MAX_RESULT_CHARS - 10)
    assert len(text) > part_chars(_ctx())
    assert _part(_ctx(), text).content == text


@pytest.mark.parametrize("max_result_chars", [DEFAULT_MAX_RESULT_CHARS, 8_000])
@pytest.mark.parametrize(
    "text",
    [
        MANY_LINES,
        "x" * 437_753,  # one line, like the docs site's sitemap.xml
        "x" * 50_000 + "\nnext\n" + "z" * 46_000 + "\n",
        "x" * 23_000 + "\n" + "x" * 23_000 + "\n",
    ],
    ids=["many-lines", "one-long-line", "mixed", "lines-that-fill-a-part"],
)
def test_parts_fit_under_the_loop_cap_and_join_into_the_text(text: str, max_result_chars: int):
    # If the loop cut a part, the model would lose text and the note with
    # the offsets of the rest.
    ctx = _ctx(max_result_chars)
    results = _read_all(ctx, text)
    assert len(results) > 1
    for result in results:
        assert not result.is_error
        assert cap_tool_result(result.content, max_result_chars) == result.content
    assert "".join(_without_note(r) for r in results) == text
    assert results[-1].content.endswith("You have now read all of f.txt.]")


def test_note_names_the_unread_lines_and_the_offset_of_each_part():
    result = _part(_ctx(), ("y" * 79 + "\n") * 1_000)
    last = result.metadata["end_line"]
    assert result.content.endswith(
        f"\n\n[Showing lines 1–{last} of 1000 in f.txt.  So far, you have not read lines {last + 1}–1000.  "
        f"To read them, call `tool` with `offset` {last + 1}, {2 * last + 1} and {3 * last + 1}.  "
        "You can make these calls in one turn.]"
    )


def test_note_names_at_most_eight_offsets():
    result = _part(_ctx(), MANY_LINES)
    assert len(_note_offsets(result)) == 8
    assert result.content.endswith("The notes at the end of those parts name the rest.]")


def test_note_names_lines_skipped_by_offsets_the_model_worked_out():
    # Parts end where the characters run out, so an offset worked out from
    # the size of the first part can skip lines.
    text = "".join(f"line {n} " + "z" * (n % 50) + "\n" for n in range(1, 3_001))
    ctx = _ctx()
    first = _part(ctx, text)
    step = first.metadata["end_line"]
    guessed = [_part(ctx, text, offset=offset) for offset in range(step + 1, 3_001, step)]

    skipped = [
        (r.metadata["end_line"] + 1, n.metadata["start_line"] - 1)
        for r, n in zip([first, *guessed], guessed, strict=False)
        if n.metadata["start_line"] > r.metadata["end_line"] + 1
    ]
    assert skipped
    first_skipped, last_skipped = skipped[0]
    assert f"So far, you have not read lines {first_skipped}–{last_skipped}" in guessed[-1].content
    limit = last_skipped - first_skipped + 1
    assert f"`offset` {first_skipped} and `limit` {limit}" in guessed[-1].content


def test_note_says_when_a_long_line_was_split():
    result = _part(_ctx(), "x" * 50_000)
    assert result.metadata["lines"] == 3
    assert f"Lines longer than {part_chars(_ctx()):,} characters count as several lines here." in result.content


def test_offset_and_limit_return_those_lines():
    text = "".join(f"line {n}\n" for n in range(1, 11))
    result = _part(_ctx(), text, offset=3, limit=2)
    assert result.content == (
        "line 3\nline 4\n\n\n[Showing lines 3–4 of 10 in f.txt.  So far, you have not read lines 1–2 and 5–10.  "
        "To read them, call `tool` once for each of these: `offset` 1 and `limit` 2; `offset` 5.  "
        "You can make these calls in one turn.]"
    )


def test_offset_past_the_end_is_an_error():
    result = _part(_ctx(), "a\nb\n", offset=3)
    assert result.is_error
    assert result.content == "offset 3 is past the end of f.txt, which has 2 lines."


def test_note_with_a_long_source_still_fits_under_the_cap():
    source = "https://docs.altinn.studio/" + "a" * 600 + "/"
    ctx = _ctx()
    text = "x" * 23_000 + "\n" + "y" * 23_000 + "\n"
    for offset in (1, 2):
        result = _part(ctx, text, offset=offset, source=source)
        assert cap_tool_result(result.content, DEFAULT_MAX_RESULT_CHARS) == result.content


def test_lines_moved_by_an_edit_keep_counting_as_read():
    ctx = _ctx()
    lines = [f"line {n}\n" for n in range(1, 4_001)]
    before = "".join(lines)
    first = _part(ctx, before)
    end = first.metadata["end_line"]
    # The model deletes lines 3 and 4 in the part it has read.
    after = "".join(lines[:2] + lines[4:])
    record_edit(ctx, KEY, before, after)

    second = _part(ctx, after, offset=end + 1)

    assert "Lines have been added or removed since your last read" in second.content
    # The offset from the first note now starts two lines further on.
    assert second.content.endswith(
        f"So far, you have not read lines {end - 1}–{end}.  To read them, call `tool` with `offset` {end - 1} "
        "and `limit` 2.]"
    )


def test_changed_lines_count_as_read_when_the_model_had_read_them():
    ctx = _ctx()
    before = "".join(f"line {n}\n" for n in range(1, 4_001))
    first = _part(ctx, before)
    end = first.metadata["end_line"]
    record_edit(ctx, KEY, before, before.replace("line 5\n", "linje 5\nlinje 5b\n"))
    assert (
        describe_unread(ctx, KEY, before.replace("line 5\n", "linje 5\nlinje 5b\n")) == f"lines {end + 2}–4001 of 4001"
    )


def test_an_edit_at_one_end_of_repeated_lines_keeps_the_read_lines():
    # difflib treats a line that fills much of a text as noise.  Without
    # matching the unchanged end first, this edit would count as replacing
    # every line.
    ctx = _ctx()
    before = "unique header\n" + ("x" * 80 + "\n") * 5_000
    first = _part(ctx, before)
    end = first.metadata["end_line"]

    after = "changed header\n" + before.split("\n", 1)[1]
    record_edit(ctx, KEY, before, after)

    assert describe_unread(ctx, KEY, after) == f"lines {end + 1}–5001 of 5001"


def test_a_change_the_model_did_not_make_is_reported():
    ctx = _ctx()
    before = "".join(f"line {n}\n" for n in range(1, 4_001))
    first = _part(ctx, before)
    end = first.metadata["end_line"]
    after = before.replace("line 2\n", "line two\n")

    second = _part(ctx, after, offset=end + 1)

    assert "f.txt has changed since your last read." in second.content
    assert second.content.endswith(
        "So far, you have not read line 2.  To read them, call `tool` with `offset` 2 and `limit` 1.]"
    )


def test_describe_unread_names_the_lines_left():
    ctx = _ctx()
    assert describe_unread(ctx, KEY, MANY_LINES) is None
    first = _part(ctx, MANY_LINES)
    assert describe_unread(ctx, KEY, MANY_LINES) == f"lines {first.metadata['end_line'] + 1}–5000 of 5000"
    record_whole_read(ctx, KEY, MANY_LINES)
    assert describe_unread(ctx, KEY, MANY_LINES) is None
