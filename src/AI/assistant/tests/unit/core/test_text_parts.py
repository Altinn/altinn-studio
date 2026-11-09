"""Tests for `text_part`, which `read_file` and `web_fetch` use to return long text in parts."""

from __future__ import annotations

import pytest

from agents.core.compaction import DEFAULT_MAX_RESULT_CHARS, cap_tool_result
from agents.core.tool import ToolResult
from agents.core.tools.utils.text_parts import MAX_PART_CHARS, text_part

NEXT_CALL = "call `tool` with"


def _part(text: str, offset: int = 1, limit: int | None = None) -> ToolResult:
    return text_part(text, offset=offset, limit=limit, source="f.txt", next_call=NEXT_CALL)


def _read_all(text: str) -> list[ToolResult]:
    """Read `text` part by part, following each note's offset."""
    results = [_part(text)]
    while results[-1].metadata.get("truncated"):
        results.append(_part(text, offset=results[-1].metadata["end_line"] + 1))
    return results


def _without_note(result: ToolResult) -> str:
    return result.content.rsplit("\n\n[Showing lines", 1)[0]


@pytest.mark.parametrize("text", ["", "one line", "a\nb\n", "a\n\nb"])
def test_short_text_comes_back_unchanged_without_a_note(text: str):
    result = _part(text)
    assert not result.is_error
    assert result.content == text


@pytest.mark.parametrize(
    "text",
    [
        ("y" * 79 + "\n") * 5_000,
        "x" * 437_753,  # one line, like the docs site's sitemap.xml
        "x" * 50_000 + "\nnext\n" + "z" * MAX_PART_CHARS * 2 + "\n",
        "x" * MAX_PART_CHARS + "\n" + "x" * MAX_PART_CHARS + "\n",
    ],
    ids=["many-lines", "one-long-line", "mixed", "lines-that-fill-a-part"],
)
def test_parts_fit_under_the_loop_cap_and_join_into_the_text(text: str):
    # The loop cuts every result at DEFAULT_MAX_RESULT_CHARS.  If it cut a
    # part, the model would lose text and the note with the next offset.
    results = _read_all(text)
    assert len(results) > 1
    for result in results:
        assert not result.is_error
        assert cap_tool_result(result.content, DEFAULT_MAX_RESULT_CHARS) == result.content
    assert "".join(_without_note(r) for r in results) == text
    assert results[-1].content.endswith("This is the end of f.txt.]")


def test_note_names_the_lines_and_the_next_call():
    result = _part(("y" * 79 + "\n") * 5_000)
    last = result.metadata["end_line"]
    assert result.content.endswith(
        f"\n\n[Showing lines 1–{last} of 5000 in f.txt.  To read the next part, call `tool` with `offset` {last + 1}.]"
    )


def test_note_says_when_a_long_line_was_split():
    result = _part("x" * 50_000)
    assert result.metadata["lines"] == 3
    assert f"Lines longer than {MAX_PART_CHARS:,} characters count as several lines here." in result.content


def test_offset_and_limit_return_those_lines():
    text = "".join(f"line {n}\n" for n in range(1, 11))
    result = _part(text, offset=3, limit=2)
    assert result.content == (
        "line 3\nline 4\n\n\n[Showing lines 3–4 of 10 in f.txt.  To read the next part, call `tool` with `offset` 5.]"
    )


def test_offset_past_the_end_is_an_error():
    result = _part("a\nb\n", offset=3)
    assert result.is_error
    assert result.content == "offset 3 is past the end of f.txt, which has 2 lines."
