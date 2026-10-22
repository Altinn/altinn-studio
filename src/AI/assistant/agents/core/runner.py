"""The assistant runner (`src/AI/assistant-runner`) runs app code for this service.

MSBuild runs code from the app, so the v9 upgrade runs in a microVM without the secrets of this service.  The tools use
the `Runner` protocol, so they do not depend on how the app gets to the runner.
"""

from __future__ import annotations

import base64
import io
import os
import subprocess
import tarfile
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol

from shared.config.base_config import get_config

# The app folder in the VM.  Paths in the output of a job start with it.
JOB_APP_FOLDER = "/job/app/"

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


class RunnerProgress(StrEnum):
    """What a run waits for.  The runner reports each state at most once."""

    # No runner can start now, for example because all runner slots are in use.
    WAITING = "waiting"
    # The runner has the app and runs the command.
    RUNNING = "running"


class RunnerUnavailable(Exception):
    """The runner is not configured, does not start, does not answer, or refuses the app."""


class Runner(Protocol):
    async def upgrade(self, repo_path: str, report_progress: Callable[[RunnerProgress], None]) -> RunResult:
        """Run `studioctl app upgrade v9` on a copy of the app.  Raises `RunnerUnavailable`."""
        ...


def create_runner() -> Runner | None:
    """Returns None when this deployment has no runner, for example in local development."""
    from agents.core.runner_k8s import KubernetesJobRunner

    namespace = get_config().RUNNER_NAMESPACE
    return KubernetesJobRunner(namespace) if namespace else None


def list_app_files(repo_path: str) -> list[str]:
    """The files that a job gets: the files that git tracks and the new files that git does not ignore, as they are on
    disk.  A tracked file that the model deleted is not in the list."""
    listed = subprocess.run(_GIT_LIST_APP_FILES, cwd=repo_path, capture_output=True, check=True)
    paths = listed.stdout.decode().split("\0")
    return [path for path in paths if path and os.path.lexists(os.path.join(repo_path, path))]


def archive_app_files(repo_path: str) -> bytes:
    """A tar.gz of the app files, without `.git`.  Symbolic links stay links."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path in list_app_files(repo_path):
            archive.add(os.path.join(repo_path, path), arcname=path, recursive=False)
    return buffer.getvalue()


def to_run_result(answer: dict[str, Any]) -> RunResult:
    """The answer of the job host, as a `RunResult`.  The patch comes as base64."""
    patch = base64.b64decode(answer["patch"]) if answer["patch"] else b""
    exit_code = None if answer["timedOut"] else answer["exitCode"]
    return RunResult(exit_code=exit_code, stdout=answer["stdout"], stderr=answer["stderr"], patch=patch)


def to_app_paths(output: str) -> str:
    """Paths in the output of a job, relative to the app."""
    return output.replace(JOB_APP_FOLDER, "")
