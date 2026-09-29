"""RepoManager against real git repositories, with a local bare repository in place of Gitea."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import pytest

from agents.services.git import repo_manager as repo_manager_module
from agents.services.git.repo_manager import RepoManager
from tests.unit.core.git_repo import create_committed_repo, git, write_files

SESSION_ID = "session-1"
REPO_URL = "http://studio.localhost/repos/ttd/my-app.git"
API_KEY = "test-key"
LAYOUT_PATH = "App/ui/layouts/page.json"
ORIGINAL_LAYOUT = "{}"


@pytest.fixture
def origin(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A bare repository at the path that REPO_URL maps to under GITEA_BASE_URL."""
    gitea_root = tmp_path / "gitea"
    work = create_committed_repo(tmp_path / "work", {LAYOUT_PATH: ORIGINAL_LAYOUT})
    bare = gitea_root / "repos" / "ttd" / "my-app.git"
    bare.parent.mkdir(parents=True)
    git(tmp_path, "clone", "--bare", str(work), str(bare))
    monkeypatch.setattr(repo_manager_module.config, "GITEA_BASE_URL", gitea_root.as_uri())
    return bare


@pytest.fixture
def repo_manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> RepoManager:
    temp_root = tmp_path / "tmp"
    temp_root.mkdir()
    monkeypatch.setattr(tempfile, "tempdir", str(temp_root))
    return RepoManager()


def push_commit(origin: Path, workspace: Path, files: dict[str, str], branch: str | None = None) -> None:
    git(workspace.parent, "clone", str(origin), str(workspace))
    write_files(workspace, files)
    git(workspace, "add", "-A")
    git(workspace, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "remote change")
    git(workspace, "push", "origin", f"HEAD:refs/heads/{branch}" if branch else "HEAD")


def clone(repo_manager: RepoManager, branch: str | None = None) -> Path:
    return repo_manager.clone_repo_for_session(REPO_URL, SESSION_ID, branch=branch, api_key=API_KEY)


def current_branch(repo: Path) -> str:
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


class TestCloneRepoForSession:
    def test_clones_the_remote_repository(self, origin: Path, repo_manager: RepoManager):
        repo = clone(repo_manager)

        assert (repo / LAYOUT_PATH).read_text(encoding="utf-8") == ORIGINAL_LAYOUT

    def test_checks_out_the_requested_branch(self, origin: Path, repo_manager: RepoManager, tmp_path: Path):
        push_commit(origin, tmp_path / "designer", {LAYOUT_PATH: '{"on": "feature"}'}, branch="feature")

        repo = clone(repo_manager, branch="feature")

        assert (repo / LAYOUT_PATH).read_text(encoding="utf-8") == '{"on": "feature"}'

    def test_creates_the_requested_branch_when_the_remote_has_none(self, origin: Path, repo_manager: RepoManager):
        repo = clone(repo_manager, branch="assistant_new")

        assert current_branch(repo) == "assistant_new"

    def test_a_second_clone_for_the_session_has_the_latest_remote_commits(
        self, origin: Path, repo_manager: RepoManager, tmp_path: Path
    ):
        clone(repo_manager)
        push_commit(origin, tmp_path / "designer", {LAYOUT_PATH: '{"changed": true}'})

        repo = clone(repo_manager)

        assert (repo / LAYOUT_PATH).read_text(encoding="utf-8") == '{"changed": true}'

    def test_a_second_clone_for_the_session_drops_local_changes(self, origin: Path, repo_manager: RepoManager):
        write_files(clone(repo_manager), {LAYOUT_PATH: "local edit"})

        repo = clone(repo_manager)

        assert (repo / LAYOUT_PATH).read_text(encoding="utf-8") == ORIGINAL_LAYOUT


class TestCleanupSession:
    def test_removes_the_clone(self, origin: Path, repo_manager: RepoManager):
        repo = clone(repo_manager)

        repo_manager.cleanup_session(SESSION_ID)

        assert not repo.exists()

    def test_forgets_the_session(self, origin: Path, repo_manager: RepoManager):
        clone(repo_manager)

        repo_manager.cleanup_session(SESSION_ID)

        assert repo_manager.get_session_repo_path(SESSION_ID) is None
