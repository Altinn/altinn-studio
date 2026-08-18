"""Tests for `upgrade_app_to_v9`.

The tool calls studioctl-server's HTTP endpoint over a unix socket; the
`_post_upgrade` seam and the `git status` subprocess are monkeypatched so
these run without a server or a real repo.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import httpx

from agents.core import LoopContext, UpgradeAppToV9Tool


def _ctx(repo: Path, *, allow_app_changes: bool = True) -> LoopContext:
    return LoopContext(
        session_id="s1",
        repo_path=str(repo),
        allow_app_changes=allow_app_changes,
    )


def _response(status_code: int, payload: dict) -> httpx.Response:
    return httpx.Response(status_code, json=payload)


def _stub_post_upgrade(monkeypatch, *, response=None, exc=None, recorder=None) -> None:
    async def fake_post(project_folder: str) -> httpx.Response:
        if recorder is not None:
            recorder.append(project_folder)
        if exc is not None:
            raise exc
        return response

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool._post_upgrade", fake_post)


def _stub_git_status(monkeypatch, paths: list[str]) -> None:
    stdout = "".join(f" M {path}\n" for path in paths)

    def fake_run(args, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr="")

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool.subprocess.run", fake_run)


async def _run(tool: UpgradeAppToV9Tool, ctx: LoopContext):
    return await tool.run(tool.input_schema.model_validate({}), ctx)


class TestUpgradeAppToV9:
    async def test_success_marks_changed_and_verified(self, monkeypatch, tmp_path: Path):
        _stub_post_upgrade(
            monkeypatch,
            response=_response(
                200,
                {
                    "message": "upgrade completed",
                    "exitCode": 0,
                    "output": "",
                    "error": "",
                    "steps": [
                        {"name": "Project file", "messages": [{"text": "done", "status": "OK"}]}
                    ],
                },
            ),
        )
        _stub_git_status(monkeypatch, ["App/App.csproj", "App/ui/form/layouts/Side1.json"])

        ctx = _ctx(tmp_path)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "Upgraded the app to v9" in result.content
        expected = {"App/App.csproj", "App/ui/form/layouts/Side1.json"}
        assert ctx.extras["changed_files"] == expected
        assert ctx.extras["verified_files"] == expected

    async def test_manual_action_required_is_not_error_and_surfaces_todos(
        self, monkeypatch, tmp_path: Path
    ):
        _stub_post_upgrade(
            monkeypatch,
            response=_response(
                200,
                {
                    "message": "upgrade completed",
                    "exitCode": 3,
                    "output": "",
                    "error": "",
                    "steps": [
                        {
                            "name": "PDF service tasks",
                            "messages": [
                                {"text": "Review the process manually", "status": "TODO"}
                            ],
                        }
                    ],
                },
            ),
        )
        _stub_git_status(monkeypatch, ["App/config/process/process.bpmn"])

        ctx = _ctx(tmp_path)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "manual" in result.content.lower()
        assert "Review the process manually" in result.content
        assert ctx.extras["changed_files"] == {"App/config/process/process.bpmn"}

    async def test_unsupported_version_is_error_and_records_nothing(
        self, monkeypatch, tmp_path: Path
    ):
        _stub_post_upgrade(
            monkeypatch,
            response=_response(
                200,
                {
                    "message": "upgrade failed",
                    "exitCode": 2,
                    "output": "",
                    "error": "",
                    "steps": [],
                },
            ),
        )

        ctx = _ctx(tmp_path)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert "not on version 8" in result.content
        assert "changed_files" not in ctx.extras

    async def test_hard_error_is_error(self, monkeypatch, tmp_path: Path):
        _stub_post_upgrade(
            monkeypatch,
            response=_response(
                200,
                {
                    "message": "upgrade failed",
                    "exitCode": 1,
                    "output": "",
                    "error": "Error upgrading project file: boom",
                    "steps": [],
                },
            ),
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(tmp_path))

        assert result.is_error
        assert "boom" in result.content

    async def test_dirty_tree_non_200_is_error(self, monkeypatch, tmp_path: Path):
        _stub_post_upgrade(
            monkeypatch,
            response=_response(
                400, {"message": "The git repository has local changes."}
            ),
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(tmp_path))

        assert result.is_error
        assert "local changes" in result.content

    async def test_connection_error_is_error(self, monkeypatch, tmp_path: Path):
        _stub_post_upgrade(
            monkeypatch, exc=httpx.ConnectError("connection refused")
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(tmp_path))

        assert result.is_error
        assert "Could not reach the upgrade service" in result.content

    async def test_posts_repo_path_as_project_folder(self, monkeypatch, tmp_path: Path):
        recorder: list[str] = []
        _stub_post_upgrade(
            monkeypatch,
            response=_response(
                200,
                {"message": "", "exitCode": 0, "output": "", "error": "", "steps": []},
            ),
            recorder=recorder,
        )
        _stub_git_status(monkeypatch, [])

        ctx = _ctx(tmp_path)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert recorder == [str(tmp_path)]

    async def test_read_only_session_denies_with_escalation(self, tmp_path: Path):
        tool = UpgradeAppToV9Tool()
        result = await tool.check_permission(
            tool.input_schema.model_validate({}),
            _ctx(tmp_path, allow_app_changes=False),
        )
        assert result.allowed is False
        assert result.escalatable is True
