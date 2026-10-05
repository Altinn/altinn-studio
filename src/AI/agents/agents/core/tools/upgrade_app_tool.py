"""`upgrade_app_to_v9` — run the official v8→v9 app upgrade.

The upgrade logic lives in studioctl. This tool runs `studioctl app upgrade`,
stages its changes, and marks those files so the normal commit flow picks
them up.

The upgrade can run on top of fixes that the model made and verified in the
same turn, to unblock an upgrade that studioctl held back. If the upgrade
then does not complete, the fixes are not committed alone.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from agents.altinn.app_version import V9_PROFILE, detect_app_version_profile
from agents.core.tool import LoopContext, ToolResult

from . import _dotnet_queue
from ._write_base import WriteToolMixin
from .git_tool import UNFINISHED_UPGRADE_FIXES, unverified_changed_files

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
    "The upgrade needs a clean working tree, or only the changes that you made and verified in this turn.  "
    "Commit or discard the changes to these files, then run it again:"
)
_UNVERIFIED_FIXES_MESSAGE = (
    "The upgrade runs only on top of verified changes.  Run `verify_changes` for these files first:"
)
_KEPT_FIXES_NOTE = (
    "Your changes from this turn are kept, so you can fix more and run the upgrade again.  "
    "They are committed only with a completed upgrade: `commit_session_branch` refuses them, "
    "and the end of the turn discards them."
)
_OFFER_INSTRUCTION = (
    "Load `skill(altinn-upgrade)` before you answer.  If the user has not accepted your offer to fix "
    "these TODOs yet, tell the user which ones you can fix and offer to fix them.  Do not fix them in "
    "the same turn as the offer."
)

# The upgrade keeps this file when it holds back layout sets that need manual work.
_LAYOUT_SETS_FILE = "App/ui/layout-sets.json"
_HELD_BACK_MESSAGE = "The app was not upgraded, and the upgrade changed nothing.  These TODOs block the upgrade:"
_HELD_BACK_ROLLBACK_NOTE = (
    "The rollback also removed the markers and generated files that these TODOs mention.  "
    "The legacy rules they name are still in RuleConfiguration.json and RuleHandler.js."
)
_TODO_STATUS = "TODO"
_CREATED_FILES_WITH_TODOS_MESSAGE = "The upgrade created files with these TODOs:"
_COMMENT_PREFIX = "//"

# The tool stages the changes, so git status shows a created file as added to the index.
_GIT_STATUS_ADDED = "A"
_GIT_STATUS_RENAMED = "R"

_WAITING_STATUS = "Står i kø for oppgradering"
_RUNNING_STATUS = "Oppgraderer appen til v9"


class UpgradeAppToV9Args(BaseModel):
    model_config = ConfigDict(extra="forbid")


@dataclass(frozen=True)
class _RestorePoint:
    """The working tree before studioctl ran, as a git tree."""

    tree: str
    has_fixes: bool


async def _run_studioctl_upgrade(project_folder: str) -> subprocess.CompletedProcess[str]:
    """studioctl gives up on an upgrade after 10 minutes, so this needs no timeout of its own.

    `--allow-dirty` lets the upgrade run on top of the fixes of the model.  studioctl then does not stage
    its changes, so the tool does it.
    """
    command = ["studioctl", "app", "upgrade", "v9", "-p", project_folder, "--json", "--allow-dirty"]
    process = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env={**os.environ, "NO_COLOR": "1"},
    )
    stdout, stderr = await process.communicate()
    returncode = await process.wait()
    return subprocess.CompletedProcess(command, returncode, stdout.decode(), stderr.decode())


class UpgradeAppToV9Tool(WriteToolMixin):
    name = "upgrade_app_to_v9"
    description = (
        "Upgrade this Altinn app from version 8 to version 9.  Runs the "
        "official v8-to-v9 migration across the whole app: NuGet packages, "
        "target framework, process/layout/rule configuration, and C# API "
        "changes.\n\n"
        "WHEN: only when the user asks for the upgrade, or accepts your offer "
        "to fix what an upgrade left.  Never suggest the upgrade yourself; v9 "
        "is still a preview release.\n\n"
        "PRECONDITION: the app must be on version 8 or 9 (otherwise the "
        "upgrade is refused).  The working tree must be clean, or hold only "
        "changes that you made and verified in this turn to unblock the "
        "upgrade.  On a v9 app, the upgrade runs again and applies what newer "
        "versions of the upgrade fix.  Prefer running this before making other "
        "edits.\n\n"
        "RESULT: the upgrade either completes or changes nothing.  A completed "
        "upgrade applies the changes on disk and stages them for commit.  When "
        "it created files with TODOs, list those TODOs in the body of the "
        "commit message.  When the upgrade leaves TODOs or blockers, load "
        "`skill(altinn-upgrade)`: it tells you how to assess them, how to offer "
        "the fix to the user, and how to fix them when the user accepts."
    )
    input_schema = UpgradeAppToV9Args
    is_concurrency_safe = False
    is_read_only = False

    async def run(self, args: UpgradeAppToV9Args, ctx: LoopContext) -> ToolResult:
        changed_paths = _get_changed_paths(ctx.repo_path)
        refusal = _refuse_changes_that_are_not_verified_fixes(changed_paths, ctx)
        if refusal is not None:
            return refusal
        restore_point = _create_restore_point(ctx.repo_path, has_fixes=bool(changed_paths))

        async with _dotnet_queue.dotnet_job_queue.turn(
            ctx.report_status,
            waiting_status=_WAITING_STATUS,
            running_status=_RUNNING_STATUS,
        ):
            completed = await _run_studioctl_upgrade(ctx.repo_path)

        result = _parse_upgrade_result(completed.stdout)
        if result is None:
            return _not_upgraded_result([_FAILED_MESSAGE, completed.stderr.strip()], ctx, restore_point)

        return _map_exit_code_to_tool_result(result, ctx, restore_point)


def _refuse_changes_that_are_not_verified_fixes(changed_paths: list[str], ctx: LoopContext) -> ToolResult | None:
    """The restore after a failed upgrade puts back the tree as it was before, so it must hold only the model's own work."""
    own_paths = ctx.extras.get("changed_files") or set()
    other_paths = [path for path in changed_paths if path not in own_paths]
    if other_paths:
        return ToolResult(content="\n".join([_UNCOMMITTED_CHANGES_MESSAGE, *other_paths]), is_error=True)
    unverified_paths = sorted(unverified_changed_files(ctx) & set(changed_paths))
    if unverified_paths:
        return ToolResult(content="\n".join([_UNVERIFIED_FIXES_MESSAGE, *unverified_paths]), is_error=True)
    return None


