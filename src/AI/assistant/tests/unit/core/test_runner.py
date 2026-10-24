"""Tests for the parts of the assistant runner client that do not depend on how the app goes to the runner."""

from __future__ import annotations

import io
import os
import tarfile
from pathlib import Path

from agents.core.runner import archive_app_files, create_runner, list_app_files, to_app_paths, to_run_result
from agents.core.runner_k8s import KubernetesJobRunner
from shared.config.base_config import BaseConfig

from .git_repo import create_committed_repo, write_files


class TestListAppFiles:
    def test_lists_tracked_and_new_files_as_they_are_on_disk(self, tmp_path: Path):
        repo = create_committed_repo(
            tmp_path,
            {".gitignore": "bin/\n", "App/App.csproj": "<Project />", "App/Old.cs": "class Old {}"},
        )
        write_files(repo, {"App/New.cs": "class New {}", "App/bin/App.dll": "binary"})
        (repo / "App/Old.cs").unlink()
        os.symlink("App.csproj", repo / "App/Link.csproj")

        assert sorted(list_app_files(str(repo))) == [".gitignore", "App/App.csproj", "App/Link.csproj", "App/New.cs"]


class TestArchiveAppFiles:
    def test_archives_the_app_files_without_git_and_keeps_links(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        os.symlink("App.csproj", repo / "App/Link.csproj")

        with tarfile.open(fileobj=io.BytesIO(archive_app_files(str(repo))), mode="r:gz") as archive:
            members = {member.name: member for member in archive.getmembers()}

        assert sorted(members) == ["App/App.csproj", "App/Link.csproj"]
        assert members["App/Link.csproj"].issym()
        assert members["App/Link.csproj"].linkname == "App.csproj"


class TestToRunResult:
    def test_decodes_the_patch_and_keeps_the_exit_code(self):
        result = to_run_result({"exitCode": 3, "timedOut": False, "stdout": "{}", "stderr": "", "patch": "ZGlmZgo="})

        assert result.exit_code == 3
        assert result.patch == b"diff\n"
        assert not result.timed_out

    def test_has_no_exit_code_and_no_patch_when_the_command_timed_out(self):
        result = to_run_result({"exitCode": None, "timedOut": True, "stdout": "so far", "stderr": "", "patch": None})

        assert result.timed_out
        assert result.patch == b""
        assert result.stdout == "so far"


class TestCreateRunner:
    def test_creates_a_kubernetes_job_runner_for_the_runner_namespace(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "RUNNER_NAMESPACE", "assistant-runners")

        assert isinstance(create_runner(), KubernetesJobRunner)

    def test_has_no_runner_without_a_runner_namespace(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "RUNNER_NAMESPACE", "")

        assert create_runner() is None


def test_makes_job_paths_relative_to_the_app():
    output = "/job/app/App/Program.cs(3,1): error CS1002: ; expected [/job/app/App/App.csproj]"

    assert to_app_paths(output) == "App/Program.cs(3,1): error CS1002: ; expected [App/App.csproj]"
