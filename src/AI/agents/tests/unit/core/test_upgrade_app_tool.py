"""Tests for `upgrade_app_to_v9`.

The tool runs `studioctl app upgrade`; the `_run_studioctl_upgrade` seam is
monkeypatched so these run without studioctl.  The fakes change a real git repo
the way studioctl does.  With `--allow-dirty`, studioctl does not stage its
changes, so the fakes do not stage them either.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
from collections.abc import Callable
from pathlib import Path

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE, AppVersionProfile
from agents.core import LoopContext, UpgradeAppToV9Tool, VerifyChangesTool
from agents.core.tool import Tool
from agents.core.tools import upgrade_app_tool
from agents.core.tools.git_tool import UNFINISHED_UPGRADE_FIXES
from agents.core.tools.upgrade_app_tool import discard_unfinished_upgrade_fixes

from .git_repo import create_committed_repo, git, write_files

_SUCCESS_PAYLOAD = {"message": "", "exitCode": 0, "output": "", "error": "", "steps": []}
_EXIT_ERROR = 1
_EXIT_UNSUPPORTED_VERSION = 2
_EXIT_MANUAL_ACTION_REQUIRED = 3


def _project_file(altinn_app_api_version: str) -> str:
    return (
        "<Project><ItemGroup>"
        f'<PackageReference Include="Altinn.App.Api" Version="{altinn_app_api_version}" />'
        "</ItemGroup></Project>"
    )


_V8_PROJECT_FILE = _project_file("8.7.0")
_V9_PROJECT_FILE = _project_file("9.0.0-preview.4")
_V8_APP_FILES = {"App/App.csproj": _V8_PROJECT_FILE, "App/ui/layout-sets.json": "{}"}
_V9_APP_FILES = {"App/App.csproj": _V9_PROJECT_FILE, "App/ui/Settings.json": "{}"}
_UNCONVERTED_RULE_TODO = (
    "Layout set 'form', rule 'hideAddress', component 'address': the condition could not be converted."
)
_ROLLED_BACK_STEP = "Altinn.App packages set to 9.0.1"


def _ctx(
    repo: Path,
    *,
    allow_app_changes: bool = True,
    statuses: list[str] | None = None,
    app_version_profile: AppVersionProfile = V8_PROFILE,
) -> LoopContext:
    ctx = LoopContext(
        session_id="s1",
        repo_path=str(repo),
        allow_app_changes=allow_app_changes,
        app_version_profile=app_version_profile,
    )
    if statuses is not None:
        ctx.report_status = statuses.append
    return ctx


def _studioctl_result(result: dict) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], 0, stdout=json.dumps(result), stderr="")


def _studioctl_error(stderr: str) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], 1, stdout="", stderr=stderr)


def _stub_studioctl(
    monkeypatch,
    completed: subprocess.CompletedProcess[str],
    recorder: list[str] | None = None,
    edit_repo: Callable[[], None] | None = None,
) -> None:
    async def fake_run(project_folder: str) -> subprocess.CompletedProcess[str]:
        if recorder is not None:
            recorder.append(project_folder)
        if edit_repo is not None:
            edit_repo()
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


def _stub_upgrade_that_edits_repo(monkeypatch, edit_repo: Callable[[], None], exit_code: int) -> None:
    _stub_studioctl(monkeypatch, _studioctl_result({**_SUCCESS_PAYLOAD, "exitCode": exit_code}), edit_repo=edit_repo)


def _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo: Path) -> Callable[[], None]:
    def upgrade() -> None:
        write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE})
        (repo / "App/ui/layout-sets.json").unlink()

    return upgrade


def _upgrade_that_fails_halfway(repo: Path) -> Callable[[], None]:
    def upgrade() -> None:
        write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE, "App/ui/Task_1/Settings.json": "{}"})

    return upgrade


def _upgrade_that_fails_halfway_and_leaves_the_index_locked(repo: Path) -> Callable[[], None]:
    """A left-over index.lock makes `git reset` fail, so the rollback cannot run."""

    def upgrade() -> None:
        _upgrade_that_fails_halfway(repo)()
        (repo / ".git/index.lock").touch()

    return upgrade


def _upgrade_that_renames_the_layout_sets_file(repo: Path) -> Callable[[], None]:
    def upgrade() -> None:
        (repo / "App/ui/layout-sets.json").rename(repo / "App/ui/layout-sets.old.json")

    return upgrade


_CREATED_FILE_WITH_SPACE_AND_NORWEGIAN_LETTER = "App/ui/søknad/layouts/Side 1.json"


def _upgrade_that_creates_a_file_with_a_space_and_a_norwegian_letter(repo: Path) -> Callable[[], None]:
    def upgrade() -> None:
        write_files(repo, {_CREATED_FILE_WITH_SPACE_AND_NORWEGIAN_LETTER: "{}"})

    return upgrade


def _upgrade_that_fixes_a_v9_app(repo: Path) -> Callable[[], None]:
    """Mimics a newer studioctl finding something to fix in an app that an earlier version upgraded."""

    def upgrade() -> None:
        write_files(repo, {"App/ui/Settings.json": '{"hideCloseButton": true}'})

    return upgrade


_GENERATED_DATA_PROCESSOR = "App/logic/ConvertedLegacyRules/FormDataProcessor.cs"
_REVIEW_TODO = "// TODO: IMPORTANT - Review all generated code below!"
_REVIEW_TODO_DETAILS = "// You MUST carefully review each method."


def _upgrade_that_generates_a_data_processor(repo: Path) -> Callable[[], None]:
    """Mimics studioctl converting data processing rules to C#, which it marks with a TODO to review."""

    def upgrade() -> None:
        write_files(
            repo,
            {
                "App/App.csproj": _V9_PROJECT_FILE,
                "App/ui/Settings.json": "{}",
                _GENERATED_DATA_PROCESSOR: (
                    f"namespace Altinn.App.Logic;\n    {_REVIEW_TODO}\n    {_REVIEW_TODO_DETAILS}\n    var change = 1;\n"
                ),
            },
        )
        (repo / "App/ui/layout-sets.json").unlink()

    return upgrade