def _parse_upgrade_result(stdout: str) -> dict | None:
    """studioctl prints the result as JSON, or only an error on stderr when it cannot run the upgrade."""
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        return None


def _map_exit_code_to_tool_result(result: dict, ctx: LoopContext, restore_point: _RestorePoint) -> ToolResult:
    exit_code = result.get("exitCode", 1)
    steps = result.get("steps", [])
    summary = _summarize_steps(steps)

    if exit_code in _UPGRADED_EXIT_CODES and not _held_back_layout_sets(ctx.repo_path):
        return _upgraded_result(exit_code, summary, ctx)

    if exit_code in _UPGRADED_EXIT_CODES:
        sections = [_HELD_BACK_MESSAGE, _summarize_todos(steps), _HELD_BACK_ROLLBACK_NOTE]
        if not restore_point.has_fixes:
            sections.append(_OFFER_INSTRUCTION)
        return _not_upgraded_result(sections, ctx, restore_point)

    if exit_code == _EXIT_UNSUPPORTED_VERSION:
        sections = ["This app is not on version 8 or 9, so it cannot be upgraded to v9.", summary]
        return _not_upgraded_result(sections, ctx, restore_point)

    return _not_upgraded_result([_FAILED_MESSAGE, result.get("error") or summary], ctx, restore_point)


def _not_upgraded_result(sections: list[str], ctx: LoopContext, restore_point: _RestorePoint) -> ToolResult:
    _restore_working_tree(ctx.repo_path, restore_point)
    if restore_point.has_fixes:
        ctx.extras[UNFINISHED_UPGRADE_FIXES] = True
        sections = [*sections, _KEPT_FIXES_NOTE]
    return ToolResult(content="\n\n".join(sections), is_error=True)


def _upgraded_result(exit_code: int, summary: str, ctx: LoopContext) -> ToolResult:
    ctx.extras.pop(UNFINISHED_UPGRADE_FIXES, None)
    _run_git(ctx.repo_path, "add", "--all")
    changed_paths = _get_changed_paths(ctx.repo_path)
    if not changed_paths:
        sections = [_NOTHING_TO_CHANGE_MESSAGE, summary]
        if exit_code == _EXIT_MANUAL_ACTION_REQUIRED:
            sections.append(_OFFER_INSTRUCTION)
        return ToolResult(content="\n\n".join(sections))

    _record_changed_files(ctx, changed_paths)
    was_on_v9 = ctx.app_version_profile is V9_PROFILE
    sections = [_upgraded_headline(exit_code, was_on_v9), summary]
    todos = _todos_in_created_files(ctx.repo_path)
    if todos:
        sections.append("\n\n".join([_CREATED_FILES_WITH_TODOS_MESSAGE, *todos]))
    if exit_code == _EXIT_MANUAL_ACTION_REQUIRED or todos:
        sections.append(_OFFER_INSTRUCTION)
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


def _create_restore_point(repo_path: str, *, has_fixes: bool) -> _RestorePoint:
    """On a clean working tree, the restore point is the tree of HEAD."""
    _run_git(repo_path, "add", "--all")
    return _RestorePoint(tree=_run_git(repo_path, "write-tree").strip(), has_fixes=has_fixes)


def _restore_working_tree(repo_path: str, restore_point: _RestorePoint) -> None:
    """Discards the changes of the upgrade.  The fixes that the model made before the upgrade stay."""
    _run_git(repo_path, "read-tree", restore_point.tree)
    _run_git(repo_path, "checkout-index", "--all", "--force")
    _run_git(repo_path, "clean", "-fd")


def discard_unfinished_upgrade_fixes(ctx: LoopContext) -> bool:
    """A fix for an upgrade that did not complete has no use alone, so the turn ends as it started."""
    if not ctx.extras.get(UNFINISHED_UPGRADE_FIXES):
        return False
    _run_git(ctx.repo_path, "reset", "--hard", "HEAD")
    _run_git(ctx.repo_path, "clean", "-fd")
    del ctx.extras[UNFINISHED_UPGRADE_FIXES]
    ctx.extras["changed_files"] = set()
    ctx.extras["verified_files"] = set()
    return True


def _run_git(repo_path: str, *args: str) -> str:
    completed = subprocess.run(["git", *args], cwd=repo_path, capture_output=True, text=True, check=True)
    return completed.stdout


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
    With `--untracked-files=all`, git lists each new file, not only its new folder.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain", "-z", "--untracked-files=all"],
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
