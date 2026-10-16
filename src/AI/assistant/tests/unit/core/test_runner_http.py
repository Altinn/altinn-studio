"""Tests for `HttpRunner`.  `httpx.MockTransport` answers in place of the assistant runner."""

from __future__ import annotations

import base64
import io
import os
import tarfile
from collections.abc import Callable
from pathlib import Path

import httpx
import pytest

from agents.core import runner, runner_http
from agents.core.runner import RunnerUnavailable, RunResult
from agents.core.runner_http import HttpRunner
from shared.config.base_config import BaseConfig

from .git_repo import create_committed_repo, write_files

_RUNNER_URL = "http://assistant-runner"
_PATCH = b"diff --git a/App/App.csproj b/App/App.csproj\n"


def _answer(**fields) -> dict:
    return {"exitCode": 0, "timedOut": False, "stdout": "{}", "stderr": "", "patch": None} | fields


class _FakeServer:
    """Records each request and answers from a list.  An exception in the list is raised instead."""

    def __init__(self, answers: list[httpx.Response | Exception]) -> None:
        self.answers = answers
        self.requests: list[httpx.Request] = []
        self.clients = 0

    def create_client(self, base_url: str, timeout_seconds: int) -> httpx.AsyncClient:
        self.clients += 1
        return httpx.AsyncClient(base_url=base_url, transport=httpx.MockTransport(self._handle))

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


@pytest.fixture
def serve(monkeypatch) -> Callable[[list[httpx.Response | Exception]], _FakeServer]:
    monkeypatch.setattr(runner, "_RETRY_DELAY_SECONDS", 0)

    def start(answers: list[httpx.Response | Exception]) -> _FakeServer:
        server = _FakeServer(answers)
        monkeypatch.setattr(runner_http, "_create_client", server.create_client)
        return server

    return start


def _archived_files(request: httpx.Request) -> dict[str, str]:
    files: dict[str, str] = {}
    with tarfile.open(fileobj=io.BytesIO(request.content), mode="r:gz") as archive:
        for member in archive.getmembers():
            if member.issym():
                files[member.name] = f"-> {member.linkname}"
                continue
            extracted = archive.extractfile(member)
            files[member.name] = extracted.read().decode() if extracted else ""
    return files


async def _upgrade(repo: Path) -> RunResult:
    return await HttpRunner(_RUNNER_URL).upgrade(str(repo), lambda: None)


class TestHttpRunner:
    async def test_sends_the_app_files_and_returns_the_result_with_the_patch(self, serve, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {".gitignore": "bin/\n", "App/App.csproj": "<Project />"})
        write_files(repo, {"App/New.cs": "class New {}", "App/bin/App.dll": "binary"})
        os.symlink("App.csproj", repo / "App/Link.csproj")
        server = serve([httpx.Response(200, json=_answer(patch=base64.b64encode(_PATCH).decode()))])

        result = await _upgrade(repo)

        assert result == RunResult(exit_code=0, stdout="{}", stderr="", patch=_PATCH)
        request = server.requests[0]
        assert request.url.path == "/api/v1/upgrades/v9"
        assert request.headers["Content-Type"] == "application/gzip"
        assert _archived_files(request) == {
            ".gitignore": "bin/\n",
            "App/App.csproj": "<Project />",
            "App/New.cs": "class New {}",
            "App/Link.csproj": "-> App.csproj",
        }

    async def test_builds_the_files_with_the_changes_that_are_not_committed(self, serve, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/Program.cs": "class Program {}"})
        write_files(repo, {"App/Program.cs": "class Program { int x; }"})
        server = serve([httpx.Response(200, json=_answer(exitCode=1, stdout="error CS1002"))])

        result = await HttpRunner(_RUNNER_URL).build(str(repo), lambda: None)

        assert result == RunResult(exit_code=1, stdout="error CS1002", stderr="")
        assert server.requests[0].url.path == "/api/v1/builds"
        assert _archived_files(server.requests[0]) == {"App/Program.cs": "class Program { int x; }"}

    async def test_returns_a_timed_out_result_when_the_command_timed_out(self, serve, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        serve([httpx.Response(200, json=_answer(exitCode=None, timedOut=True, stdout=""))])

        result = await _upgrade(repo)

        assert result.timed_out

    async def test_returns_a_timed_out_result_when_the_runner_does_not_answer_in_time(self, serve, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        serve([httpx.ReadTimeout("timed out")])

        result = await _upgrade(repo)

        assert result.timed_out

    @pytest.mark.parametrize(
        "error",
        [httpx.ConnectError("Connection refused"), httpx.RemoteProtocolError("Server disconnected")],
    )
    async def test_is_unavailable_when_the_runner_does_not_answer(self, serve, tmp_path: Path, error: Exception):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        serve([error])

        with pytest.raises(RunnerUnavailable, match=f"did not answer \\({type(error).__name__}: {error}\\)"):
            await _upgrade(repo)

    async def test_is_unavailable_when_the_runner_refuses_the_app(self, serve, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        serve([httpx.Response(413, text="The archive is larger than 52428800 bytes.")])

        with pytest.raises(RunnerUnavailable, match="the assistant runner answered 413"):
            await _upgrade(repo)

    async def test_tries_again_with_a_new_connection_while_the_runner_is_busy(self, serve, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})
        server = serve([httpx.Response(503), httpx.Response(503), httpx.Response(200, json=_answer())])
        waits: list[str] = []

        result = await HttpRunner(_RUNNER_URL).upgrade(str(repo), lambda: waits.append("wait"))

        assert result.exit_code == 0
        assert server.clients == 3
        assert waits == ["wait"]


class TestCreateRunner:
    def test_uses_the_configured_runner_url(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "ASSISTANT_RUNNER_URL", _RUNNER_URL)

        assert isinstance(runner.create_runner(), HttpRunner)

    def test_has_no_runner_without_a_url(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "ASSISTANT_RUNNER_URL", "")

        assert runner.create_runner() is None
