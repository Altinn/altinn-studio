"""Tests for `upgrade_app_to_v9`.

The tool sends the session repo to the assistant runner, which runs `studioctl app upgrade`
on a copy.  `_FakeRunner` does the work of the runner, so these tests run without
studioctl.  The fake upgrades change the copy, a real git repo, the way studioctl does.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import tempfile
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE, AppVersionProfile
from agents.core import LoopContext, UpgradeAppToV9Tool, VerifyChangesTool
from agents.core import runner as runner_module
from agents.core.runner import RunnerProgress, RunnerUnavailable, RunResult, list_app_files
from agents.core.tool import Tool
from agents.core.tools import upgrade_app_tool

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


_FakeUpgrade = Callable[[Path], Awaitable[subprocess.CompletedProcess[bytes]]]


@dataclass
class _FakeRunner:
    """Does what the assistant runner does: it copies the app files into a new folder, commits them, runs the
    upgrade there, and returns the result and the changes as a patch.  `studioctl` stands in for studioctl, and
    raises TimeoutError for an upgrade that does not finish in time."""

    jobs_folder: Path
    studioctl: _FakeUpgrade
    hostile_patch: bytes | None = None
    unavailable: RunnerUnavailable | None = None
    waits: bool = False
    app_paths: list[Path] = field(default_factory=list)

    async def upgrade(self, repo_path: str, report_progress: Callable[[RunnerProgress], None]) -> RunResult:
        if self.unavailable is not None:
            raise self.unavailable
        if self.waits:
            report_progress(RunnerProgress.WAITING)
        report_progress(RunnerProgress.RUNNING)
        app = self._copy_app(Path(repo_path))
        try:
            completed = await self.studioctl(app)
        except TimeoutError:
            return RunResult(exit_code=None, stdout="", stderr="")

        git(app, "add", "-A")
        patch = self.hostile_patch if self.hostile_patch is not None else _staged_changes_as_patch(app)
        return RunResult(completed.returncode, completed.stdout.decode(), completed.stderr.decode(), patch)

    def _copy_app(self, repo: Path) -> Path:
        app = Path(tempfile.mkdtemp(dir=self.jobs_folder))
        for path in list_app_files(str(repo)):
            (app / path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repo / path, app / path, follow_symlinks=False)
        create_committed_repo(app, {})
        self.app_paths.append(app)
        return app


def _staged_changes_as_patch(repo: Path) -> bytes:
    return subprocess.run(["git", "diff", "--cached", "--binary"], cwd=repo, check=True, capture_output=True).stdout


@pytest.fixture(autouse=True)
def runner(monkeypatch, tmp_path_factory: pytest.TempPathFactory) -> _FakeRunner:
    """The runner jobs are not below `tmp_path`, because many tests make the repo in `tmp_path` itself."""
    fake = _FakeRunner(tmp_path_factory.mktemp("runner"), _upgrade_with(_studioctl_result(_SUCCESS_PAYLOAD)))
    monkeypatch.setattr(runner_module, "create_runner", lambda: fake)
    return fake


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


def _studioctl_result(result: dict) -> subprocess.CompletedProcess[bytes]:
    return subprocess.CompletedProcess([], 0, stdout=json.dumps(result).encode(), stderr=b"")


def _studioctl_error(stderr: str) -> subprocess.CompletedProcess[bytes]:
    return subprocess.CompletedProcess([], 1, stdout=b"", stderr=stderr.encode())


def _upgrade_with(
    completed: subprocess.CompletedProcess[bytes],
    recorder: list[Path] | None = None,
    edit_repo: Callable[[Path], None] | None = None,
) -> _FakeUpgrade:
    """`edit_repo` gets the copy of the session repo that studioctl upgrades."""

    async def fake_upgrade(app: Path) -> subprocess.CompletedProcess[bytes]:
        if recorder is not None:
            recorder.append(app)
        if edit_repo is not None:
            edit_repo(app)
        return completed

    return fake_upgrade


def _stub_studioctl(
    runner: _FakeRunner,
    completed: subprocess.CompletedProcess[bytes],
    recorder: list[Path] | None = None,
    edit_repo: Callable[[Path], None] | None = None,
) -> None:
    runner.studioctl = _upgrade_with(completed, recorder, edit_repo)


def _stub_studioctl_blocked_until(runner: _FakeRunner, release: asyncio.Event, recorder: list[Path]) -> None:
    async def fake_upgrade(app: Path) -> subprocess.CompletedProcess[bytes]:
        recorder.append(app)
        await release.wait()
        return _studioctl_result(_SUCCESS_PAYLOAD)

    runner.studioctl = fake_upgrade


async def _let_tasks_run() -> None:
    for _ in range(5):
        await asyncio.sleep(0)


def _stub_upgrade_that_edits_repo(runner: _FakeRunner, edit_repo: Callable[[Path], None], exit_code: int) -> None:
    _stub_studioctl(runner, _studioctl_result({**_SUCCESS_PAYLOAD, "exitCode": exit_code}), edit_repo=edit_repo)


def _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo: Path) -> None:
    """Mimics studioctl: change the app, then stage every change."""
    write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE})
    (repo / "App/ui/layout-sets.json").unlink()
    git(repo, "add", "-A")


def _upgrade_that_bumps_csproj_and_stages_nothing(repo: Path) -> None:
    write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE, "App/ui/Settings.json": '{"hideCloseButton": true}'})
    (repo / "App/ui/layout-sets.json").unlink()


def _upgrade_that_fails_halfway(repo: Path) -> None:
    write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE, "App/ui/Task_1/Settings.json": "{}"})


def _upgrade_that_renames_the_layout_sets_file(repo: Path) -> None:
    git(repo, "mv", "App/ui/layout-sets.json", "App/ui/layout-sets.old.json")


_CREATED_FILE_WITH_SPACE_AND_NORWEGIAN_LETTER = "App/ui/søknad/layouts/Side 1.json"


def _upgrade_that_creates_a_file_with_a_space_and_a_norwegian_letter(repo: Path) -> None:
    write_files(repo, {_CREATED_FILE_WITH_SPACE_AND_NORWEGIAN_LETTER: "{}"})
    git(repo, "add", "-A")


def _upgrade_that_fixes_a_v9_app(repo: Path) -> None:
    """Mimics a newer studioctl finding something to fix in an app that an earlier version upgraded."""
    write_files(repo, {"App/ui/Settings.json": '{"hideCloseButton": true}'})
    git(repo, "add", "-A")


_GENERATED_DATA_PROCESSOR = "App/logic/ConvertedLegacyRules/FormDataProcessor.cs"
_REVIEW_TODO = "// TODO: IMPORTANT - Review all generated code below!"
_REVIEW_TODO_DETAILS = "// You MUST carefully review each method."


def _upgrade_that_generates_a_data_processor(repo: Path) -> None:
    """Mimics studioctl converting data processing rules to C#, which it marks with a TODO to review."""
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
    git(repo, "add", "-A")


