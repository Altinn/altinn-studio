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


class TestALaterTurnOfTheSession:
    """Each turn gets a new clone. Thus the model cannot read an edit that the
    user does not have, and tell the user that it is in the app."""

    def _later_turn(self, manager: RepoManager, branch: str | None = None) -> Path:
        return manager.clone_repo_for_session(_URL, "session-1", branch, api_key="key")

    def test_drops_an_edit_that_is_not_committed(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        write_files(repo, {"first.txt": "edited", "new/file.txt": "new"})

        repo = self._later_turn(manager)

        assert (repo / "first.txt").read_text(encoding="utf-8") == "first"
        assert not (repo / "new").exists()

    def test_drops_a_commit_that_is_not_pushed(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        _commit_on_branch(repo, "assistant_session-1")

        repo = self._later_turn(manager)

        assert not (repo / "the-sessions-change.txt").exists()
        assert git(repo, "branch", "--list", "assistant_session-1") == ""

    def test_keeps_a_commit_that_is_pushed(self, manager: RepoManager):
        repo = manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        _commit_on_branch(repo, "assistant_session-1")
        manager.push_branch("session-1", "assistant_session-1")
        pushed = git(repo, "rev-parse", "HEAD")

        repo = self._later_turn(manager, "assistant_session-1")

        assert git(repo, "rev-parse", "HEAD") == pushed
        assert (repo / "the-sessions-change.txt").exists()

    def test_gets_a_commit_that_the_user_pushed_from_designer(self, manager: RepoManager, origin: Path):
        manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        write_files(origin, {"from-designer.txt": "the user's change"})
        commit_all(origin, "the user's commit")

        repo = self._later_turn(manager)

        assert (repo / "from-designer.txt").exists()

    def test_records_the_commit_that_its_clone_starts_on(self, manager: RepoManager, origin: Path):
        """`verify_changes` compares the app with this commit. An error that the user pushed is then an old error."""
        manager.clone_repo_for_session(_URL, "session-1", api_key="key")
        write_files(origin, {"from-designer.txt": "the user's change"})
        commit_all(origin, "the user's commit")

        self._later_turn(manager)

        assert manager.get_session_start_commit("session-1") == git(origin, "rev-parse", "HEAD")


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
