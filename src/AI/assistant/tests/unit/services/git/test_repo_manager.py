"""The clone and the records of a session: the start commit, which `verify_changes` compares the app with, and the
pushed branch."""

from __future__ import annotations

from pathlib import Path

import pytest

from agents.services.git.repo_manager import RepoManager

from ...core.git_repo import commit_all, create_committed_repo, git, write_files

_URL = "http://gitea/ttd/app.git"


@pytest.fixture
def origin(tmp_path: Path) -> Path:
    return create_committed_repo(tmp_path / "origin", {"first.txt": "first"})


@pytest.fixture
def manager(tmp_path: Path, origin: Path, monkeypatch) -> RepoManager:
    manager = RepoManager()
    manager.temp_dir = tmp_path / "clones"
    manager.temp_dir.mkdir()
    monkeypatch.setattr(manager, "_apply_base_url", lambda repo_url: str(origin))
    return manager


def test_records_the_commit_the_clone_starts_on(manager: RepoManager, origin: Path):
    manager.clone_repo_for_session(_URL, "session-1", api_key="key")

    assert manager.get_session_start_commit("session-1") == git(origin, "rev-parse", "HEAD")


def test_keeps_the_start_commit_when_a_later_start_reuses_the_clone(manager: RepoManager, origin: Path):
    repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
    write_files(repo, {"the-sessions-change.txt": "change"})
    commit_all(repo, "the session's commit")

    manager.clone_repo_for_session(_URL, "session-1", api_key="key")

    assert manager.get_session_start_commit("session-1") == git(origin, "rev-parse", "HEAD")


class TestALaterStartOfTheSession:
    """Each turn starts from the saved state. Thus the model cannot read an
    edit that the user does not have, and tell the user that it is in the app."""

    def _later_start(self, manager: RepoManager) -> Path:
        return manager.clone_repo_for_session(_URL, "session-1", api_key="key")

    def test_drops_an_edit_that_is_not_committed(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        write_files(repo, {"first.txt": "edited", "new/file.txt": "new"})

        self._later_start(manager)

        assert (repo / "first.txt").read_text(encoding="utf-8") == "first"
        assert not (repo / "new").exists()
        assert git(repo, "status", "--porcelain") == ""

    def test_drops_a_commit_that_is_not_pushed(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        _commit_on_branch(repo, "assistant_session-1")

        self._later_start(manager)

        assert not (repo / "the-sessions-change.txt").exists()
        assert git(repo, "rev-parse", "HEAD") == manager.get_session_start_commit("session-1")

    def test_keeps_a_commit_that_is_pushed_and_drops_the_commit_after_it(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        _commit_on_branch(repo, "assistant_session-1")
        manager.push_branch("session-1", "assistant_session-1")
        pushed = git(repo, "rev-parse", "HEAD")
        write_files(repo, {"second.txt": "not pushed"})
        commit_all(repo, "a commit with a failed push")
        write_files(repo, {"third.txt": "not committed"})

        self._later_start(manager)

        assert git(repo, "rev-parse", "HEAD") == pushed
        assert (repo / "the-sessions-change.txt").exists()
        assert not (repo / "second.txt").exists()
        assert not (repo / "third.txt").exists()

    def test_keeps_a_file_that_git_ignores(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        write_files(repo, {".git/info/exclude": "bin/\n", "bin/build.dll": "build output"})

        self._later_start(manager)

        assert (repo / "bin/build.dll").exists()


def test_forgets_the_start_commit_with_the_session(manager: RepoManager):
    manager.clone_repo_for_session(_URL, "session-1", api_key="key")

    manager.cleanup_session("session-1")

    assert manager.get_session_start_commit("session-1") is None


def _commit_on_branch(repo: Path, branch: str) -> None:
    git(repo, "checkout", "-b", branch)
    write_files(repo, {"the-sessions-change.txt": "change"})
    commit_all(repo, "the session's commit")


def test_gives_a_pushed_branch_one_time(manager: RepoManager):
    repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
    _commit_on_branch(repo, "assistant_session-1")

    manager.push_branch("session-1", "assistant_session-1")

    assert manager.take_unreported_push("session-1") == "assistant_session-1"
    assert manager.take_unreported_push("session-1") is None


def test_gives_no_branch_when_the_push_fails(manager: RepoManager):
    manager.clone_repo_for_session(_URL, "session-1", api_key="key")

    with pytest.raises(Exception, match="Failed to push"):
        manager.push_branch("session-1", "assistant_session-1")

    assert manager.take_unreported_push("session-1") is None


def test_forgets_the_pushed_branch_with_the_session(manager: RepoManager):
    repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
    _commit_on_branch(repo, "assistant_session-1")
    manager.push_branch("session-1", "assistant_session-1")

    manager.cleanup_session("session-1")

    assert manager.take_unreported_push("session-1") is None