def _stub_held_back_upgrade(monkeypatch, repo: Path, *, stages_its_changes: bool = False) -> None:
    """Mimics studioctl holding back a layout set: the project file is on v9,
    but layout-sets.json stays, and a rule is reported as a TODO."""

    async def fake_run(project_folder: str) -> subprocess.CompletedProcess[str]:
        write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE, "App/ui/Task_1/Settings.json": "{}"})
        if stages_its_changes:
            git(repo, "add", "-A")
        return _studioctl_result(
            {
                **_SUCCESS_PAYLOAD,
                "exitCode": _EXIT_MANUAL_ACTION_REQUIRED,
                "steps": [
                    {
                        "name": "Project file",
                        "messages": [{"text": _ROLLED_BACK_STEP, "status": "OK"}],
                    },
                    {
                        "name": "Layout files",
                        "messages": [{"text": _UNCONVERTED_RULE_TODO, "status": "TODO"}],
                    },
                ],
            }
        )

    monkeypatch.setattr("agents.core.tools.upgrade_app_tool._run_studioctl_upgrade", fake_run)


async def _run(tool: Tool, ctx: LoopContext):
    return await tool.run(tool.input_schema.model_validate({}), ctx)


class TestUpgradeAppToV9:
    async def test_success_marks_changed_and_verified(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )

        ctx = _ctx(repo)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "Upgraded the app to v9" in result.content
        expected = {"App/App.csproj", "App/ui/layout-sets.json"}
        assert ctx.extras["changed_files"] == expected
        assert ctx.extras["verified_files"] == expected

    async def test_manual_action_required_is_not_error_and_surfaces_todos(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
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
            edit_repo=_upgrade_that_bumps_csproj_and_deletes_layout_sets(repo),
        )

        ctx = _ctx(repo)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "manual" in result.content.lower()
        assert "Review the process manually" in result.content
        assert ctx.extras["changed_files"] == {"App/App.csproj", "App/ui/layout-sets.json"}

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
        assert "not on version 8 or 9" in result.content
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

        async def passing_build(repo_path: str) -> subprocess.CompletedProcess[str]:
            return subprocess.CompletedProcess([], 0, "", "")

        monkeypatch.setattr("agents.core.tools.verify_tool._run_dotnet_build", passing_build)
        verify_result = await _run(VerifyChangesTool(), ctx)

        assert not verify_result.is_error

    async def test_success_records_a_renamed_file_by_its_new_path(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_renames_the_layout_sets_file(repo), exit_code=0)

        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/ui/layout-sets.old.json"}

    async def test_success_records_a_created_file_with_a_space_and_a_norwegian_letter_in_its_path(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_creates_a_file_with_a_space_and_a_norwegian_letter(repo), exit_code=0
        )

        ctx = _ctx(repo, app_version_profile=V9_PROFILE)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert _CREATED_FILE_WITH_SPACE_AND_NORWEGIAN_LETTER in ctx.extras["changed_files"]

    async def test_success_returns_each_todo_comment_in_the_created_files_with_its_location(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_generates_a_data_processor(repo), exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        todo_section = (
            "The upgrade created files with these TODOs:\n\n"
            f"{_GENERATED_DATA_PROCESSOR}:2:\n{_REVIEW_TODO}\n{_REVIEW_TODO_DETAILS}\n\n"
        )
        assert todo_section in result.content

    async def test_success_leaves_out_the_todo_section_when_no_created_file_has_todos(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "The upgrade created files with these TODOs" not in result.content

    async def test_failed_upgrade_discards_its_partial_changes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_fails_halfway(repo), exit_code=_EXIT_ERROR)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "discarded" in result.content
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()

    async def test_raises_when_the_rollback_fails_so_the_model_is_not_told_the_changes_were_discarded(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_fails_halfway_and_leaves_the_index_locked(repo), exit_code=_EXIT_ERROR
        )

        with pytest.raises(subprocess.CalledProcessError):
            await _run(UpgradeAppToV9Tool(), _ctx(repo))

    async def test_success_switches_the_loop_context_to_the_v9_profile(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V9_PROFILE

    async def test_success_returns_the_v9_rules_to_the_model(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "The app is now v9." in result.content
        assert V9_PROFILE.ui_anatomy_prompt in result.content
        assert V9_PROFILE.version_rules_prompt in result.content

    async def test_manual_follow_up_switches_the_loop_context_to_the_v9_profile(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch,
            _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo),
            exit_code=_EXIT_MANUAL_ACTION_REQUIRED,
        )
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V9_PROFILE

    async def test_refused_upgrade_keeps_the_v8_profile(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(monkeypatch, _studioctl_result({**_SUCCESS_PAYLOAD, "exitCode": _EXIT_UNSUPPORTED_VERSION}))
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V8_PROFILE

    async def test_rerun_on_a_v9_app_says_the_app_was_already_on_v9(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_fixes_a_v9_app(repo), exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo, app_version_profile=V9_PROFILE))

        assert not result.is_error
        assert "The app was already on v9." in result.content

    async def test_rerun_on_a_v9_app_marks_the_fixed_files_changed_and_verified(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_fixes_a_v9_app(repo), exit_code=0)
        ctx = _ctx(repo, app_version_profile=V9_PROFILE)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/ui/Settings.json"}
        assert ctx.extras["verified_files"] == {"App/ui/Settings.json"}

    async def test_rerun_on_a_v9_app_leaves_out_the_v9_rules_the_system_prompt_already_has(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_fixes_a_v9_app(repo), exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo, app_version_profile=V9_PROFILE))

        assert V9_PROFILE.ui_anatomy_prompt not in result.content

    async def test_rerun_that_changes_nothing_says_the_app_is_up_to_date_and_records_nothing(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD))
        ctx = _ctx(repo, app_version_profile=V9_PROFILE)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "up to date with this version of the upgrade" in result.content
        assert "changed_files" not in ctx.extras

    async def test_held_back_upgrade_discards_its_changes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(monkeypatch, repo)
        ctx = _ctx(repo)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()
        assert "changed_files" not in ctx.extras

    async def test_held_back_upgrade_keeps_the_v8_profile(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(monkeypatch, repo)
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V8_PROFILE

    async def test_held_back_upgrade_says_nothing_changed_and_lists_the_blocking_todos(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(monkeypatch, repo)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "the upgrade changed nothing" in result.content
        assert _UNCONVERTED_RULE_TODO in result.content

    async def test_held_back_upgrade_leaves_out_the_steps_it_rolled_back(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(monkeypatch, repo)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert _ROLLED_BACK_STEP not in result.content

    async def test_held_back_upgrade_points_to_the_legacy_rules_that_are_still_in_the_app(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(monkeypatch, repo)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "still in RuleConfiguration.json and RuleHandler.js" in result.content

    async def test_passes_on_the_studioctl_error_when_studioctl_cannot_finish_the_upgrade(
        self, monkeypatch, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(monkeypatch, _studioctl_error("upgrade app: context deadline exceeded"))

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "context deadline exceeded" in result.content

    async def test_discards_partial_changes_when_studioctl_cannot_finish_the_upgrade(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(
            monkeypatch,
            _studioctl_error("upgrade app: context deadline exceeded"),
            edit_repo=_upgrade_that_fails_halfway(repo),
        )

        await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()

    async def test_refuses_to_upgrade_a_working_tree_with_uncommitted_changes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        write_files(repo, {"App/App.csproj": "<Project />"})
        recorder: list[str] = []
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD), recorder=recorder)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "App/App.csproj" in result.content
        assert recorder == []

    async def test_upgrades_the_session_repo(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        recorder: list[str] = []
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD), recorder=recorder)

        await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert recorder == [str(repo)]

    async def test_reports_no_queue_status_when_queue_is_empty(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD))
        statuses: list[str] = []

        await _run(UpgradeAppToV9Tool(), _ctx(repo, statuses=statuses))

        assert statuses == []

    async def test_reports_queue_position_when_another_upgrade_is_running(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        release = asyncio.Event()
        _stub_studioctl_blocked_until(monkeypatch, release, recorder=[])
        statuses: list[str] = []

        running = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(repo)))
        await _let_tasks_run()
        queued = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(repo, statuses=statuses)))
        await _let_tasks_run()

        assert statuses == ["Står i kø for oppgradering (1 foran)"]

        release.set()
        await asyncio.gather(running, queued)

        assert statuses == ["Står i kø for oppgradering (1 foran)", "Oppgraderer appen til v9"]

    async def test_waits_for_the_running_upgrade_before_starting(self, monkeypatch, tmp_path: Path):
        release = asyncio.Event()
        recorder: list[str] = []
        _stub_studioctl_blocked_until(monkeypatch, release, recorder)
        first_repo = create_committed_repo(tmp_path / "first", _V9_APP_FILES)
        second_repo = create_committed_repo(tmp_path / "second", _V9_APP_FILES)

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


