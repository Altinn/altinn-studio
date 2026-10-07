"""Real git repositories in a temporary folder, for tests that depend on git behavior."""

from __future__ import annotations

import subprocess
from pathlib import Path


def write_files(repo: Path, files: dict[str, str]) -> None:
    for relative_path, content in files.items():
        file_path = repo / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


def create_committed_repo(repo: Path, files: dict[str, str]) -> Path:
    write_files(repo, files)
    git(repo, "init")
    git(repo, "config", "core.autocrlf", "false")
    git(repo, "add", "-A")
    git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "initial")
    return repo
