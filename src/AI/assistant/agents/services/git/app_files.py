"""The files of the app as they are on disk, or as they were at a commit.

A check that reads the app through `AppFiles` operates the same on the two.
Thus `verify_changes` can do the check at the start commit of the session
and find the old errors.
"""

from __future__ import annotations

import subprocess
from pathlib import Path, PurePosixPath
from typing import Protocol

# App files can start with a UTF-8 BOM.
APP_FILE_ENCODING = "utf-8-sig"


class AppFiles(Protocol):
    def read_text(self, path: str) -> str | None:
        """The text of the file at `path`, or None if there is no such text file. `path` is relative to the repo."""
        ...

    def list_dir(self, directory: str) -> list[str]:
        """The paths of the entries in `directory`, sorted and relative to the repo. Empty if there is no directory."""
        ...


class WorkingTreeFiles:
    """The files on disk"""

    def __init__(self, repo: Path):
        self._repo = repo

    def read_text(self, path: str) -> str | None:
        try:
            return (self._repo / path).read_text(encoding=APP_FILE_ENCODING)
        except OSError, UnicodeDecodeError:
            return None

    def list_dir(self, directory: str) -> list[str]:
        root = self._repo / directory
        if not root.is_dir():
            return []
        return sorted((PurePosixPath(directory) / entry.name).as_posix() for entry in root.iterdir())


class CommitFiles:
    """The files at `commit`"""

    def __init__(self, repo: Path, commit: str):
        self._repo = repo
        self._commit = commit

    def read_text(self, path: str) -> str | None:
        result = self._git("cat-file", "blob", f"{self._commit}:{path}")
        if result.returncode != 0:
            return None
        try:
            return result.stdout.decode(APP_FILE_ENCODING)
        except UnicodeDecodeError:
            return None

    def list_dir(self, directory: str) -> list[str]:
        result = self._git("ls-tree", "-z", "--name-only", self._commit, "--", f"{directory.rstrip('/')}/")
        if result.returncode != 0:
            return []
        return sorted(path for path in result.stdout.decode().split("\0") if path)

    def _git(self, *args: str) -> subprocess.CompletedProcess[bytes]:
        return subprocess.run(["git", *args], cwd=self._repo, capture_output=True)
