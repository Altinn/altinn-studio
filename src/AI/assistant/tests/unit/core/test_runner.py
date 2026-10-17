"""Tests for the parts of the assistant runner client that do not depend on how the app gets to the runner."""

from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest

from agents.core import runner
from agents.core.runner import RunnerUnavailable, call_until_not_busy, list_app_files, to_app_paths

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


def test_makes_job_paths_relative_to_the_app():
    output = "/job/app/App/Program.cs(3,1): error CS1002: ; expected [/job/app/App/App.csproj]"

    assert to_app_paths(output) == "App/Program.cs(3,1): error CS1002: ; expected [App/App.csproj]"


class TestCallUntilNotBusy:
    @pytest.fixture(autouse=True)
    def _no_wait_between_tries(self, monkeypatch):
        monkeypatch.setattr(runner, "_RETRY_DELAY_SECONDS", 0)

    async def test_calls_again_while_the_runner_is_busy_and_reports_the_wait_once(self):
        answers = [httpx.Response(503), httpx.Response(503), httpx.Response(200)]
        waits: list[str] = []

        async def call() -> httpx.Response:
            return answers.pop(0)

        response = await call_until_not_busy(call, lambda: waits.append("wait"))

        assert response.status_code == 200
        assert answers == []
        assert waits == ["wait"]

    async def test_does_not_report_a_wait_when_the_runner_is_free(self):
        waits: list[str] = []

        async def call() -> httpx.Response:
            return httpx.Response(200)

        await call_until_not_busy(call, lambda: waits.append("wait"))

        assert waits == []

    async def test_gives_up_when_the_runner_stays_busy(self, monkeypatch):
        monkeypatch.setattr(runner, "_QUEUE_TIMEOUT_MINUTES", 0)

        async def call() -> httpx.Response:
            return httpx.Response(503)

        with pytest.raises(RunnerUnavailable, match="the assistant runner was busy for 0 minutes"):
            await call_until_not_busy(call, lambda: None)
