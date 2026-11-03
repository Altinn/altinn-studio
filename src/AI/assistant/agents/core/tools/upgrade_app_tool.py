"""`upgrade_app_to_v9` — run the official v8→v9 app upgrade.

The upgrade logic is in studioctl. Because the upgrade runs app code, the core
operator runs it in a sandbox Job, in a microVM without the secrets of this
service. The run is for the commit at HEAD, so the tool upgrades only a clean
working tree. The run returns the changes as a patch. This tool applies the
patch to the session repo. Then it marks the files so that the normal commit
flow commits them.
"""

from __future__ import annotations

import asyncio
import logging
import subprocess
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from agents.altinn.app_version import V9_PROFILE, detect_app_version_profile
from agents.core import runner
from agents.core.runner import AppTooLarge, RunCancelled, RunnerProgress, RunnerUnavailable, RunResult
from agents.core.tool import LoopContext, ToolResult, WriteTool

from .utils.repo_files import mark_changed, mark_verified
from .utils.unavailable import report_unavailable

log = logging.getLogger(__name__)

# The kind of run in the core operator that runs `studioctl app upgrade v9`.
_UPGRADE_KIND = "upgrade-v9"

# studioctl reports these upgrade exit codes in its JSON result.
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
_UNAVAILABLE_MESSAGE = "The v9 upgrade cannot run now, and nothing was changed.  The reason:"
_TOO_LARGE_MESSAGE = (
    f"The app is larger than the {runner.MAX_ARCHIVE_BYTES // (1024 * 1024)} MiB that the upgrade accepts as a "
    "compressed archive, so the upgrade did not run, and nothing was changed."
)
_CANCELLED_MESSAGE = "The upgrade was cancelled, and nothing was changed."

_TIMED_OUT_MESSAGE = "The v9 upgrade did not finish in {minutes} minutes, and nothing was changed."
# Each progress state of the run has a status message for the user.
_PROGRESS_STATUS = {
    RunnerProgress.WAITING: "Står i kø for oppgradering",
    RunnerProgress.RUNNING: "Oppgraderer appen til v9",
}

# The upgrade keeps this file when it does not upgrade layout sets that must have manual work.
_LAYOUT_SETS_FILE = "App/ui/layout-sets.json"
_HELD_BACK_MESSAGE = "The app was not upgraded, and nothing was changed.  These TODOs block the upgrade:"
_HELD_BACK_ROLLBACK_NOTE = (
    "The rollback also removed the markers and generated files that these TODOs mention.  "
    "The legacy rules they name are still in RuleConfiguration.json and RuleHandler.js."
)
_TODO_STATUS = "TODO"
_CREATED_FILES_WITH_TODOS_MESSAGE = "The upgrade created files with these TODOs:"
_COMMENT_PREFIX = "//"

# git status shows a file that the upgrade created as added to the index, because the patch goes into the index.
_GIT_STATUS_ADDED = "A"
_GIT_STATUS_RENAMED = "R"

_GIT_RESET_TO_HEAD = ["git", "reset", "--hard", "HEAD"]
_GIT_REMOVE_UNTRACKED_FILES = ["git", "clean", "-fd"]
_GIT_APPLY_PATCH_TO_INDEX_AND_WORKING_TREE = ["git", "apply", "--index", "--whitespace=nowarn"]


class UpgradeAppToV9Args(BaseModel):
    model_config = ConfigDict(extra="forbid")


