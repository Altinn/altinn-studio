"""`upgrade_app_to_v9` — run the official v8→v9 app upgrade.

The upgrade logic lives in studioctl. The upgrade runs code from the app, so the
assistant runner runs it in a microVM without the secrets of this service. The
runner returns the changes as a patch. This tool checks the patch, applies it to
the session repo and marks the files so that the normal commit flow picks them up.
"""

from __future__ import annotations

import asyncio
import json
import logging
import subprocess
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from pydantic import BaseModel, ConfigDict

from agents.altinn.app_version import V9_PROFILE, detect_app_version_profile
from agents.core import runner
from agents.core.runner import RunnerUnavailable
from agents.core.tool import LoopContext, ToolResult, WriteTool

log = logging.getLogger(__name__)

# studioctl upgrade exit codes, reported in its JSON result
_EXIT_SUCCESS = 0
_EXIT_UNSUPPORTED_VERSION = 2
_EXIT_MANUAL_ACTION_REQUIRED = 3

_UPGRADED_EXIT_CODES = {_EXIT_SUCCESS, _EXIT_MANUAL_ACTION_REQUIRED}

_UPGRADED_MESSAGE = "Upgraded the app to v9."
_RERUN_MESSAGE = "The app was already on v9.  The upgrade ran again and made new changes."
_MANUAL_FOLLOW_UP_MESSAGE = "Some steps need manual follow-up:"
_NOTHING_TO_CHANGE_MESSAGE = "The app is up to date with this version of the upgrade, so nothing was changed."
_FAILED_MESSAGE = "The v9 upgrade failed, and its changes were discarded:"
_UNCOMMITTED_CHANGES_MESSAGE = (
    "The upgrade needs a clean working tree.  Commit or discard the changes to these files, then run it again:"
)
_UNAVAILABLE_MESSAGE = (
    "The v9 upgrade cannot run now, and nothing was changed.  This is an infrastructure "
    "limitation, not a problem with the app, so do NOT retry.  The reason:"
)
_REFUSED_CHANGES_MESSAGE = "The upgrade made these changes, which the real upgrade never makes:"

# The runner stops studioctl after 11 minutes.  studioctl stops an upgrade after 10.
_UPGRADE_TIMEOUT_MINUTES = 11
_TIMED_OUT_MESSAGE = f"The v9 upgrade did not finish in {_UPGRADE_TIMEOUT_MINUTES} minutes, and nothing was changed."
_RUNNER_QUEUE_STATUS = "Står i kø for oppgradering"

# The upgrade keeps this file when it holds back layout sets that need manual work.
_LAYOUT_SETS_FILE = "App/ui/layout-sets.json"
_HELD_BACK_MESSAGE = "The app was not upgraded, and nothing was changed.  These TODOs block the upgrade:"
_HELD_BACK_ROLLBACK_NOTE = (
    "The rollback also removed the markers and generated files that these TODOs mention.  "
    "The legacy rules they name are still in RuleConfiguration.json and RuleHandler.js."
)
_TODO_STATUS = "TODO"
_CREATED_FILES_WITH_TODOS_MESSAGE = "The upgrade created files with these TODOs:"
_COMMENT_PREFIX = "//"

# The patch goes into the index, so git status shows a file that the upgrade created as added to the index.
_GIT_STATUS_ADDED = "A"
_GIT_STATUS_RENAMED = "R"

_GIT_RESET_TO_HEAD = ["git", "reset", "--hard", "HEAD"]
_GIT_REMOVE_UNTRACKED_FILES = ["git", "clean", "-fd"]
_GIT_APPLY_PATCH_TO_INDEX_AND_WORKING_TREE = ["git", "apply", "--index", "--whitespace=nowarn"]
# Each staged change as `:<old mode> <new mode> <old id> <new id> <status>`, then its path.
_GIT_STAGED_CHANGES_WITH_MODES = ["git", "diff", "--cached", "--raw", "-z", "--no-renames"]

# The tool marks the changed files as verified, so it accepts only what an upgrade can make.
_REFUSED_FILE_MODES = {"120000": "a symbolic link", "160000": "a submodule"}
# CI workflows run with the secrets of the repo.
_REFUSED_FOLDERS = (".gitea/", ".github/")
# These files change what git does with the other files.
_REFUSED_FILE_NAMES = {".gitattributes", ".gitmodules"}


