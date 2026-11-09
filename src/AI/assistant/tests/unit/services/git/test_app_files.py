"""Reading the app's files on disk and at a commit."""

from __future__ import annotations

import subprocess
from pathlib import Path

from agents.services.git.app_files import CommitFiles, WorkingTreeFiles
from agents.services.git.git_ops import head_commit

TEXTS = "App/config/texts"


def _write(repo: Path, path: str, content: str) -> None:
    (repo / path).parent.mkdir(parents=True, exist_ok=True)
    (repo / path).write_text(content, encoding="utf-8")


def _repo_with_a_changed_texts_folder(repo: Path) -> str:
    """nb and en at the commit. On disk, en is gone and nn is new."""
    _write(repo, f"{TEXTS}/resource.nb.json", "nb")
    _write(repo, f"{TEXTS}/resource.en.json", "en")
    for args in (
        ("init",),
        ("add", "-A"),
        ("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "start"),
    ):
        subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)
    (repo / f"{TEXTS}/resource.en.json").unlink()
    _write(repo, f"{TEXTS}/resource.nn.json", "nn")
    commit = head_commit(str(repo))
    assert commit
    return commit


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
