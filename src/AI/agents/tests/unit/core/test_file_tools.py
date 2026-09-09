"""Tests for the CC-style file tools: read_file / edit_file / write_file /
discard_file_changes.

These tools operate on a real filesystem (tmp_path) — that's the point.
Each test gets its own tmp_path so they don't interfere.  External git
calls in discard_file_changes are exercised via subprocess monkeypatch.
"""

from __future__ import annotations

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


# ---------------------------------------------------------------------------
# read_file
# ---------------------------------------------------------------------------


class TestReadFile:
    async def test_reads_and_marks_read_set(self, tmp_path: Path):
        (tmp_path / "App").mkdir()
        (tmp_path / "App" / "model.json").write_text('{"a": 1}\n', encoding="utf-8")

        ctx = _ctx(tmp_path)
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "App/model.json"}), ctx
        )
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

    async def test_large_file_truncated(self, tmp_path: Path):
        # 70k chars > _MAX_READ_CHARS (60k).
        big = "x" * 70_000
        (tmp_path / "big.txt").write_text(big, encoding="utf-8")
        tool = ReadFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "big.txt"}),
            _ctx(tmp_path),
        )
        assert not result.is_error
        assert "truncated" in result.content
        assert result.metadata.get("truncated") is True


# ---------------------------------------------------------------------------
# edit_file
# ---------------------------------------------------------------------------


class TestEditFile:
    async def test_happy_path(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("hello world", encoding="utf-8")
        ctx = _ctx(tmp_path)
        # Pre-read so the read-before-write check passes.
        await ReadFileTool().run(
            ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx
        )
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {"path": "f.txt", "old_string": "world", "new_string": "Altinn"}
            ),
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
            tool.input_schema.model_validate(
                {"path": "f.txt", "old_string": "world", "new_string": "Altinn"}
            ),
            ctx,
        )
        assert result.is_error
        assert "not been read" in result.content
        # File on disk must be unchanged.
        assert (tmp_path / "f.txt").read_text() == "hello world"

    async def test_old_string_not_found(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("hello world", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(
            ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx
        )
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {"path": "f.txt", "old_string": "missing", "new_string": "x"}
            ),
            ctx,
        )
        assert result.is_error
        assert "not found" in result.content

    async def test_old_string_not_unique_blocks_default(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("foo foo foo", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(
            ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx
        )
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {"path": "f.txt", "old_string": "foo", "new_string": "bar"}
            ),
            ctx,
        )
        assert result.is_error
        assert "matches 3" in result.content
        # File still unchanged.
        assert (tmp_path / "f.txt").read_text() == "foo foo foo"

    async def test_replace_all_unlocks_multi_match(self, tmp_path: Path):
        (tmp_path / "f.txt").write_text("foo foo foo", encoding="utf-8")
        ctx = _ctx(tmp_path)
        await ReadFileTool().run(
            ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx
        )
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
        await ReadFileTool().run(
            ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx
        )
        tool = EditFileTool()
        result = await tool.run(
            tool.input_schema.model_validate(
                {"path": "f.txt", "old_string": "hello", "new_string": "hello"}
            ),
            ctx,
        )
        assert result.is_error
        assert "no change" in result.content.lower()

    async def test_denied_in_read_only_mode(self, tmp_path: Path):
        tool = EditFileTool()
        args = tool.input_schema.model_validate(
            {"path": "f.txt", "old_string": "a", "new_string": "b"}
        )
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
            tool.input_schema.model_validate(
                {"path": "App/new.json", "content": '{"k": 1}'}
            ),
            ctx,
        )
        assert not result.is_error
        assert (tmp_path / "App" / "new.json").read_text() == '{"k": 1}'
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
        await ReadFileTool().run(
            ReadFileTool().input_schema.model_validate({"path": "f.txt"}), ctx
        )
        tool = WriteFileTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "f.txt", "content": "new"}),
            ctx,
        )
        assert not result.is_error
        assert (tmp_path / "f.txt").read_text() == "new"


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

        monkeypatch.setattr(
            "agents.core.tools.file_tool.subprocess.run", fake_run
        )

        ctx = _ctx(tmp_path)
        ctx.extras["changed_files"] = {"App/x.json", "App/y.json"}
        ctx.extras["read_set"] = {"App/x.json", "App/y.json"}

        tool = DiscardFileChangesTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "App/x.json"}), ctx
        )
        assert not result.is_error
        assert called["args"] == ["git", "checkout", "HEAD", "--", "App/x.json"]
        assert called["cwd"] == str(tmp_path)
        # Only the named file is dropped from tracking — the other survives.
        assert ctx.extras["changed_files"] == {"App/y.json"}
        assert ctx.extras["read_set"] == {"App/y.json"}

    async def test_git_failure_surfaces_as_error(self, monkeypatch, tmp_path: Path):
        def fake_run(args, **kwargs):
            raise subprocess.CalledProcessError(
                1, args, output="", stderr="error: pathspec did not match"
            )

        monkeypatch.setattr(
            "agents.core.tools.file_tool.subprocess.run", fake_run
        )

        tool = DiscardFileChangesTool()
        result = await tool.run(
            tool.input_schema.model_validate({"path": "App/nope.json"}),
            _ctx(tmp_path),
        )
        assert result.is_error
        assert "did not match" in result.content