_TODO_IN_OTHER_SESSION = "// TODO: secret of another session"


def _upgrade_that_links_to_a_file_of_another_session(other_session_file: Path) -> Callable[[Path], None]:
    def upgrade(repo: Path) -> None:
        write_files(repo, {"App/App.csproj": _V9_PROJECT_FILE})
        (repo / "App/ui/layout-sets.json").unlink()
        (repo / "App/logic").mkdir(parents=True)
        (repo / "App/logic/Notes.cs").symlink_to(other_session_file)
        git(repo, "add", "-A")

    return upgrade


def _upgrade_that_adds_a_submodule(repo: Path) -> None:
    _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo)
    (repo / "App/vendor").mkdir()
    git(repo, "update-index", "--add", "--cacheinfo", f"160000,{'1' * 40},App/vendor")


def _upgrade_that_adds_a_file(path: str) -> Callable[[Path], None]:
    def upgrade(repo: Path) -> None:
        _upgrade_that_bumps_csproj_and_deletes_layout_sets(repo)
        write_files(repo, {path: "on: push\n"})
        git(repo, "add", "-A")

    return upgrade


def _stub_held_back_upgrade(runner: _FakeRunner) -> None:
    """Mimics studioctl holding back a layout set: the project file is on v9,
    but layout-sets.json stays, and a rule is reported as a TODO."""

    async def fake_upgrade(app: Path) -> subprocess.CompletedProcess[bytes]:
        write_files(app, {"App/App.csproj": _V9_PROJECT_FILE, "App/ui/Task_1/Settings.json": "{}"})
        git(app, "add", "-A")
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

    runner.studioctl = fake_upgrade


