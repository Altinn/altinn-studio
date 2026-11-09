"""The commit a session starts from, which `verify_changes` compares with."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from agents.services.git.git_ops import head_commit
from agents.services.git.repo_manager import RepoManager


def _commit(repo: Path, file_name: str) -> str:
    (repo / file_name).write_text(file_name, encoding="utf-8")
    for args in (
        ("add", "-A"),
        ("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", file_name),
    ):
        subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)
    commit = head_commit(str(repo))
    assert commit
    return commit


@pytest.fixture
def origin(tmp_path: Path) -> Path:
    origin = tmp_path / "origin"
    origin.mkdir()
    subprocess.run(["git", "init"], cwd=origin, check=True, capture_output=True)
    _commit(origin, "first.txt")
    return origin


@pytest.fixture
def manager(tmp_path: Path, origin: Path, monkeypatch) -> RepoManager:
    manager = RepoManager()
    manager.temp_dir = tmp_path / "clones"
    manager.temp_dir.mkdir()
    monkeypatch.setattr(manager, "_apply_base_url", lambda repo_url: str(origin))
    return manager


def test_records_the_commit_the_clone_starts_on(manager: RepoManager, origin: Path):
    manager.clone_repo_for_session("http://gitea/ttd/app.git", "session-1", api_key="key")

    assert manager.get_session_start_commit("session-1") == head_commit(str(origin))


def test_keeps_the_start_commit_when_a_later_start_reuses_the_clone(manager: RepoManager, origin: Path):
    start_commit = head_commit(str(origin))
    repo = manager.clone_repo_for_session("http://gitea/ttd/app.git", "session-1", api_key="key")
    _commit(repo, "the-sessions-change.txt")

    manager.clone_repo_for_session("http://gitea/ttd/app.git", "session-1", api_key="key")

    assert manager.get_session_start_commit("session-1") == start_commit


def test_forgets_the_start_commit_with_the_session(manager: RepoManager):
    manager.clone_repo_for_session("http://gitea/ttd/app.git", "session-1", api_key="key")

    manager.cleanup_session("session-1")

    assert manager.get_session_start_commit("session-1") is None
