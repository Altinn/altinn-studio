"""Runs app code for this service in a sandbox, through the core operator (`src/core/operator`).

A run executes the command of a kind, such as the v9 upgrade, in a microVM without the secrets of this service,
because the command can run code from the app.  The tools use the `Runner` protocol so that they do not depend on how
this service sends the app to the sandbox.

A run is for a commit of the app, and the sandbox gets the files of the working tree.  So a tool starts a run only on
a clean working tree, where the files are those of the commit.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import subprocess
import tarfile
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol

from shared.config.base_config import get_config

# The core operator refuses a larger archive.
MAX_ARCHIVE_BYTES = 50 * 1024 * 1024

_GIT_LIST_APP_FILES = ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"]
_GIT_HEAD_COMMIT = ["git", "rev-parse", "--verify", "HEAD"]

# The app's id `org/app` is in this file.
_APP_METADATA_FILE = "App/config/applicationmetadata.json"
# The names and the commit that the core operator accepts in the source of a run.
_SOURCE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}")
_COMMIT = re.compile(r"[0-9a-f]{40}|[0-9a-f]{64}")


@dataclass(frozen=True)
class RunResult:
    """The result of a run.  `exit_code` is None when the command did not finish in the `run_timeout_seconds` of its
    kind.  `report` is the JSON object that the command wrote, such as the report of `studioctl app upgrade v9 --json`,
    or None when it wrote none.  `patch` has the changes that the command made, as `git diff --binary` output.  The job
    host refused symbolic links, submodules, CI workflows and git attribute files, but app code made the patch, so
    apply it with `git apply`."""

    exit_code: int | None
    stdout: str
    stderr: str
    run_timeout_seconds: int
    patch: bytes = b""
    report: dict[str, Any] | None = None

    @property
    def timed_out(self) -> bool:
        return self.exit_code is None


@dataclass(frozen=True)
class RunSource:
    """What a run is for.  `org` and `app` are the app's id `org/app`.  `repo_owner` and `repo` name the repository in
    Gitea, whose owner can differ from the org, such as for a developer's own copy of the app.  `commit` is the commit
    that the sandbox gets.  A run that is in progress for the same kind and source is not started twice."""

    org: str
    app: str
    repo_owner: str
    repo: str
    commit: str


class RunnerProgress(StrEnum):
    """What a run waits for.  The runner reports each state at most once."""

    # The run waits for a sandbox, or the sandbox starts.
    WAITING = "waiting"
    # The sandbox is ready.  It gets the app and runs the command.
    RUNNING = "running"


class RunnerUnavailable(Exception):
    """The runner is not configured, does not start, does not answer, or refuses the run."""


class AppTooLarge(Exception):
    """The app is larger than the runner accepts."""


class RunCancelled(Exception):
    """The run stopped because the session or the tool call was cancelled."""


class Runner(Protocol):
    async def run(
        self,
        kind: str,
        source: RunSource,
        repo_path: str,
        report_progress: Callable[[RunnerProgress], None],
        is_cancelled: Callable[[], bool],
    ) -> RunResult:
        """Run the command of `kind` on a copy of the app at `repo_path`, whose files are those of `source`.  The runner
        stops the run when `is_cancelled` returns True.  Raises `RunnerUnavailable`, `AppTooLarge` and
        `RunCancelled`."""
        ...


def create_runner() -> Runner | None:
    """Returns None when this deployment has no runner, for example in local development."""
    from agents.core.runner_operator import OperatorRunner

    config = get_config()
    if not config.CORE_OPERATOR_URL:
        return None
    return OperatorRunner(config.CORE_OPERATOR_URL, config.CORE_OPERATOR_TOKEN_PATH)


def read_run_source(repo_path: str, repo_owner: str, repo: str) -> RunSource:
    """Returns the source of a run of the app at its HEAD commit, from the Gitea repository `repo_owner/repo`.  The org
    and the app are the id in the app's metadata at that commit.  Without a valid id, they are the owner and the name
    of the repository.  Raises `RunnerUnavailable` when the session does not know the repository, or the repository
    has no commit."""
    if not repo_owner or not repo:
        raise RunnerUnavailable("the session does not know the repository of the app")
    head = subprocess.run(_GIT_HEAD_COMMIT, cwd=repo_path, capture_output=True, text=True)
    commit = head.stdout.strip()
    if head.returncode != 0 or not _COMMIT.fullmatch(commit):
        raise RunnerUnavailable("the repository of the app has no commit")
    org, app = _app_id(repo_path, commit) or (repo_owner, repo)
    return RunSource(org=org, app=app, repo_owner=repo_owner, repo=repo, commit=commit)


def _app_id(repo_path: str, commit: str) -> tuple[str, str] | None:
    """Returns the org and the app of the id in the app's metadata, or None when the metadata has no valid id.  It
    reads the file from git, so that a symbolic link in the app cannot point it at a file outside the repository."""
    shown = subprocess.run(["git", "show", f"{commit}:{_APP_METADATA_FILE}"], cwd=repo_path, capture_output=True)
    if shown.returncode != 0:
        return None
    try:
        metadata = json.loads(shown.stdout)
    except ValueError:
        return None
    app_id = metadata.get("id") if isinstance(metadata, dict) else None
    names = app_id.split("/") if isinstance(app_id, str) else []
    if len(names) != 2 or not all(_SOURCE_NAME.fullmatch(name) for name in names):
        return None
    return names[0], names[1]


def list_app_files(repo_path: str) -> list[str]:
    """Returns the files that a run receives, as they are on disk.  These are the files that git tracks and the new
    files that git does not ignore.  A tracked file that the model deleted is not in the list."""
    listed = subprocess.run(_GIT_LIST_APP_FILES, cwd=repo_path, capture_output=True, check=True)
    paths = listed.stdout.decode().split("\0")
    return [path for path in paths if path and os.path.lexists(os.path.join(repo_path, path))]


def archive_app_files(repo_path: str) -> bytes:
    """Returns a tar.gz of the app files, without `.git`.  The archive keeps symbolic links as links.  Raises
    `AppTooLarge` when the archive is larger than `MAX_ARCHIVE_BYTES`."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path in list_app_files(repo_path):
            archive.add(os.path.join(repo_path, path), arcname=path, recursive=False)
    archived = buffer.getvalue()
    if len(archived) > MAX_ARCHIVE_BYTES:
        raise AppTooLarge(f"the app is {_mebibytes(len(archived))} MiB as an archive")
    return archived


def to_run_result(answer: dict[str, Any], run_timeout_seconds: int) -> RunResult:
    """Returns the result of a run as a `RunResult`.  The patch in the result is base64."""
    patch = base64.b64decode(answer["patch"]) if answer["patch"] else b""
    exit_code = None if answer["timedOut"] else answer["exitCode"]
    return RunResult(
        exit_code=exit_code,
        stdout=answer["stdout"],
        stderr=answer["stderr"],
        run_timeout_seconds=run_timeout_seconds,
        patch=patch,
        report=answer["report"],
    )


def _mebibytes(size: int) -> int:
    return -(-size // (1024 * 1024))
