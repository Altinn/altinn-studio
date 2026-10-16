"""The assistant runner (`src/AI/assistant-runner`) runs app code for this service.

MSBuild runs code from the app, so the v9 upgrade and `dotnet build` run in a microVM without the secrets of this
service.  The tools use the `Runner` protocol, so they do not depend on how the app gets to the runner.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Protocol

import httpx

from shared.config.base_config import get_config

# The app folder in the VM.  Paths in the output of a job start with it.
JOB_APP_FOLDER = "/job/app/"

# A busy runner answers 503 at once, and does not queue the request.
_BUSY_STATUS = 503
_RETRY_DELAY_SECONDS = 2
_QUEUE_TIMEOUT_MINUTES = 15

_GIT_LIST_APP_FILES = ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"]


@dataclass(frozen=True)
class RunResult:
    """The result of a job.  `exit_code` is None when the command did not finish in time.  `patch` has the changes
    that an upgrade made, as `git diff --binary` output.  App code made the patch, so check it before you apply it."""

    exit_code: int | None
    stdout: str
    stderr: str
    patch: bytes = b""

    @property
    def timed_out(self) -> bool:
        return self.exit_code is None


class RunnerUnavailable(Exception):
    """The runner is not configured, does not answer, or refuses the app."""


class Runner(Protocol):
    """`report_wait` tells the user that the job waits for a free runner."""

    async def upgrade(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        """Run `studioctl app upgrade v9` on a copy of the app.  Raises `RunnerUnavailable`."""
        ...

    async def build(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        """Run `dotnet build` on a copy of the app, with the changes that are not committed.  Raises
        `RunnerUnavailable`."""
        ...


def create_runner() -> Runner | None:
    """Returns None when this deployment has no runner, for example in local development."""
    from agents.core.runner_ssh import SshRunner

    runner_url = get_config().ASSISTANT_RUNNER_URL
    return SshRunner(runner_url) if runner_url else None


def list_app_files(repo_path: str) -> list[str]:
    """The files that a job gets: the files that git tracks and the new files that git does not ignore, as they are on
    disk.  A tracked file that the model deleted is not in the list."""
    listed = subprocess.run(_GIT_LIST_APP_FILES, cwd=repo_path, capture_output=True, check=True)
    paths = listed.stdout.decode().split("\0")
    return [path for path in paths if path and os.path.lexists(os.path.join(repo_path, path))]


def to_app_paths(output: str) -> str:
    """Paths in the output of a job, relative to the app."""
    return output.replace(JOB_APP_FOLDER, "")


async def call_until_not_busy(
    call: Callable[[], Awaitable[httpx.Response]], report_wait: Callable[[], None]
) -> httpx.Response:
    """Calls the runner again while it is busy, and reports the wait once."""
    deadline = time.monotonic() + _QUEUE_TIMEOUT_MINUTES * 60
    response = await call()
    if response.status_code == _BUSY_STATUS:
        report_wait()
    while response.status_code == _BUSY_STATUS:
        if time.monotonic() > deadline:
            raise RunnerUnavailable(f"the assistant runner was busy for {_QUEUE_TIMEOUT_MINUTES} minutes")
        await asyncio.sleep(_RETRY_DELAY_SECONDS)
        response = await call()
    return response
