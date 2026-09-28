"""Tests for `upgrade_app_to_v9`.

The tool runs `studioctl app upgrade`; the `_run_studioctl_upgrade` seam and
the `git status` subprocess are monkeypatched so these run without studioctl
or a real repo.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
from collections.abc import Callable
from pathlib import Path

import pytest

from agents.core import LoopContext, UpgradeAppToV9Tool, VerifyChangesTool
from agents.core.tool import Tool
from agents.core.tools import upgrade_app_tool

from .git_repo import create_committed_repo, git, write_files

_SUCCESS_PAYLOAD = {"message": "", "exitCode": 0, "output": "", "error": "", "steps": []}
_EXIT_ERROR = 1
_V8_APP_FILES = {"App/App.csproj": "v8", "App/ui/layout-sets.json": "{}"}


@pytest.fixture(autouse=True)
def _fresh_upgrade_queue(monkeypatch):
    # asyncio.Lock binds to the event loop it first waits in, and each test gets a new loop.
    monkeypatch.setattr(upgrade_app_tool, "_upgrade_queue", upgrade_app_tool._UpgradeQueue())


def _ctx(repo: Path, *, allow_app_changes: bool = True, statuses: list[str] | None = None) -> LoopContext:
    ctx = LoopContext(
        session_id="s1",
        repo_path=str(repo),
        allow_app_changes=allow_app_changes,
    )
    if statuses is not None:
        ctx.report_status = statuses.append
    return ctx


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


def _stub_studioctl_blocked_until(monkeypatch, release: asyncio.Event, recorder: list[str]) -> None:
    async def fake_run(project_folder: str) -> subprocess.CompletedProcess[str]:
        recorder.append(project_folder)
        await release.wait()
        return _studioctl_result(_SUCCESS_PAYLOAD)

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool._run_studioctl_upgrade", fake_run)


async def _let_tasks_run() -> None:
    for _ in range(5):
        await asyncio.sleep(0)


def _stub_git_status(monkeypatch, paths: list[str]) -> None:
    stdout = "".join(f" M {path}\n" for path in paths)

    def fake_run(args, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr="")

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool.subprocess.run", fake_run)


def _stub_upgrade_that_edits_repo(monkeypatch, edit_repo: Callable[[], None], exit_code: int) -> None:
    async def fake_run(project_folder: str) -> subprocess.CompletedProcess[str]:
        edit_repo()
        return _studioctl_result({**_SUCCESS_PAYLOAD, "exitCode": exit_code})

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool._run_studioctl_upgrade", fake_run)


def _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo: Path) -> Callable[[], None]:
    """Mimics studioctl: change the app, then stage every change."""

    def upgrade() -> None:
        write_files(repo, {"App/App.csproj": "v9"})
        (repo / "App/ui/layout-sets.json").unlink()
        git(repo, "add", "-A")

    return upgrade


async def _run(tool: Tool, ctx: LoopContext):
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
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
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

        ctx = _ctx(repo)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert "not on version 8" in result.content
        assert "changed_files" not in ctx.extras

    async def test_hard_error_is_error(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
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

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "boom" in result.content

    async def test_success_records_deleted_files_as_changed(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )

        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/App.csproj", "App/ui/layout-sets.json"}

    async def test_verify_changes_passes_after_an_upgrade_that_deleted_files(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )
        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        verify_result = await _run(VerifyChangesTool(), ctx)

        assert not verify_result.is_error

    async def test_failed_upgrade_discards_its_partial_changes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)

        def fail_halfway() -> None:
            write_files(repo, {"App/App.csproj": "v9", "App/ui/Task_1/Settings.json": "{}"})

        _stub_upgrade_that_edits_repo(monkeypatch, fail_halfway, exit_code=_EXIT_ERROR)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "discarded" in result.content
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == "v8"
        assert not (repo / "App/ui/Task_1").exists()

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
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD), recorder=recorder)
        _stub_git_status(monkeypatch, [])

        ctx = _ctx(tmp_path)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert recorder == [str(tmp_path)]

    async def test_reports_no_queue_status_when_queue_is_empty(self, monkeypatch, tmp_path: Path):
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD))
        _stub_git_status(monkeypatch, [])
        statuses: list[str] = []

        await _run(UpgradeAppToV9Tool(), _ctx(tmp_path, statuses=statuses))

        assert statuses == []

    async def test_reports_queue_position_when_another_upgrade_is_running(self, monkeypatch, tmp_path: Path):
        release = asyncio.Event()
        _stub_studioctl_blocked_until(monkeypatch, release, recorder=[])
        _stub_git_status(monkeypatch, [])
        statuses: list[str] = []

        running = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(tmp_path)))
        await _let_tasks_run()
        queued = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(tmp_path, statuses=statuses)))
        await _let_tasks_run()

        assert statuses == ["Venter i kø (1 foran)"]

        release.set()
        await asyncio.gather(running, queued)

        assert statuses == ["Venter i kø (1 foran)", "Oppgraderer appen til v9"]

    async def test_waits_for_the_running_upgrade_before_starting(self, monkeypatch, tmp_path: Path):
        release = asyncio.Event()
        recorder: list[str] = []
        _stub_studioctl_blocked_until(monkeypatch, release, recorder)
        _stub_git_status(monkeypatch, [])
        first_repo = tmp_path / "first"
        second_repo = tmp_path / "second"

        first = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(first_repo)))
        await _let_tasks_run()
        second = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(second_repo)))
        await _let_tasks_run()

        assert recorder == [str(first_repo)]

        release.set()
        await asyncio.gather(first, second)

        assert recorder == [str(first_repo), str(second_repo)]

    async def test_read_only_session_denies_with_escalation(self, tmp_path: Path):
        tool = UpgradeAppToV9Tool()
        result = await tool.check_permission(
            tool.input_schema.model_validate({}),
            _ctx(tmp_path, allow_app_changes=False),
        )
        assert result.allowed is False
        assert result.escalatable is True