class _UpgradeQueue:
    """Runs one upgrade at a time and tells waiting users their place in the queue."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._upgrades_in_progress = 0

    @asynccontextmanager
    async def turn(self, report_status: Callable[[str], None]) -> AsyncIterator[None]:
        upgrades_ahead = self._upgrades_in_progress
        self._upgrades_in_progress += 1
        try:
            if upgrades_ahead:
                report_status(f"Står i kø for oppgradering ({upgrades_ahead} foran)")
            async with self._lock:
                if upgrades_ahead:
                    report_status("Oppgraderer appen til v9")
                yield
        finally:
            self._upgrades_in_progress -= 1


_upgrade_queue = _UpgradeQueue()


class UpgradeAppToV9Args(BaseModel):
    model_config = ConfigDict(extra="forbid")


@dataclass(frozen=True)
class _UpgradeRun:
    """The studioctl result, and the changes of a completed upgrade as a patch."""

    result: dict | None
    stderr: str
    changes: bytes


async def _upgrade_copy_of_repo(repo_path: str, report_status: Callable[[str], None]) -> _UpgradeRun:
    """Send the app to the assistant runner, which runs the upgrade on a copy and makes the patch.
    Raises TimeoutError when the upgrade does not finish in time."""
    app_runner = runner.create_runner()
    if app_runner is None:
        raise RunnerUnavailable("this deployment has no assistant runner")
    run = await app_runner.upgrade(repo_path, lambda: report_status(_RUNNER_QUEUE_STATUS))
    if run.timed_out:
        raise TimeoutError
    result = _parse_upgrade_result(run.stdout)
    upgraded = result is not None and result.get("exitCode") in _UPGRADED_EXIT_CODES
    return _UpgradeRun(result, run.stderr, run.patch if upgraded else b"")


class UpgradeAppToV9Tool(WriteTool[UpgradeAppToV9Args]):
    name = "upgrade_app_to_v9"
    description = (
        "Upgrade this Altinn app from version 8 to version 9.  Runs the "
        "official v8-to-v9 migration across the whole app: NuGet packages, "
        "target framework, process/layout/rule configuration, and C# API "
        "changes.\n\n"
        "WHEN: only when the user asks for the upgrade.  Never suggest it "
        "yourself; v9 is still a preview release.\n\n"
        "PRECONDITION: the app must be on version 8 or 9 (otherwise the "
        "upgrade is refused), and the working tree must be clean.  On a v9 "
        "app, the upgrade runs again and applies what newer versions of the "
        "upgrade fix.  Prefer running this before making other edits.\n\n"
        "RESULT: the upgrade either completes or changes nothing.  A completed "
        "upgrade applies the changes on disk and stages them for commit; relay "
        "any manual follow-up steps to the user.  When it created files with "
        "TODOs, list those TODOs in the body of the commit message, and tell "
        "the user what each TODO asks for.  When the upgrade changes nothing, "
        "tell the user what blocks it.  Do not fix the TODOs or the blockers "
        "yourself."
    )
    input_schema = UpgradeAppToV9Args
    is_concurrency_safe = False

    async def run(self, args: UpgradeAppToV9Args, ctx: LoopContext) -> ToolResult:
        uncommitted_paths = _get_changed_paths(ctx.repo_path)
        if uncommitted_paths:
            return ToolResult(content="\n".join([_UNCOMMITTED_CHANGES_MESSAGE, *uncommitted_paths]), is_error=True)

        try:
            async with _upgrade_queue.turn(ctx.report_status):
                upgrade = await _upgrade_copy_of_repo(ctx.repo_path, ctx.report_status)
        except RunnerUnavailable as reason:
            return ToolResult(
                content=f"{_UNAVAILABLE_MESSAGE} {reason}.", is_error=True, metadata={"unavailable": True}
            )
        except TimeoutError:
            return ToolResult(content=_TIMED_OUT_MESSAGE, is_error=True)

        if upgrade.result is None:
            return ToolResult(content=f"{_FAILED_MESSAGE}\n\n{upgrade.stderr.strip()}", is_error=True)

        return _map_exit_code_to_tool_result(upgrade.result, upgrade.changes, ctx)


def _parse_upgrade_result(stdout: str) -> dict | None:
    """studioctl prints the result as JSON, or only an error on stderr when it cannot run the upgrade."""
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        return None


def _map_exit_code_to_tool_result(result: dict, changes: bytes, ctx: LoopContext) -> ToolResult:
    exit_code = result.get("exitCode", 1)
    steps = result.get("steps", [])
    summary = _summarize_steps(steps)

    if exit_code in _UPGRADED_EXIT_CODES:
        return _apply_upgrade(exit_code, steps, summary, changes, ctx)

    if exit_code == _EXIT_UNSUPPORTED_VERSION:
        return ToolResult(
            content=(f"This app is not on version 8 or 9, so it cannot be upgraded to v9.\n\n{summary}"),
            is_error=True,
        )

    return ToolResult(content=f"{_FAILED_MESSAGE}\n\n{result.get('error') or summary}", is_error=True)


def _apply_upgrade(exit_code: int, steps: list[dict], summary: str, changes: bytes, ctx: LoopContext) -> ToolResult:
    apply_error = _apply_changes(ctx.repo_path, changes)
    if apply_error:
        return ToolResult(content=f"{_FAILED_MESSAGE}\n\n{apply_error}", is_error=True)

    if _held_back_layout_sets(ctx.repo_path):
        _restore_working_tree(ctx.repo_path)
        sections = [_HELD_BACK_MESSAGE, _summarize_todos(steps), _HELD_BACK_ROLLBACK_NOTE]
        return ToolResult(content="\n\n".join(sections), is_error=True)

    return _upgraded_result(exit_code, summary, ctx)


def _apply_changes(repo_path: str, patch: bytes) -> str | None:
    """Apply the patch from the runner, or return why it does not apply.  App code made the patch,
    so this tool keeps only the changes that an upgrade can make.  git applies all of the patch or
    nothing, and refuses paths outside the repo, paths in `.git` and paths behind a symlink."""
    if not patch:
        return None
    applied = subprocess.run(
        _GIT_APPLY_PATCH_TO_INDEX_AND_WORKING_TREE, cwd=repo_path, input=patch, capture_output=True
    )
    if applied.returncode != 0:
        return applied.stderr.decode(errors="replace").strip()

    refused_changes = _find_refused_changes(repo_path)
    if refused_changes:
        _restore_working_tree(repo_path)
        return "\n".join([_REFUSED_CHANGES_MESSAGE, *refused_changes])
    return None


def _find_refused_changes(repo_path: str) -> list[str]:
    """Each staged path that the upgrade never makes, with the reason.  This tool reads the created
    files to find TODOs, so a symbolic link could send it out of the repo."""
    staged = subprocess.run(_GIT_STAGED_CHANGES_WITH_MODES, cwd=repo_path, capture_output=True, check=True)
    fields = staged.stdout.decode(errors="replace").split("\0")
    refused_changes: list[str] = []
    for status, path in zip(fields[0::2], fields[1::2], strict=False):
        new_mode = status.split()[1]
        reason = _get_refusal_reason(path, new_mode)
        if reason:
            refused_changes.append(f"{path} ({reason})")
    return refused_changes


def _get_refusal_reason(path: str, new_mode: str) -> str | None:
    if new_mode in _REFUSED_FILE_MODES:
        return _REFUSED_FILE_MODES[new_mode]
    if path.startswith(_REFUSED_FOLDERS):
        return "a CI workflow folder"
    if PurePosixPath(path).name in _REFUSED_FILE_NAMES:
        return "a git attributes or submodules file"
    return None


def _upgraded_result(exit_code: int, summary: str, ctx: LoopContext) -> ToolResult:
    changed_paths = _get_changed_paths(ctx.repo_path)
    if not changed_paths:
        return ToolResult(content=f"{_NOTHING_TO_CHANGE_MESSAGE}\n\n{summary}")

    _record_changed_files(ctx, changed_paths)
    was_on_v9 = ctx.app_version_profile is V9_PROFILE
    sections = [_upgraded_headline(exit_code, was_on_v9), summary]
    todos = _todos_in_created_files(ctx.repo_path)
    if todos:
        sections.append("\n\n".join([_CREATED_FILES_WITH_TODOS_MESSAGE, *todos]))
    if not was_on_v9:
        sections.append(_switch_app_version_profile(ctx))
    return ToolResult(content="\n\n".join(sections))


def _upgraded_headline(exit_code: int, was_on_v9: bool) -> str:
    headline = _RERUN_MESSAGE if was_on_v9 else _UPGRADED_MESSAGE
    if exit_code == _EXIT_MANUAL_ACTION_REQUIRED:
        return f"{headline}  {_MANUAL_FOLLOW_UP_MESSAGE}"
    return headline


def _held_back_layout_sets(repo_path: str) -> bool:
    return (Path(repo_path) / _LAYOUT_SETS_FILE).is_file()


def _switch_app_version_profile(ctx: LoopContext) -> str:
    """The system prompt is fixed for the turn, so the rules of the new app version travel in the tool result."""
    previous_profile = ctx.app_version_profile
    ctx.app_version_profile = detect_app_version_profile(ctx.repo_path)
    return "\n\n".join(
        (
            f"The app is now {ctx.app_version_profile.version_label}.  Follow these rules "
            f"instead of the {previous_profile.version_label} rules in the system prompt:",
            ctx.app_version_profile.ui_anatomy_prompt,
            ctx.app_version_profile.version_rules_prompt,
        )
    )


def _summarize_steps(steps: list[dict]) -> str:
    summary = "\n".join(_format_message(step, message) for step in steps for message in step["messages"])
    log.info("V9 upgrade steps:\n%s", summary)
    return summary


def _summarize_todos(steps: list[dict]) -> str:
    """The rollback undid the other steps, so only their TODOs still apply."""
    return "\n".join(
        _format_message(step, message)
        for step in steps
        for message in step["messages"]
        if message["status"] == _TODO_STATUS
    )


def _format_message(step: dict, message: dict) -> str:
    return f"[{message['status']}] {step['name']}: {message['text']}"


def _restore_working_tree(repo_path: str) -> None:
    """The upgrade only runs on a clean working tree, so this discards only the changes of the upgrade."""
    subprocess.run(_GIT_RESET_TO_HEAD, cwd=repo_path, capture_output=True, text=True, check=True)
    subprocess.run(_GIT_REMOVE_UNTRACKED_FILES, cwd=repo_path, capture_output=True, text=True, check=True)


def _record_changed_files(ctx: LoopContext, paths: list[str]) -> None:
    changed: set[str] = ctx.extras.setdefault("changed_files", set())
    verified: set[str] = ctx.extras.setdefault("verified_files", set())
    changed.update(paths)
    verified.update(paths)  # We trust the upgrade script and bypass VerifyChangesTool


def _todos_in_created_files(repo_path: str) -> list[str]:
    """Each TODO comment in the files the upgrade created, below its `path:line:`."""
    todos: list[str] = []
    for path in _get_created_paths(repo_path):
        lines = (Path(repo_path) / path).read_text(encoding="utf-8").splitlines()
        todo_indexes = [index for index, line in enumerate(lines) if "TODO" in line]
        todos.extend(f"{path}:{index + 1}:\n{_todo_comment(lines, index)}" for index in todo_indexes)
    return todos


def _todo_comment(lines: list[str], todo_index: int) -> str:
    """The TODO line and the comment lines below it, which say what the TODO asks for."""
    comment = [lines[todo_index].strip()]
    for line in lines[todo_index + 1 :]:
        stripped_line = line.strip()
        if not stripped_line.startswith(_COMMENT_PREFIX) or "TODO" in stripped_line:
            break
        comment.append(stripped_line)
    return "\n".join(comment)


def _get_changed_paths(repo_path: str) -> list[str]:
    """Repo-relative paths touched in the working tree"""
    return [path for _, path in _git_status_entries(repo_path)]


def _get_created_paths(repo_path: str) -> list[str]:
    return [path for status, path in _git_status_entries(repo_path) if status.startswith(_GIT_STATUS_ADDED)]


def _git_status_entries(repo_path: str) -> list[tuple[str, str]]:
    """The status code and path of each changed file.  A renamed file has its new path.

    With `-z`, git leaves paths with spaces and non-ASCII letters unquoted, so they match the files on disk.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain", "-z"],
        cwd=repo_path,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    fields = iter(field for field in result.stdout.split("\0") if field)
    entries: list[tuple[str, str]] = []
    for field in fields:
        status, path = field[:2], field[3:]
        if _GIT_STATUS_RENAMED in status:
            next(fields)  # the path before the rename
        entries.append((status, path))
    return entries
