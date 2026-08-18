"""Tests for `upgrade_app_to_v9`.

The tool runs `studioctl app upgrade`; the `_run_studioctl_upgrade` seam and
the `git status` subprocess are monkeypatched so these run without studioctl
or a real repo.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from agents.core import LoopContext, UpgradeAppToV9Tool


def _ctx(repo: Path, *, allow_app_changes: bool = True) -> LoopContext:
    return LoopContext(
        session_id="s1",
        repo_path=str(repo),
        allow_app_changes=allow_app_changes,
    )


def _studioctl_result(result: dict) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], 0, stdout=json.dumps(result), stderr="")


def _studioctl_error(stderr: str) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], 1, stdout="", stderr=stderr)


def _stub_studioctl(monkeypatch, completed: subprocess.CompletedProcess[str], recorder=None) -> None:
    async def fake_run(project_folder: str) -> subprocess.CompletedProcess[str]:
        if recorder is not None:
            recorder.append(project_folder)
        return completed

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool._run_studioctl_upgrade", fake_run)


def _stub_git_status(monkeypatch, paths: list[str]) -> None:
    stdout = "".join(f" M {path}\n" for path in paths)

    def fake_run(args, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr="")

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool.subprocess.run", fake_run)


async def _run(tool: UpgradeAppToV9Tool, ctx: LoopContext):
    return await tool.run(tool.input_schema.model_validate({}), ctx)


class TestUpgradeAppToV9:
    async def test_success_marks_changed_and_verified(self, monkeypatch, tmp_path: Path):
        _stub_studioctl(
            monkeypatch,
            _studioctl_result(
                {
                    "message": "upgrade completed",
                    "exitCode": 0,
                    "output": "",
                    "error": "",
                    "steps": [{"name": "Project file", "messages": [{"text": "done", "status": "OK"}]}],
                }
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

    async def test_manual_action_required_is_not_error_and_surfaces_todos(self, monkeypatch, tmp_path: Path):
        _stub_studioctl(
            monkeypatch,
            _studioctl_result(
                {
                    "message": "upgrade completed",
                    "exitCode": 3,
                    "output": "",
                    "error": "",
                    "steps": [
                        {
                            "name": "PDF service tasks",
                            "messages": [{"text": "Review the process manually", "status": "TODO"}],
                        }
                    ],
                }
            ),
        )
        _stub_git_status(monkeypatch, ["App/config/process/process.bpmn"])

        ctx = _ctx(tmp_path)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "manual" in result.content.lower()
        assert "Review the process manually" in result.content
        assert ctx.extras["changed_files"] == {"App/config/process/process.bpmn"}

    async def test_unsupported_version_is_error_and_records_nothing(self, monkeypatch, tmp_path: Path):
        _stub_studioctl(
            monkeypatch,
            _studioctl_result(
                {
                    "message": "upgrade failed",
                    "exitCode": 2,
                    "output": "",
                    "error": "",
                    "steps": [],
                }
            ),
        )

        ctx = _ctx(tmp_path)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert "not on version 8" in result.content
        assert "changed_files" not in ctx.extras

    async def test_hard_error_is_error(self, monkeypatch, tmp_path: Path):
        _stub_studioctl(
            monkeypatch,
            _studioctl_result(
                {
                    "message": "upgrade failed",
                    "exitCode": 1,
                    "output": "",
                    "error": "Error upgrading project file: boom",
                    "steps": [],
                }
            ),
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(tmp_path))

        assert result.is_error
        assert "boom" in result.content

    async def test_passes_on_the_studioctl_error_when_studioctl_cannot_run_the_upgrade(
        self, monkeypatch, tmp_path: Path
    ):
        _stub_studioctl(
            monkeypatch,
            _studioctl_error(
                "upgrade app: unexpected studioctl-server upgrade response: 400 Bad Request: "
                "The git repository has local changes."
            ),
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(tmp_path))

        assert result.is_error
        assert "The git repository has local changes." in result.content

    async def test_upgrades_the_session_repo(self, monkeypatch, tmp_path: Path):
        recorder: list[str] = []
        _stub_studioctl(
            monkeypatch,
            _studioctl_result({"message": "", "exitCode": 0, "output": "", "error": "", "steps": []}),
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