_RULE_CONFIGURATION = "App/ui/form/RuleConfiguration.json"
_FIXED_RULE_CONFIGURATION = '{"data": {"conditionalRendering": {}}}'
_NEW_DATA_PROCESSOR = "App/logic/Rules/SumProcessor.cs"
_HELD_BACK_V8_APP_FILES = {
    **_V8_APP_FILES,
    _RULE_CONFIGURATION: '{"data": {"conditionalRendering": {"hideAddress": {}}}}',
}


def _make_fix(repo: Path, ctx: LoopContext, files: dict[str, str], *, verified: bool = True) -> None:
    """The model changes files to unblock the upgrade, as `edit_file` and `verify_changes` record them."""
    write_files(repo, files)
    ctx.extras.setdefault("changed_files", set()).update(files)
    if verified:
        ctx.extras.setdefault("verified_files", set()).update(files)


def _staged_paths(repo: Path) -> set[str]:
    completed = subprocess.run(
        ["git", "diff", "--cached", "--name-only"], cwd=repo, check=True, capture_output=True, text=True
    )
    return set(completed.stdout.split())


class TestFixesForAHeldBackUpgrade:
    async def test_the_upgrade_runs_on_top_of_verified_fixes_from_this_turn(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION, _NEW_DATA_PROCESSOR: "class Sum {}"})
        recorder: list[str] = []
        _stub_studioctl(
            monkeypatch,
            _studioctl_result(_SUCCESS_PAYLOAD),
            recorder=recorder,
            edit_repo=_upgrade_that_bumps_csproj_and_deletes_layout_sets(repo),
        )

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert recorder == [str(repo)]
        assert _staged_paths(repo) == {
            "App/App.csproj",
            "App/ui/layout-sets.json",
            _RULE_CONFIGURATION,
            _NEW_DATA_PROCESSOR,
        }

    async def test_a_fix_that_is_not_verified_stops_the_upgrade(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION}, verified=False)
        recorder: list[str] = []
        _stub_studioctl(monkeypatch, _studioctl_result(_SUCCESS_PAYLOAD), recorder=recorder)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert "verify_changes" in result.content
        assert _RULE_CONFIGURATION in result.content
        assert recorder == []

    async def test_a_held_back_upgrade_keeps_the_fixes_and_discards_its_own_changes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION, _NEW_DATA_PROCESSOR: "class Sum {}"})
        _stub_held_back_upgrade(monkeypatch, repo)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()
        assert (repo / _RULE_CONFIGURATION).read_text(encoding="utf-8") == _FIXED_RULE_CONFIGURATION
        assert (repo / _NEW_DATA_PROCESSOR).exists()
        assert ctx.extras[UNFINISHED_UPGRADE_FIXES] is True
        assert "Your changes from this turn are kept" in result.content

    async def test_a_held_back_upgrade_that_staged_its_changes_is_discarded_too(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION})
        _stub_held_back_upgrade(monkeypatch, repo, stages_its_changes=True)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()
        assert (repo / _RULE_CONFIGURATION).read_text(encoding="utf-8") == _FIXED_RULE_CONFIGURATION

    async def test_a_failed_upgrade_keeps_the_fixes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION})
        _stub_upgrade_that_edits_repo(monkeypatch, _upgrade_that_fails_halfway(repo), exit_code=_EXIT_ERROR)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert (repo / _RULE_CONFIGURATION).read_text(encoding="utf-8") == _FIXED_RULE_CONFIGURATION
        assert ctx.extras[UNFINISHED_UPGRADE_FIXES] is True

    async def test_a_held_back_upgrade_with_no_fixes_asks_for_an_offer(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _stub_held_back_upgrade(monkeypatch, repo)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert "skill(altinn-upgrade)" in result.content
        assert UNFINISHED_UPGRADE_FIXES not in ctx.extras

    async def test_a_completed_upgrade_clears_the_unfinished_fixes(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION})
        ctx.extras[UNFINISHED_UPGRADE_FIXES] = True
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )

        await _run(UpgradeAppToV9Tool(), ctx)

        assert UNFINISHED_UPGRADE_FIXES not in ctx.extras

    async def test_a_completed_upgrade_with_todos_asks_for_an_offer(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch,
            _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo),
            exit_code=_EXIT_MANUAL_ACTION_REQUIRED,
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "skill(altinn-upgrade)" in result.content

    async def test_a_rerun_that_changes_nothing_but_has_todos_asks_for_an_offer(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_studioctl(monkeypatch, _studioctl_result({**_SUCCESS_PAYLOAD, "exitCode": _EXIT_MANUAL_ACTION_REQUIRED}))

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo, app_version_profile=V9_PROFILE))

        assert "up to date" in result.content
        assert "skill(altinn-upgrade)" in result.content

    async def test_a_completed_upgrade_without_todos_makes_no_offer(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            monkeypatch, _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo), exit_code=0
        )

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "skill(altinn-upgrade)" not in result.content


