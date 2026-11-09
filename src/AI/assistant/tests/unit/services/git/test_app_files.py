"""Reading the app's files on disk and at a commit."""

from __future__ import annotations

from pathlib import Path

from agents.services.git.app_files import CommitFiles, WorkingTreeFiles

from ...core.git_repo import create_committed_repo, git, write_files

TEXTS = "App/config/texts"


def _repo_with_a_changed_texts_folder(repo: Path) -> str:
    """nb and en at the commit. On disk, en is gone and nn is new."""
    create_committed_repo(repo, {f"{TEXTS}/resource.nb.json": "nb", f"{TEXTS}/resource.en.json": "en"})
    (repo / f"{TEXTS}/resource.en.json").unlink()
    write_files(repo, {f"{TEXTS}/resource.nn.json": "nn"})
    return git(repo, "rev-parse", "HEAD")


def test_the_commit_has_the_files_as_they_were(tmp_path: Path):
    files = CommitFiles(tmp_path, _repo_with_a_changed_texts_folder(tmp_path))

    assert files.list_dir(TEXTS) == [f"{TEXTS}/resource.en.json", f"{TEXTS}/resource.nb.json"]
    assert files.read_text(f"{TEXTS}/resource.en.json") == "en"
    assert files.read_text(f"{TEXTS}/resource.nn.json") is None
    assert files.list_dir("App/ui") == []


def test_the_working_tree_has_the_files_as_they_are(tmp_path: Path):
    _repo_with_a_changed_texts_folder(tmp_path)
    files = WorkingTreeFiles(tmp_path)

    assert files.list_dir(TEXTS) == [f"{TEXTS}/resource.nb.json", f"{TEXTS}/resource.nn.json"]
    assert files.read_text(f"{TEXTS}/resource.nn.json") == "nn"
    assert files.read_text(f"{TEXTS}/resource.en.json") is None
    assert files.list_dir("App/ui") == []
