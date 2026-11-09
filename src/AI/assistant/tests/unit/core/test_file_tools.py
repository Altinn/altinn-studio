"""Tests for the CC-style file tools: read_file / edit_file / write_file /
discard_file_changes.

These tools operate on a real filesystem (tmp_path) — that's the point.
Each test gets its own tmp_path so they don't interfere.  External git
calls in discard_file_changes are exercised via subprocess monkeypatch.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import pytest

from agents.core import (
    DiscardFileChangesTool,
    EditFileTool,
    LoopContext,
    ReadFileTool,
    WriteFileTool,
)


def _ctx(repo: Path, *, allow_app_changes: bool = True) -> LoopContext:
    return LoopContext(
        session_id="s1",
        repo_path=str(repo),
        allow_app_changes=allow_app_changes,
    )


def _text_resource_file(count: int) -> str:
    """A Studio-formatted text resource file with `count` texts, about 90
    characters per text."""
    resources = [{"id": f"text-{n}", "value": f"Tekst nummer {n} i appen"} for n in range(count)]
    return json.dumps({"language": "nn", "resources": resources}, indent=2, ensure_ascii=False) + "\n"


# ---------------------------------------------------------------------------
# read_file
# ---------------------------------------------------------------------------


class TestReadFile:
    async def test_reads_and_marks_read_set(self, tmp_path: Path):
        (tmp_path / "App").mkdir()
        (tmp_path / "App" / "model.json").write_text('{"a": 1}\n', encoding="utf-8")

        ctx = _ctx(tmp_path)
        tool = ReadFileTool()
        result = await tool.run(tool.input_schema.model_validate({"path": "App/model.json"}), ctx)
        assert not result.is_error
        assert '"a": 1' in result.content
        assert "App/model.json" in ctx.extras["read_set"]

    async def test_missing_file_is_error(self, tmp_path: Path):
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "missing.json"}),
            _ctx(tmp_path),
        )
        assert result.is_error
        assert "does not exist" in result.content

    async def test_directory_path_suggests_recovery(self, tmp_path: Path):
        # When the model points read_file at a directory (a common goof
        # — e.g. `App/ui/form` instead of `App/ui/form/layouts/Side1.json`),
        # the error must steer it to the right next call rather than
        # leaving it to guess.
        (tmp_path / "App" / "ui" / "form").mkdir(parents=True)
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "App/ui/form"}),
            _ctx(tmp_path),
        )
        assert result.is_error
        assert "is a directory" in result.content
        assert "scan_repo" in result.content

    @pytest.mark.parametrize("path", ["/etc/passwd", "../escape", "App/../../etc/passwd"])
    async def test_path_traversal_refused(self, tmp_path: Path, path: str):
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": path}),
            _ctx(tmp_path),
        )
        assert result.is_error
        # The exact phrasing differs per case (absolute vs `..`); we just
        # need it to refuse and not actually read.
        assert "not allowed" in result.content or "escapes" in result.content

    async def test_large_file_returns_first_part_with_next_offset(self, tmp_path: Path):
        text = _text_resource_file(2_000)
        (tmp_path / "resource.nn.json").write_text(text, encoding="utf-8")
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "resource.nn.json"}),
            _ctx(tmp_path),
        )
        assert not result.is_error
        last, total = result.metadata["end_line"], result.metadata["lines"]
        assert total == text.count("\n")
        assert f"Showing lines 1–{last} of {total} in resource.nn.json" in result.content
        assert f"call `read_file` with `offset` {last + 1}" in result.content

    async def test_offset_reads_the_next_part(self, tmp_path: Path):
        text = _text_resource_file(2_000)
        (tmp_path / "resource.nn.json").write_text(text, encoding="utf-8")
        tool = ReadFileTool()
        ctx = _ctx(tmp_path)
        first = await tool.run(tool.input_schema.model_validate({"path": "resource.nn.json"}), ctx)
        offset = first.metadata["end_line"] + 1
        second = await tool.run(
            tool.input_schema.model_validate({"path": "resource.nn.json", "offset": offset}),
            ctx,
        )
        assert second.metadata["start_line"] == offset
        assert second.content.startswith(text.split("\n")[offset - 1] + "\n")

    async def test_offset_past_end_is_error_and_does_not_mark_read(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("a\nb\n", encoding="utf-8")
        tool = ReadFileTool()
        ctx = _ctx(tmp_path)
        result = await tool.run(tool.input_schema.model_validate({"path": "f.txt", "offset": 3}), ctx)
        assert result.is_error
        assert "has 2 lines" in result.content
        assert "f.txt" not in ctx.extras.get("read_set", set())

    async def test_offset_and_limit_read_those_lines(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("".join(f"line {n}\n" for n in range(1, 11)), encoding="utf-8")
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "offset": 3, "limit": 2}),
            _ctx(tmp_path),
        )
        assert result.content.startswith("line 3\nline 4\n\n\n[Showing lines 3–4 of 10 in f.txt.")

    async def test_lines_moved_by_an_edit_still_count_as_read(self, tmp_path: Path):
        text = _text_resource_file(2_000)
        (tmp_path / "resource.nn.json").write_text(text, encoding="utf-8")
        ctx = _ctx(tmp_path)
        read = ReadFileTool()
        first = await read.run(read.input_schema.model_validate({"path": "resource.nn.json"}), ctx)
        edit = EditFileTool()
        # Remove the second text, four lines, from the part already read.
        removed = '    {\n      "id": "text-1",\n      "value": "Tekst nummer 1 i appen"\n    },\n'
        await edit.run(
            edit.input_schema.model_validate({"path": "resource.nn.json", "old_string": removed, "new_string": ""}),
            ctx,
        )
        end = first.metadata["end_line"]

        second = await read.run(
            read.input_schema.model_validate({"path": "resource.nn.json", "offset": end + 1}),
            ctx,
        )

        # The offset from the first note is now four lines on, and the note
        # names the lines in between.
        assert "Lines have been added or removed since your last read" in second.content
        assert f"So far, you have not read lines {end - 3}–{end}" in second.content


# ---------------------------------------------------------------------------
# edit_file
# ---------------------------------------------------------------------------


class TestEditFile:
    async def test_happy_path(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("hello world", encoding="utf-8")
        ctx = _ctx(tmp_path)
        # Pre-read so the read-before-write check passes.
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "world", "new_string": "Altinn"}),
            ctx,
        )
        assert not result.is_error
        assert (tmp_path / "f.txt").read_text() == "hello Altinn"
        assert "f.txt" in ctx.extras["changed_files"]

    async def test_refuses_without_prior_read(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("hello world", encoding="utf-8")
        ctx = _ctx(tmp_path)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "world", "new_string": "Altinn"}),
            ctx,
        )
        assert result.is_error
        assert "not been read" in result.content
        # File on disk must be unchanged.
        assert (tmp_path / "f.txt").read_text() == "hello world"

    async def test_old_string_not_found(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("hello world", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "missing", "new_string": "x"}),
            ctx,
        )
        assert result.is_error
        assert "not found" in result.content

    async def test_old_string_not_unique_blocks_default(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("foo foo foo", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "foo", "new_string": "bar"}),
            ctx,
        )
        assert result.is_error
        assert "matches 3" in result.content
        # File still unchanged.
        assert (tmp_path / "f.txt").read_text() == "foo foo foo"

    async def test_replace_all_unlocks_multi_match(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("foo foo foo", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {
                    "path": "f.txt",
                    "old_string": "foo",
                    "new_string": "bar",
                    "replace_all": True,
                }
            ),
            ctx,
        )
        assert not result.is_error
        assert (tmp_path / "f.txt").read_text() == "bar bar bar"

    async def test_no_op_edit_rejected(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("hello", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "hello", "new_string": "hello"}),
            ctx,
        )
        assert result.is_error
        assert "no change" in result.content.lower()

    async def test_denied_in_read_only_mode(self, tmp_path: Path):
        tool = EditFileTool()
        args = tool.input_schema.model_validate({"path": "f.txt", "old_string": "a", "new_string": "b"})
        perm = await tool.check_permission(args, _ctx(tmp_path, allow_app_changes=False))
        assert not perm.allowed


# ---------------------------------------------------------------------------
# write_file
# ---------------------------------------------------------------------------


class TestWriteFile:
    async def test_create_new_file(self, tmp_path: Path):
        ctx = _ctx(tmp_path)
        tool = WriteFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "App/new.json", "content": '{\n  "k": 1\n}'}),
            ctx,
        )
        assert not result.is_error
        assert (tmp_path / "App" / "new.json").read_text() == '{\n  "k": 1\n}'
        assert "App/new.json" in ctx.extras["changed_files"]
        # After write the file counts as "read" — subsequent edits are OK.
        assert "App/new.json" in ctx.extras["read_set"]

    async def test_existing_file_needs_read_first(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("old", encoding="utf-8")
        ctx = _ctx(tmp_path)
        tool = WriteFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "content": "new"}),
            ctx,
        )
        assert result.is_error
        assert (tmp_path / "f.txt").read_text() == "old"

    async def test_overwrite_after_read(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("old", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = WriteFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "content": "new"}),
            ctx,
        )
        assert not result.is_error
        assert (tmp_path / "f.txt").read_text() == "new"

    async def test_refuses_to_replace_a_file_read_only_in_part(self, tmp_path: Path):
        text = _text_resource_file(2_000)
        (tmp_path / "resource.nn.json").write_text(text, encoding="utf-8")
        ctx = _ctx(tmp_path)
        read = ReadFileTool()
        first = await read.run(read.input_schema.model_validate({"path": "resource.nn.json"}), ctx)
        tool = WriteFileTool()
        args = tool.input_schema.model_validate({"path": "resource.nn.json", "content": "{}"})

        result = await tool.run(args, ctx)

        assert result.is_error
        total = first.metadata["lines"]
        assert f"you have not read lines {first.metadata['end_line'] + 1}–{total} of {total}" in result.content
        assert (tmp_path / "resource.nn.json").read_text() == text

    async def test_refuses_when_it_cannot_check_the_file(self, tmp_path: Path):
        (tmp_path / "resource.nn.json").write_text(_text_resource_file(2_000), encoding="utf-8")
        ctx = _ctx(tmp_path)
        read = ReadFileTool()
        await read.run(read.input_schema.model_validate({"path": "resource.nn.json"}), ctx)
        # Something else makes the file invalid UTF-8 after the model read part of it.
        (tmp_path / "resource.nn.json").write_bytes(b"\xff\xfe not utf-8")
        tool = WriteFileTool()

        result = await tool.run(tool.input_schema.model_validate({"path": "resource.nn.json", "content": "{}"}), ctx)

        assert result.is_error
        assert "Could not read resource.nn.json to check that you have read all of it" in result.content
        assert (tmp_path / "resource.nn.json").read_bytes() == b"\xff\xfe not utf-8"

    async def test_replaces_a_long_file_once_every_part_is_read(self, tmp_path: Path):
        (tmp_path / "resource.nn.json").write_text(_text_resource_file(2_000), encoding="utf-8")
        ctx = _ctx(tmp_path)
        read = ReadFileTool()
        result = await read.run(read.input_schema.model_validate({"path": "resource.nn.json"}), ctx)
        while result.metadata.get("truncated"):
            offset = result.metadata["end_line"] + 1
            result = await read.run(
                read.input_schema.model_validate({"path": "resource.nn.json", "offset": offset}), ctx
            )
        assert result.content.endswith("You have now read all of resource.nn.json.]")
        tool = WriteFileTool()

        written = await tool.run(tool.input_schema.model_validate({"path": "resource.nn.json", "content": "{}"}), ctx)

        assert not written.is_error


LAYOUT_ON_ONE_LINE = (
    '{"data":{"layout":[{"id":"navn","type":"Input","textResourceBindings":{"title":"Navn på søker"}}]}}'
)

# The text that Studio writes for LAYOUT_ON_ONE_LINE.
LAYOUT_AS_STUDIO_WRITES_IT = """{
  "data": {
    "layout": [
      {
        "id": "navn",
        "type": "Input",
        "textResourceBindings": {
          "title": "Navn på søker"
        }
      }
    ]
  }
}"""

VALUES_ON_ONE_LINE = (
    r'{"maximum":999999999999999.99,"big":1e999,"label":"S\u00F8ker","text":"a, b: {c} \"d\"",'
    r'"codes":[],"extra":{},"id":"a","id":"b"}'
)

VALUES_INDENTED = r"""{
  "maximum": 999999999999999.99,
  "big": 1e999,
  "label": "S\u00F8ker",
  "text": "a, b: {c} \"d\"",
  "codes": [],
  "extra": {},
  "id": "a",
  "id": "b"
}"""


class TestJsonIsFormattedLikeStudio:
    """Studio writes JSON indented.  A file on one line is hard to read, and the next save from
    Studio makes a large diff."""

    async def _write(self, tmp_path: Path, path: str, content: str):
        tool = WriteFileTool()
        return await tool.run(tool.input_schema.model_validate({"path": path, "content": content}), _ctx(tmp_path))

    async def test_a_layout_written_on_one_line_is_saved_as_studio_writes_it(self, tmp_path: Path):
        result = await self._write(tmp_path, "App/ui/form/layouts/Side1.json", LAYOUT_ON_ONE_LINE)

        assert not result.is_error
        assert (tmp_path / "App/ui/form/layouts/Side1.json").read_text(encoding="utf-8") == LAYOUT_AS_STUDIO_WRITES_IT
        assert "formatted as Studio formats it" in result.content

    async def test_an_edit_that_adds_json_on_one_line_is_saved_as_studio_writes_it(self, tmp_path: Path):
        layout = tmp_path / "Side1.json"
        layout.write_text('{\n  "data": {\n    "layout": []\n  }\n}', encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "Side1.json"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {
                    "path": "Side1.json",
                    "old_string": '"layout": []',
                    "new_string": '"layout":[{"id":"navn","type":"Input","textResourceBindings":{"title":"Navn på søker"}}]',
                }
            ),
            ctx,
        )

        assert not result.is_error
        assert layout.read_text(encoding="utf-8") == LAYOUT_AS_STUDIO_WRITES_IT
        assert "formatted as Studio formats it" in result.content

    async def test_only_the_whitespace_changes(self, tmp_path: Path):
        """Numbers, escapes and duplicate keys keep the text of the model, so lines it did not change stay the same."""
        result = await self._write(tmp_path, "model.schema.json", VALUES_ON_ONE_LINE)

        assert not result.is_error
        assert (tmp_path / "model.schema.json").read_text(encoding="utf-8") == VALUES_INDENTED

    @pytest.mark.parametrize(
        "content",
        ['{"a": 1,}', '{"a": NaN}', "[" * 100_000 + "]" * 100_000],
        ids=["trailing comma", "NaN", "too deep for the parser"],
    )
    async def test_text_that_is_not_strict_json_is_saved_as_written(self, tmp_path: Path, content: str):
        """A parse error stays at the place the model wrote it."""
        result = await self._write(tmp_path, "broken.json", content)

        assert not result.is_error
        assert (tmp_path / "broken.json").read_text() == content
        assert "formatted" not in result.content

    async def test_a_file_that_is_not_json_is_saved_as_written(self, tmp_path: Path):
        await self._write(tmp_path, "App/notes.txt", '{"a":1}')

        assert (tmp_path / "App/notes.txt").read_text() == '{"a":1}'


# ---------------------------------------------------------------------------
# discard_file_changes
# ---------------------------------------------------------------------------


class TestDiscardFileChanges:
    async def test_runs_git_checkout_for_one_file(self, monkeypatch, tmp_path: Path):
        called: dict[str, Any] = {}

        def fake_run(args, **kwargs):
            called["args"] = args
            called["cwd"] = kwargs.get("cwd")
            return subprocess.CompletedProcess(args, 0, "", "")

        monkeypatch.setattr("agents.core.tools.discard_file_changes_tool.subprocess.run", fake_run)

        ctx = _ctx(tmp_path)
        ctx.extras["changed_files"] = {"App/x.json", "App/y.json"}
        ctx.extras["read_set"] = {"App/x.json", "App/y.json"}

        tool = DiscardFileChangesTool()
        result = await tool.run(tool.input_schema.model_validate({"path": "App/x.json"}), ctx)
        assert not result.is_error
        assert called["args"] == ["git", "checkout", "HEAD", "--", "App/x.json"]
        assert called["cwd"] == str(tmp_path)
        # Only the named file is dropped from tracking — the other survives.
        assert ctx.extras["changed_files"] == {"App/y.json"}
        assert ctx.extras["read_set"] == {"App/y.json"}

    async def test_forgets_the_lines_read_of_the_file(self, monkeypatch, tmp_path: Path):
        monkeypatch.setattr(
            "agents.core.tools.discard_file_changes_tool.subprocess.run",
            lambda args, **kwargs: subprocess.CompletedProcess(args, 0, "", ""),
        )
        (tmp_path / "f.txt").write_text("old", encoding="utf-8")
        ctx = _ctx(tmp_path)
        read = ReadFileTool()
        await read.run(read.input_schema.model_validate({"path": "f.txt"}), ctx)

        tool = DiscardFileChangesTool()
        await tool.run(tool.input_schema.model_validate({"path": "f.txt"}), ctx)

        assert "file:f.txt" not in ctx.extras["text_part_records"]

    async def test_git_failure_surfaces_as_error(self, monkeypatch, tmp_path: Path):
        def fake_run(args, **kwargs):
            raise subprocess.CalledProcessError(1, args, output="", stderr="error: pathspec did not match")

        monkeypatch.setattr("agents.core.tools.discard_file_changes_tool.subprocess.run", fake_run)

        tool = DiscardFileChangesTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "App/nope.json"}),
            _ctx(tmp_path),
        )
        assert result.is_error
        assert "did not match" in result.content


SETTINGS = """{
  "$schema": "https://altinncdn.no/layoutSettings.schema.v1.json",
  "pages": {
    "order": ["Side1"]
  }
}
"""


class TestEditFileToleratesReformattedWhitespace:
    """A model that copies pretty-printed JSON sends it back collapsed, and then no
    exact match exists however often it re-reads the file."""

    async def _edit(self, tmp_path: Path, old: str, new: str, **extra):
        (tmp_path / "Settings.json").write_text(SETTINGS, encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "Settings.json"}), ctx)
        tool = EditFileTool()
        return await tool.run(
            tool.input_schema.model_validate({"path": "Settings.json", "old_string": old, "new_string": new, **extra}),
            ctx,
        )

    async def test_a_collapsed_json_block_still_matches(self, tmp_path: Path):
        result = await self._edit(
            tmp_path,
            '"pages": {"order": ["Side1"]}',
            '"pages": {"order": ["Side1"], "showLanguageSelector": true}',
        )

        assert not result.is_error
        assert result.metadata["matched_on_whitespace"] is True
        assert "showLanguageSelector" in (tmp_path / "Settings.json").read_text()

    async def test_the_result_says_the_region_took_the_new_formatting(self, tmp_path: Path):
        """Only JSON is formatted after the edit, so in other files the region keeps the spacing of the model."""
        (tmp_path / "f.ts").write_text("call(a, b);", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.ts"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.ts", "old_string": "call(a,b)", "new_string": "call(a,b,c)"}),
            ctx,
        )

        assert "ignoring whitespace" in result.content
        assert (tmp_path / "f.ts").read_text() == "call(a,b,c);"

    async def test_an_exact_match_is_not_reported_as_a_whitespace_match(self, tmp_path: Path):
        result = await self._edit(tmp_path, '"order": ["Side1"]', '"order": ["Side1", "Side2"]')

        assert not result.is_error
        assert result.metadata["matched_on_whitespace"] is False

    async def test_a_whitespace_only_needle_gets_no_fallback(self, tmp_path: Path):
        """It has nothing to match on, so every run of whitespace would qualify."""
        (tmp_path / "f.txt").write_text("a" + " " * 2000 + "b", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": " \t", "new_string": "x"}),
            ctx,
        )

        assert result.is_error
        assert "not found" in result.content

    async def test_text_that_is_absent_however_it_is_spaced_still_fails(self, tmp_path: Path):
        result = await self._edit(tmp_path, '"pages": {"order": ["Side9"]}', "x")

        assert result.is_error
        assert "not found" in result.content

    async def test_spaced_json_matches_a_compact_file(self, tmp_path: Path):
        """Models space out JSON they retype; the repo writes some of it compact."""
        compact = '{\n  "resources": [\n    {"id":"appName","value":"Helseattest"}\n  ]\n}\n'
        (tmp_path / "resource.nb.json").write_text(compact, encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "resource.nb.json"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {
                    "path": "resource.nb.json",
                    "old_string": '{"id": "appName", "value": "Helseattest"}',
                    "new_string": '{"id": "appName", "value": "Helseattest"}, {"id": "next", "value": "Neste"}',
                }
            ),
            ctx,
        )

        assert not result.is_error
        assert result.metadata["matched_on_whitespace"] is True
        assert '"next"' in (tmp_path / "resource.nb.json").read_text()

    async def test_whitespace_between_words_cannot_vanish(self, tmp_path: Path):
        """`foo bar` matching `foobar` would replace semantically different text."""
        (tmp_path / "f.txt").write_text("foobar = 1", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "foo bar", "new_string": "baz"}),
            ctx,
        )

        assert result.is_error
        assert (tmp_path / "f.txt").read_text() == "foobar = 1"

    async def test_a_quoted_literal_keeps_its_spaces(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("label = 'helloworld'", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "'hello world'", "new_string": "'hi'"}),
            ctx,
        )

        assert result.is_error
        assert (tmp_path / "f.txt").read_text() == "label = 'helloworld'"

    async def test_a_needle_with_leading_indent_is_one_match(self, tmp_path: Path):
        """A leading `\\s*` matches with and without the indent it can absorb, and
        counting those as separate places refused an unambiguous edit."""
        (tmp_path / "f.json").write_text('{\n  "a": 1\n}\n', encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.json"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.json", "old_string": '  "a":  1', "new_string": '  "a": 2'}),
            ctx,
        )

        assert not result.is_error
        assert '"a": 2' in (tmp_path / "f.json").read_text()

    async def test_overlapping_candidates_ask_for_context(self, tmp_path: Path):
        """Two starts that overlap are still two, and a non-overlapping scan sees one."""
        (tmp_path / "f.txt").write_text("(((", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "old_string": "( (", "new_string": "()"}),
            ctx,
        )

        assert result.is_error
        assert "2 places" in result.content
        assert (tmp_path / "f.txt").read_text() == "((("

    async def test_an_ambiguous_whitespace_match_asks_for_context(self, tmp_path: Path):
        (tmp_path / "Settings.json").write_text('{\n  "a": 1,\n  "a": 1\n}', encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(ReadFileTool().input_schema.model_validate({"path": "Settings.json"}), ctx)
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {"path": "Settings.json", "old_string": '"a":   1', "new_string": '"a": 2'}
            ),
            ctx,
        )

        assert result.is_error
        assert "2 places" in result.content
