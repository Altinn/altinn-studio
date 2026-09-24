"""`upgrade_app_to_v9` — run the official v8→v9 app upgrade.

The upgrade logic lives in studioctl. This tool runs `studioctl app upgrade`,
which stages its changes on disk, and we then mark those files so the normal
commit flow picks them up.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from pydantic import BaseModel, ConfigDict

from agents.core.tool import LoopContext, ToolResult

from ._write_base import WriteToolMixin

log = logging.getLogger(__name__)

# studioctl upgrade exit codes, reported in its JSON result
_EXIT_SUCCESS = 0
_EXIT_UNSUPPORTED_VERSION = 2
_EXIT_MANUAL_ACTION_REQUIRED = 3

_GIT_RESET_TO_HEAD = ["git", "reset", "--hard", "HEAD"]
_GIT_REMOVE_UNTRACKED_FILES = ["git", "clean", "-fd"]


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
                report_status(f"Venter i kø ({upgrades_ahead} foran)")
            async with self._lock:
                if upgrades_ahead:
                    report_status("Oppgraderer appen til v9")
                yield
        finally:
            self._upgrades_in_progress -= 1


_upgrade_queue = _UpgradeQueue()


class UpgradeAppToV9Args(BaseModel):
    model_config = ConfigDict(extra="forbid")


async def _run_studioctl_upgrade(project_folder: str) -> subprocess.CompletedProcess[str]:
    """studioctl gives up on an upgrade after 10 minutes, so this needs no timeout of its own."""
    command = ["studioctl", "app", "upgrade", "v9", "-p", project_folder, "--json"]
    process = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        # studioctl colors its errors even when stderr is not a terminal.
        env={**os.environ, "NO_COLOR": "1"},
    )
    stdout, stderr = await process.communicate()
    return subprocess.CompletedProcess(command, process.returncode, stdout.decode(), stderr.decode())


class UpgradeAppToV9Tool(WriteToolMixin):
    name = "upgrade_app_to_v9"
    description = (
        "Upgrade this Altinn app from version 8 to version 9.  Runs the "
        "official v8-to-v9 migration across the whole app: NuGet packages, "
        "target framework, process/layout/rule configuration, and C# API "
        "changes.\n\n"
        "PRECONDITION: the app must be on version 8 (otherwise the upgrade "
        "is refused), and the working tree must be clean.  Prefer running "
        "this before making other edits.\n\n"
        "RESULT: applies the changes on disk and stages them for commit.  "
        "Some steps can need manual follow-up — "
        "relay those to the user.  A failed upgrade discards its changes."
    )
    input_schema = UpgradeAppToV9Args
    is_concurrency_safe = False
    is_read_only = False

    async def run(self, args: UpgradeAppToV9Args, ctx: LoopContext) -> ToolResult:
        async with _upgrade_queue.turn(ctx.report_status):
            completed = await _run_studioctl_upgrade(ctx.repo_path)

        result = _parse_upgrade_result(completed.stdout)
        if result is None:
            return ToolResult(
                content=f"studioctl could not run the upgrade: {completed.stderr.strip()}",
                is_error=True,
            )

        return _map_exit_code_to_tool_result(result, ctx)


def _parse_upgrade_result(stdout: str) -> dict | None:
    """studioctl prints the result as JSON, or only an error on stderr when it cannot run the upgrade."""
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        return None


def _map_exit_code_to_tool_result(result: dict, ctx: LoopContext) -> ToolResult:
    exit_code = result.get("exitCode", 1)
    steps = result.get("steps", [])
    summary = _summarize_steps(steps)

    if exit_code == _EXIT_SUCCESS:
        _record_changed_files(ctx)
        return ToolResult(content=f"Upgraded the app to v9.\n\n{summary}")

    if exit_code == _EXIT_MANUAL_ACTION_REQUIRED:
        _record_changed_files(ctx)
        return ToolResult(content=(f"Upgraded the app to v9, but some steps need manual follow-up:\n\n{summary}"))

    _restore_working_tree(ctx.repo_path)

    if exit_code == _EXIT_UNSUPPORTED_VERSION:
        return ToolResult(
            content=(f"This app is not on version 8, so it cannot be upgraded to v9.\n\n{summary}"),
            is_error=True,
        )

    return ToolResult(
        content=(f"The v9 upgrade failed, and its changes were discarded:\n\n{result.get('error') or summary}"),
        is_error=True,
    )


def _summarize_steps(steps: list[dict]) -> str:
    summary = "\n".join(
        f"[{message['status']}] {step['name']}: {message['text']}" for step in steps for message in step["messages"]
    )
    log.info("V9 upgrade steps:\n%s", summary)
    return summary


def _restore_working_tree(repo_path: str) -> None:
    """studioctl refuses a dirty working tree, so this discards only the upgrade's own changes."""
    subprocess.run(_GIT_RESET_TO_HEAD, cwd=repo_path, capture_output=True, text=True)
    subprocess.run(_GIT_REMOVE_UNTRACKED_FILES, cwd=repo_path, capture_output=True, text=True)


def _record_changed_files(ctx: LoopContext) -> None:
    paths = _get_changed_paths(ctx.repo_path)
    if not paths:
        return
    changed: set[str] = ctx.extras.setdefault("changed_files", set())
    verified: set[str] = ctx.extras.setdefault("verified_files", set())
    changed.update(paths)
    verified.update(paths)  # We trust the upgrade script and bypass VerifyChangesTool


def _get_changed_paths(repo_path: str) -> list[str]:
    """Repo-relative paths touched in the working tree"""
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return _parse_git_status(result.stdout)


def _parse_git_status(raw_status: str) -> list[str]:
    paths: list[str] = []
    for line in raw_status.splitlines():
        line = _strip_status_prefix(line)
        line = _parse_rename(line)
        paths.append(line)
    return paths


def _strip_status_prefix(line: str) -> str:
    """Drop the porcelain status prefix (two-char code and a space) before the path."""
    status_prefix_length = 3
    return line[status_prefix_length:].strip()


def _parse_rename(line: str) -> str:
    git_rename_separator = " -> "
    if git_rename_separator not in line:
        return line
    return line.split(git_rename_separator, 1)[1]