def _lock_the_index_and_hold_back(repo_path: str) -> bool:
    """A left-over index.lock makes `git reset` fail, so the rollback of the held-back upgrade cannot run."""
    (Path(repo_path) / ".git/index.lock").touch()
    return True


_PATCH_INTO_THE_GIT_FOLDER = b"""diff --git a/.git/hooks/post-commit b/.git/hooks/post-commit
new file mode 100755
--- /dev/null
+++ b/.git/hooks/post-commit
@@ -0,0 +1 @@
+touch /tmp/runs-as-root
"""
_PATCH_OUT_OF_THE_REPO = b"""diff --git a/../outside.txt b/../outside.txt
new file mode 100644
--- /dev/null
+++ b/../outside.txt
@@ -0,0 +1 @@
+outside
"""
_PATCH_BEHIND_A_SYMBOLIC_LINK = b"""diff --git a/App/link b/App/link
new file mode 120000
--- /dev/null
+++ b/App/link
@@ -0,0 +1 @@
+/tmp
\\ No newline at end of file
diff --git a/App/link/escaped.txt b/App/link/escaped.txt
new file mode 100644
--- /dev/null
+++ b/App/link/escaped.txt
@@ -0,0 +1 @@
+escaped
"""


def _staged_changes(repo: Path) -> list[str]:
    output = subprocess.run(
        ["git", "diff", "--cached", "--name-status", "--no-renames"],
        cwd=repo,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return output.splitlines()


def _git_status(repo: Path) -> str:
    return subprocess.run(["git", "status", "--porcelain"], cwd=repo, check=True, capture_output=True, text=True).stdout


async def _run(tool: Tool, ctx: LoopContext):
    return await tool.run(tool.input_schema.model_validate({}), ctx)


class TestUpgradeAppToV9:
    async def test_success_marks_changed_and_verified(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)

        ctx = _ctx(repo)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "Upgraded the app to v9" in result.content
        expected = {"App/App.csproj", "App/ui/layout-sets.json"}
        assert ctx.extras["changed_files"] == expected
        assert ctx.extras["verified_files"] == expected

    async def test_manual_action_required_is_not_error_and_surfaces_todos(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(
            runner,
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
            edit_repo=_upgrade_that_bumps_csproj_and_deletes_layout_sets,
        )

        ctx = _ctx(repo)
        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "manual" in result.content.lower()
        assert "Review the process manually" in result.content
        assert ctx.extras["changed_files"] == {"App/App.csproj", "App/ui/layout-sets.json"}

    async def test_unsupported_version_is_error_and_records_nothing(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(
            runner,
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

    async def test_hard_error_is_error(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(
            runner,
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

    async def test_success_records_deleted_files_as_changed(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)

        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/App.csproj", "App/ui/layout-sets.json"}

    async def test_verify_changes_passes_after_an_upgrade_that_deleted_files(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)
        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        verify_result = await _run(VerifyChangesTool(), ctx)

        assert not verify_result.is_error

    async def test_success_records_a_renamed_file_by_its_new_path(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_renames_the_layout_sets_file, exit_code=0)

        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/ui/layout-sets.old.json"}

    async def test_success_records_a_created_file_with_a_space_and_a_norwegian_letter_in_its_path(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(
            runner, _upgrade_that_creates_a_file_with_a_space_and_a_norwegian_letter, exit_code=0
        )

        ctx = _ctx(repo, app_version_profile=V9_PROFILE)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert _CREATED_FILE_WITH_SPACE_AND_NORWEGIAN_LETTER in ctx.extras["changed_files"]

    async def test_success_returns_each_todo_comment_in_the_created_files_with_its_location(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_generates_a_data_processor, exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        todo_section = (
            "The upgrade created files with these TODOs:\n\n"
            f"{_GENERATED_DATA_PROCESSOR}:2:\n{_REVIEW_TODO}\n{_REVIEW_TODO_DETAILS}\n\n"
        )
        assert todo_section in result.content

    async def test_success_leaves_out_the_todo_section_when_no_created_file_has_todos(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "The upgrade created files with these TODOs" not in result.content

    async def test_failed_upgrade_discards_its_partial_changes(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_fails_halfway, exit_code=_EXIT_ERROR)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "discarded" in result.content
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()

    async def test_raises_when_the_rollback_fails_so_the_model_is_not_told_the_changes_were_discarded(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(runner)
        monkeypatch.setattr(upgrade_app_tool, "_held_back_layout_sets", _lock_the_index_and_hold_back)

        with pytest.raises(subprocess.CalledProcessError):
            await _run(UpgradeAppToV9Tool(), _ctx(repo))

    async def test_success_switches_the_loop_context_to_the_v9_profile(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V9_PROFILE

    async def test_success_returns_the_v9_rules_to_the_model(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "The app is now v9." in result.content
        assert V9_PROFILE.ui_anatomy_prompt in result.content
        assert V9_PROFILE.version_rules_prompt in result.content

    async def test_manual_follow_up_switches_the_loop_context_to_the_v9_profile(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            runner,
            _upgrade_that_bumps_csproj_and_deletes_layout_sets,
            exit_code=_EXIT_MANUAL_ACTION_REQUIRED,
        )
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V9_PROFILE

    async def test_refused_upgrade_keeps_the_v8_profile(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(runner, _studioctl_result({**_SUCCESS_PAYLOAD, "exitCode": _EXIT_UNSUPPORTED_VERSION}))
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V8_PROFILE

    async def test_rerun_on_a_v9_app_says_the_app_was_already_on_v9(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_fixes_a_v9_app, exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo, app_version_profile=V9_PROFILE))

        assert not result.is_error
        assert "The app was already on v9." in result.content

    async def test_rerun_on_a_v9_app_marks_the_fixed_files_changed_and_verified(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_fixes_a_v9_app, exit_code=0)
        ctx = _ctx(repo, app_version_profile=V9_PROFILE)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/ui/Settings.json"}
        assert ctx.extras["verified_files"] == {"App/ui/Settings.json"}

    async def test_rerun_on_a_v9_app_leaves_out_the_v9_rules_the_system_prompt_already_has(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_fixes_a_v9_app, exit_code=0)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo, app_version_profile=V9_PROFILE))

        assert V9_PROFILE.ui_anatomy_prompt not in result.content

    async def test_rerun_that_changes_nothing_says_the_app_is_up_to_date_and_records_nothing(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_studioctl(runner, _studioctl_result(_SUCCESS_PAYLOAD))
        ctx = _ctx(repo, app_version_profile=V9_PROFILE)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert "up to date with this version of the upgrade" in result.content
        assert "changed_files" not in ctx.extras

    async def test_held_back_upgrade_discards_its_changes(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(runner)
        ctx = _ctx(repo)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()
        assert "changed_files" not in ctx.extras

    async def test_held_back_upgrade_keeps_the_v8_profile(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(runner)
        ctx = _ctx(repo)

        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.app_version_profile is V8_PROFILE

    async def test_held_back_upgrade_says_nothing_changed_and_lists_the_blocking_todos(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(runner)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "nothing was changed" in result.content
        assert _UNCONVERTED_RULE_TODO in result.content

    async def test_held_back_upgrade_leaves_out_the_steps_it_rolled_back(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(runner)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert _ROLLED_BACK_STEP not in result.content

    async def test_held_back_upgrade_points_to_the_legacy_rules_that_are_still_in_the_app(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_held_back_upgrade(runner)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert "still in RuleConfiguration.json and RuleHandler.js" in result.content

    async def test_passes_on_the_studioctl_error_when_studioctl_cannot_finish_the_upgrade(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(runner, _studioctl_error("upgrade app: context deadline exceeded"))

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "context deadline exceeded" in result.content

    async def test_discards_partial_changes_when_studioctl_cannot_finish_the_upgrade(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_studioctl(
            runner,
            _studioctl_error("upgrade app: context deadline exceeded"),
            edit_repo=_upgrade_that_fails_halfway,
        )

        await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert not (repo / "App/ui/Task_1").exists()

    async def test_refuses_to_upgrade_a_working_tree_with_uncommitted_changes(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        write_files(repo, {"App/App.csproj": "<Project />"})
        recorder: list[Path] = []
        _stub_studioctl(runner, _studioctl_result(_SUCCESS_PAYLOAD), recorder=recorder)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "App/App.csproj" in result.content
        assert recorder == []

    async def test_upgrades_a_copy_of_the_session_repo(self, monkeypatch, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        copied_project_files: list[str] = []

        def read_project_file(copy: Path) -> None:
            copied_project_files.append((copy / "App/App.csproj").read_text(encoding="utf-8"))

        recorder: list[Path] = []
        _stub_studioctl(runner, _studioctl_result(_SUCCESS_PAYLOAD), recorder=recorder, edit_repo=read_project_file)

        await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert recorder != [repo]
        assert copied_project_files == [_V9_PROJECT_FILE]

    async def test_applies_the_changes_to_the_session_repo_and_stages_them(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)

        await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert _staged_changes(repo) == ["M\tApp/App.csproj", "D\tApp/ui/layout-sets.json"]
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V9_PROJECT_FILE

    async def test_applies_the_changes_that_studioctl_did_not_stage(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_stages_nothing, exit_code=0)

        ctx = _ctx(repo)
        await _run(UpgradeAppToV9Tool(), ctx)

        assert ctx.extras["changed_files"] == {"App/App.csproj", "App/ui/Settings.json", "App/ui/layout-sets.json"}

    async def test_refuses_an_upgrade_that_makes_a_symbolic_link(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        other_session_file = tmp_path / "other-session" / "Notes.cs"
        write_files(other_session_file.parent, {other_session_file.name: _TODO_IN_OTHER_SESSION})
        repo = create_committed_repo(tmp_path / "session", _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(
            runner, _upgrade_that_links_to_a_file_of_another_session(other_session_file), exit_code=0
        )
        ctx = _ctx(repo)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert "App/logic/Notes.cs" in result.content
        assert _TODO_IN_OTHER_SESSION not in result.content
        assert not (repo / "App/logic").exists()
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert "changed_files" not in ctx.extras

    @pytest.mark.parametrize(
        ("make_change", "refused_change"),
        [
            (_upgrade_that_adds_a_submodule, "App/vendor (a submodule)"),
            (_upgrade_that_adds_a_file(".github/workflows/build.yml"), ".github/workflows/build.yml (a CI workflow"),
            (_upgrade_that_adds_a_file(".gitea/workflows/build.yaml"), ".gitea/workflows/build.yaml (a CI workflow"),
            (_upgrade_that_adds_a_file("App/.gitattributes"), "App/.gitattributes (a git attributes"),
            (_upgrade_that_adds_a_file(".gitmodules"), ".gitmodules (a git attributes or submodules file)"),
        ],
    )
    async def test_refuses_an_upgrade_that_makes_a_change_the_real_upgrade_never_makes(
        self, runner: _FakeRunner, tmp_path: Path, make_change: Callable[[Path], None], refused_change: str
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, make_change, exit_code=0)
        ctx = _ctx(repo)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert result.is_error
        assert refused_change in result.content
        assert (repo / "App/App.csproj").read_text(encoding="utf-8") == _V8_PROJECT_FILE
        assert _git_status(repo) == ""
        assert "changed_files" not in ctx.extras

    @pytest.mark.parametrize(
        ("patch", "path_outside_the_working_tree"),
        [
            (_PATCH_INTO_THE_GIT_FOLDER, ".git/hooks/post-commit"),
            (_PATCH_OUT_OF_THE_REPO, "../outside.txt"),
            (_PATCH_BEHIND_A_SYMBOLIC_LINK, "App/link/escaped.txt"),
        ],
    )
    async def test_never_applies_a_patch_that_writes_outside_the_working_tree(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path, patch: bytes, path_outside_the_working_tree: str
    ):
        """App code runs in the runner, so it can control all of the patch."""
        repo = create_committed_repo(tmp_path / "session", _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)
        runner.hostile_patch = patch

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert path_outside_the_working_tree in result.content
        assert not (repo / ".git/hooks/post-commit").exists()
        assert not (tmp_path / "outside.txt").exists()
        assert _staged_changes(repo) == []
        assert _git_status(repo) == ""

    async def test_says_why_the_upgrade_cannot_run_when_the_deployment_has_no_runner(
        self, monkeypatch, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        monkeypatch.setattr(runner_module, "create_runner", lambda: None)

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert result.metadata == {"unavailable": True}
        assert "nothing was changed" in result.content
        assert "this deployment has no assistant runner" in result.content
        assert runner.app_paths == []

    async def test_says_why_the_upgrade_cannot_run_when_the_runner_is_unavailable(
        self, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        runner.unavailable = RunnerUnavailable("the assistant runner did not answer (ConnectError: Connection refused)")

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert result.metadata == {"unavailable": True}
        assert "do NOT retry" in result.content
        assert "the assistant runner did not answer (ConnectError: Connection refused)" in result.content
        assert _git_status(repo) == ""

    async def test_tells_the_user_when_the_upgrade_waits_for_a_free_runner(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)
        _stub_upgrade_that_edits_repo(runner, _upgrade_that_bumps_csproj_and_deletes_layout_sets, exit_code=0)
        runner.waits = True
        statuses: list[str] = []
        ctx = _ctx(repo, statuses=statuses)

        result = await _run(UpgradeAppToV9Tool(), ctx)

        assert not result.is_error
        assert statuses == ["Står i kø for oppgradering", "Oppgraderer appen til v9"]
        assert ctx.extras["changed_files"] == {"App/App.csproj", "App/ui/layout-sets.json"}

    async def test_says_nothing_changed_when_the_upgrade_does_not_finish_in_time(
        self, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _V8_APP_FILES)

        async def time_out(app: Path) -> subprocess.CompletedProcess[bytes]:
            _upgrade_that_fails_halfway(app)
            raise TimeoutError

        runner.studioctl = time_out

        result = await _run(UpgradeAppToV9Tool(), _ctx(repo))

        assert result.is_error
        assert "did not finish in 11 minutes, and nothing was changed" in result.content
        assert _git_status(repo) == ""

    async def test_reports_only_the_upgrade_status_when_a_runner_is_free(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _V9_APP_FILES)
        _stub_studioctl(runner, _studioctl_result(_SUCCESS_PAYLOAD))
        statuses: list[str] = []

        await _run(UpgradeAppToV9Tool(), _ctx(repo, statuses=statuses))

        assert statuses == ["Oppgraderer appen til v9"]

    async def test_runs_the_upgrades_of_two_sessions_at_the_same_time(self, runner: _FakeRunner, tmp_path: Path):
        release = asyncio.Event()
        recorder: list[Path] = []
        _stub_studioctl_blocked_until(runner, release, recorder)
        first_repo = create_committed_repo(tmp_path / "first", {**_V9_APP_FILES, "first.txt": ""})
        second_repo = create_committed_repo(tmp_path / "second", {**_V9_APP_FILES, "second.txt": ""})

        first = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(first_repo)))
        second = asyncio.create_task(_run(UpgradeAppToV9Tool(), _ctx(second_repo)))
        await _let_tasks_run()

        assert len(recorder) == 2

        release.set()
        await asyncio.gather(first, second)

    async def test_read_only_session_denies_with_escalation(self, tmp_path: Path):
        tool = UpgradeAppToV9Tool()
        result = await tool.check_permission(
            tool.input_schema.model_validate({}),
            _ctx(tmp_path, allow_app_changes=False),
        )
        assert result.allowed is False
        assert result.escalatable is True