async def _upgrade_copy_of_repo(ctx: LoopContext) -> RunResult:
    """Send the app to the runner, which runs the upgrade on a copy and makes the patch.  Upgrades of different
    sessions run at the same time, each in its own sandbox.  Sessions on the same commit of the same repository share
    one run."""
    app_runner = runner.create_runner()
    if app_runner is None:
        raise RunnerUnavailable("this deployment has no core operator")
    repo = str(ctx.extras.get("app_name") or "")
    source = await asyncio.to_thread(runner.read_run_source, ctx.repo_path, ctx.repo_owner, repo)
    return await app_runner.run(
        _UPGRADE_KIND,
        source,
        ctx.repo_path,
        lambda progress: ctx.report_status(_PROGRESS_STATUS[progress]),
        ctx.is_cancelled,
    )


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
        uncommitted_paths = [path for _, path in await _git_status_entries(ctx.repo_path)]
        if uncommitted_paths:
            return ToolResult(content="\n".join([_UNCOMMITTED_CHANGES_MESSAGE, *uncommitted_paths]), is_error=True)

        try:
            run = await _upgrade_copy_of_repo(ctx)
        except RunnerUnavailable as reason:
            return report_unavailable(f"{_UNAVAILABLE_MESSAGE} {reason}.")
        except AppTooLarge:
            return ToolResult(content=_TOO_LARGE_MESSAGE, is_error=True)
        except RunCancelled:
            return ToolResult(content=_CANCELLED_MESSAGE, is_error=True)

        if run.timed_out:
            return ToolResult(content=_TIMED_OUT_MESSAGE.format(minutes=run.run_timeout_seconds // 60), is_error=True)
        if run.report is None:
            return ToolResult(content=f"{_FAILED_MESSAGE}\n\n{run.stderr.strip()}", is_error=True)
        return await _map_exit_code_to_tool_result(run.report, run.patch, ctx)


async def _map_exit_code_to_tool_result(report: dict, patch: bytes, ctx: LoopContext) -> ToolResult:
    exit_code = report.get("exitCode", 1)
    steps = report.get("steps", [])
    summary = _summarize_steps(steps)

    if exit_code in _UPGRADED_EXIT_CODES:
        return await _apply_upgrade(exit_code, steps, summary, patch, ctx)

    if exit_code == _EXIT_UNSUPPORTED_VERSION:
        return ToolResult(
            content=(f"This app is not on version 8 or 9, so it cannot be upgraded to v9.\n\n{summary}"),
            is_error=True,
        )

    return ToolResult(content=f"{_FAILED_MESSAGE}\n\n{report.get('error') or summary}", is_error=True)


async def _apply_upgrade(exit_code: int, steps: list[dict], summary: str, patch: bytes, ctx: LoopContext) -> ToolResult:
    apply_error = await _apply_changes(ctx.repo_path, patch)
    if apply_error:
        return ToolResult(content=f"{_FAILED_MESSAGE}\n\n{apply_error}", is_error=True)

    if _held_back_layout_sets(ctx.repo_path):
        await _restore_working_tree(ctx.repo_path)
        sections = [_HELD_BACK_MESSAGE, _summarize_todos(steps), _HELD_BACK_ROLLBACK_NOTE]
        return ToolResult(content="\n\n".join(sections), is_error=True)

    return await _upgraded_result(exit_code, summary, ctx)


async def _apply_changes(repo_path: str, patch: bytes) -> str | None:
    """Apply the patch from the run, or return why it does not apply.  The operator runner refused symbolic links,
    submodules, CI workflows and git attribute files, which no upgrade makes.  git applies all of the patch or
    nothing.  It refuses paths outside the repo, paths in `.git` and paths behind a symlink."""
    if not patch:
        return None
    applied = await asyncio.to_thread(
        subprocess.run, _GIT_APPLY_PATCH_TO_INDEX_AND_WORKING_TREE, cwd=repo_path, input=patch, capture_output=True
    )
    if applied.returncode != 0:
        return applied.stderr.decode(errors="replace").strip()
    return None


async def _upgraded_result(exit_code: int, summary: str, ctx: LoopContext) -> ToolResult:
    status_entries = await _git_status_entries(ctx.repo_path)
    if not status_entries:
        return ToolResult(content=f"{_NOTHING_TO_CHANGE_MESSAGE}\n\n{summary}")

    for _, path in status_entries:
        mark_changed(ctx, path)
        # The upgrade is trusted, so these files do not need `verify_changes`.
        mark_verified(ctx, path)
    was_on_v9 = ctx.app_version_profile is V9_PROFILE
    sections = [_upgraded_headline(exit_code, was_on_v9), summary]
    created_paths = [path for status, path in status_entries if status.startswith(_GIT_STATUS_ADDED)]
    todos = _todos_in_created_files(ctx.repo_path, created_paths)
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
    """The tool result has the rules of the new app version, because the system prompt does not change in the turn."""
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
    """The rollback undid the other steps.  Only their TODOs still apply."""
    return "\n".join(
        _format_message(step, message)
        for step in steps
        for message in step["messages"]
        if message["status"] == _TODO_STATUS
    )


def _format_message(step: dict, message: dict) -> str:
    return f"[{message['status']}] {step['name']}: {message['text']}"


async def _restore_working_tree(repo_path: str) -> None:
    """Discards only the changes of the upgrade, because the upgrade runs only on a clean working tree."""
    for command in (_GIT_RESET_TO_HEAD, _GIT_REMOVE_UNTRACKED_FILES):
        await asyncio.to_thread(subprocess.run, command, cwd=repo_path, capture_output=True, text=True, check=True)


def _todos_in_created_files(repo_path: str, created_paths: list[str]) -> list[str]:
    """Returns each TODO comment in the files that the upgrade created, below its `path:line:`."""
    todos: list[str] = []
    for path in created_paths:
        lines = (Path(repo_path) / path).read_text(encoding="utf-8").splitlines()
        todo_indexes = [index for index, line in enumerate(lines) if "TODO" in line]
        todos.extend(f"{path}:{index + 1}:\n{_todo_comment(lines, index)}" for index in todo_indexes)
    return todos


def _todo_comment(lines: list[str], todo_index: int) -> str:
    """Returns the TODO line and the comment lines below it, which say what the TODO asks for."""
    comment = [lines[todo_index].strip()]
    for line in lines[todo_index + 1 :]:
        stripped_line = line.strip()
        if not stripped_line.startswith(_COMMENT_PREFIX) or "TODO" in stripped_line:
            break
        comment.append(stripped_line)
    return "\n".join(comment)


async def _git_status_entries(repo_path: str) -> list[tuple[str, str]]:
    """Returns the status code and the repo-relative path of each file that changed in the working tree.  A renamed
    file has its new path.

    This function uses `-z` so that the paths match the files on disk.  With `-z`, git does not quote paths with
    spaces and non-ASCII letters.
    """
    result = await asyncio.to_thread(
        subprocess.run,
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
            next(fields)  # This field is the path before the rename.
        entries.append((status, path))
    return entries
