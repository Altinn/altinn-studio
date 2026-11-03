"""Tests for the parts of the runner client that do not depend on how the app goes to the sandbox."""

from __future__ import annotations

import io
import json
import os
import tarfile
from pathlib import Path

import pytest

from agents.core import runner as runner_module
from agents.core.runner import (
    AppTooLarge,
    RunnerUnavailable,
    RunSource,
    archive_app_files,
    create_runner,
    list_app_files,
    read_run_source,
    to_run_result,
)
from agents.core.runner_operator import CoreOperatorClient
from shared.config.base_config import BaseConfig

from .git_repo import create_committed_repo, git, head_commit, write_files

_METADATA_FILE = "App/config/applicationmetadata.json"


def _metadata(app_id: object) -> str:
    return json.dumps({"id": app_id, "org": "ignored"})


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

    def test_refuses_an_app_that_is_larger_than_the_operator_accepts(self, tmp_path: Path, monkeypatch):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        write_files(repo, {"App/wwwroot/big.bin": os.urandom(4096).hex()})
        monkeypatch.setattr(runner_module, "MAX_ARCHIVE_BYTES", 2048)

        with pytest.raises(AppTooLarge, match="MiB as an archive"):
            archive_app_files(str(repo))


class TestReadRunSource:
    def test_is_for_the_head_commit_and_the_id_of_the_app(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {_METADATA_FILE: _metadata("ttd/my-app")})

        source = read_run_source(str(repo), "developer", "copy-of-my-app")

        assert source == RunSource(
            org="ttd", app="my-app", repo_owner="developer", repo="copy-of-my-app", commit=head_commit(repo)
        )

    def test_reads_the_id_of_the_app_at_the_commit(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {_METADATA_FILE: _metadata("ttd/my-app")})
        write_files(repo, {_METADATA_FILE: _metadata("other/app")})

        assert read_run_source(str(repo), "ttd", "my-app").org == "ttd"

    @pytest.mark.parametrize("app_id", ["ttd", "ttd/my-app/extra", "ttd/-app", "ttd/my app", 42, None])
    def test_is_for_the_repository_when_the_app_has_no_valid_id(self, tmp_path: Path, app_id: object):
        repo = create_committed_repo(tmp_path, {_METADATA_FILE: _metadata(app_id)})

        source = read_run_source(str(repo), "developer", "my-app")

        assert (source.org, source.app) == ("developer", "my-app")

    def test_is_for_the_repository_when_the_app_has_no_metadata(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})

        source = read_run_source(str(repo), "ttd", "my-app")

        assert (source.org, source.app) == ("ttd", "my-app")

    def test_does_not_follow_a_symbolic_link_out_of_the_repository(self, tmp_path: Path):
        outside = tmp_path / "outside.json"
        outside.write_text(_metadata("secret/file"), encoding="utf-8")
        repo = create_committed_repo(tmp_path / "app", {"App/App.csproj": "<Project />"})
        (repo / "App/config").mkdir()
        os.symlink(outside, repo / _METADATA_FILE)
        git(repo, "add", "-A")
        git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "link")

        source = read_run_source(str(repo), "ttd", "my-app")

        assert (source.org, source.app) == ("ttd", "my-app")

    @pytest.mark.parametrize(("repo_owner", "repo"), [("", "my-app"), ("ttd", "")])
    def test_is_unavailable_when_the_session_does_not_know_the_repository(
        self, tmp_path: Path, repo_owner: str, repo: str
    ):
        app = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})

        with pytest.raises(RunnerUnavailable, match="does not know the repository"):
            read_run_source(str(app), repo_owner, repo)

    def test_is_unavailable_when_the_repository_has_no_commit(self, tmp_path: Path):
        git(tmp_path, "init")

        with pytest.raises(RunnerUnavailable, match="has no commit"):
            read_run_source(str(tmp_path), "ttd", "my-app")


class TestToRunResult:
    def test_decodes_the_patch_and_keeps_the_exit_code(self):
        result = to_run_result(
            {
                "exitCode": 3,
                "timedOut": False,
                "stdout": "",
                "stderr": "",
                "report": {"exitCode": 3},
                "patch": "ZGlmZgo=",
            },
            run_timeout_seconds=660,
        )

        assert result.exit_code == 3
        assert result.report == {"exitCode": 3}
        assert result.patch == b"diff\n"
        assert not result.timed_out

    def test_has_no_exit_code_and_no_patch_when_the_command_timed_out(self):
        result = to_run_result(
            {"exitCode": None, "timedOut": True, "stdout": "so far", "stderr": "", "report": None, "patch": None},
            run_timeout_seconds=660,
        )

        assert result.timed_out
        assert result.run_timeout_seconds == 660
        assert result.patch == b""
        assert result.stdout == "so far"


class TestCreateRunner:
    def test_creates_an_operator_runner_when_the_operator_url_is_set(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "CORE_OPERATOR_URL", "http://core-operator.core-operator:8080")

        assert isinstance(create_runner(), CoreOperatorClient)

    def test_has_no_runner_without_an_operator_url(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "CORE_OPERATOR_URL", "")

        assert create_runner() is None