class TestTheStudioctlCommand:
    async def test_studioctl_runs_on_a_working_tree_with_changes(self, monkeypatch):
        commands: list[tuple[str, ...]] = []

        class _FinishedProcess:
            async def communicate(self):
                return b"{}", b""

            async def wait(self):
                return 0

        async def fake_exec(*command, **kwargs):
            commands.append(command)
            return _FinishedProcess()

        monkeypatch.setattr(upgrade_app_tool.asyncio, "create_subprocess_exec", fake_exec)

        await upgrade_app_tool._run_studioctl_upgrade("/repo")

        assert "--allow-dirty" in commands[0]


class TestDiscardUnfinishedUpgradeFixes:
    def test_puts_back_the_tree_of_head(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION, _NEW_DATA_PROCESSOR: "class Sum {}"})
        ctx.extras[UNFINISHED_UPGRADE_FIXES] = True

        assert discard_unfinished_upgrade_fixes(ctx) is True

        assert (repo / _RULE_CONFIGURATION).read_text(encoding="utf-8") == _HELD_BACK_V8_APP_FILES[_RULE_CONFIGURATION]
        assert not (repo / _NEW_DATA_PROCESSOR).exists()
        assert ctx.extras["changed_files"] == set()
        assert UNFINISHED_UPGRADE_FIXES not in ctx.extras

    def test_keeps_changes_that_are_not_unfinished_fixes(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _HELD_BACK_V8_APP_FILES)
        ctx = _ctx(repo)
        _make_fix(repo, ctx, {_RULE_CONFIGURATION: _FIXED_RULE_CONFIGURATION})

        assert discard_unfinished_upgrade_fixes(ctx) is False

        assert (repo / _RULE_CONFIGURATION).read_text(encoding="utf-8") == _FIXED_RULE_CONFIGURATION
