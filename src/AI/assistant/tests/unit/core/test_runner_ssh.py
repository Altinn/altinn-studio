"""Tests for `SshRunner`.  These tests run without a VM: `httpx.MockTransport` answers in place of the runner, and a
fake VM stands in for ssh and rsync.  The ProxyCommand script runs against a local socket server."""

from __future__ import annotations

import asyncio
import socket
import stat
import subprocess
import sys
import threading
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest

from agents.core import runner, runner_ssh
from agents.core.runner import RunnerUnavailable, RunResult
from agents.core.runner_ssh import SshRunner, _count_copied_bytes, _make_patch, _read_limited, _Vm
from shared.config.base_config import BaseConfig

from .git_repo import create_committed_repo, write_files

_RUNNER_URL = "http://assistant-runner"
_VM_URL = "http://10.0.0.7:8080/api/v1/vms/abc"
_CREATED = {
    "url": _VM_URL,
    "lifetimeSeconds": 780,
    "id": "abc",
    "hostKey": "ssh-ed25519 AAAA host",
    "clientKey": "PRIVATE KEY\n",
    "user": "app-build",
}
_PROXY_SCRIPT = Path(runner_ssh.__file__).with_name("ssh_proxy.py")


@dataclass
class _FakeVm:
    """Records what the runner asks the VM to do."""

    result: RunResult = field(default_factory=lambda: RunResult(exit_code=0, stdout="{}", stderr=""))
    patch: bytes = b"diff\n"
    calls: list[str] = field(default_factory=list)

    async def copy_app_in(self, repo_path: str) -> None:
        self.calls.append("copy in")

    async def run(self, script: str, timeout_seconds: int, max_stdout_bytes: int) -> RunResult:
        self.calls.append("run studioctl" if "studioctl" in script else "run dotnet build")
        return self.result

    async def copy_changes_back(self, repo_path: str) -> bytes:
        self.calls.append("copy back")
        return self.patch


class _FakeServer:
    def __init__(self, answers: list[httpx.Response]) -> None:
        self.answers = answers
        self.requests: list[httpx.Request] = []

    def create_client(self, timeout_seconds: int) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self._handle))

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.answers.pop(0)


@pytest.fixture
def vm(monkeypatch) -> _FakeVm:
    fake = _FakeVm()
    monkeypatch.setattr(runner_ssh._Vm, "from_answer", classmethod(lambda cls, answer, keys_folder: fake))
    monkeypatch.setattr(runner, "_RETRY_DELAY_SECONDS", 0)
    return fake


def _serve(monkeypatch, answers: list[httpx.Response]) -> _FakeServer:
    server = _FakeServer(answers)
    monkeypatch.setattr(runner_ssh, "_create_client", server.create_client)
    return server


def _requests(server: _FakeServer) -> list[str]:
    return [f"{request.method} {request.url}" for request in server.requests]


class TestSshRunner:
    async def test_upgrades_in_a_new_vm_and_deletes_it(self, monkeypatch, vm: _FakeVm, tmp_path: Path):
        server = _serve(monkeypatch, [httpx.Response(201, json=_CREATED), httpx.Response(204)])

        result = await SshRunner(_RUNNER_URL).upgrade(str(tmp_path), lambda: None)

        assert result == RunResult(exit_code=0, stdout="{}", stderr="", patch=b"diff\n")
        assert vm.calls == ["copy in", "run studioctl", "copy back"]
        assert _requests(server) == [f"POST {_RUNNER_URL}/api/v1/vms", f"DELETE {_VM_URL}"]

    async def test_builds_without_copying_back(self, monkeypatch, vm: _FakeVm, tmp_path: Path):
        _serve(monkeypatch, [httpx.Response(201, json=_CREATED), httpx.Response(204)])

        await SshRunner(_RUNNER_URL).build(str(tmp_path), lambda: None)

        assert vm.calls == ["copy in", "run dotnet build"]

    async def test_has_no_patch_when_the_upgrade_timed_out(self, monkeypatch, vm: _FakeVm, tmp_path: Path):
        _serve(monkeypatch, [httpx.Response(201, json=_CREATED), httpx.Response(204)])
        vm.result = RunResult(exit_code=None, stdout="", stderr="")

        result = await SshRunner(_RUNNER_URL).upgrade(str(tmp_path), lambda: None)

        assert result.timed_out
        assert "copy back" not in vm.calls

    async def test_deletes_the_vm_when_the_job_fails(self, monkeypatch, vm: _FakeVm, tmp_path: Path):
        server = _serve(monkeypatch, [httpx.Response(201, json=_CREATED), httpx.Response(204)])

        async def fail(repo_path: str) -> None:
            raise RunnerUnavailable("rsync to the runner VM failed")

        vm.copy_app_in = fail

        with pytest.raises(RunnerUnavailable):
            await SshRunner(_RUNNER_URL).upgrade(str(tmp_path), lambda: None)

        assert _requests(server)[-1] == f"DELETE {_VM_URL}"

    async def test_waits_while_the_runner_is_busy(self, monkeypatch, vm: _FakeVm, tmp_path: Path):
        server = _serve(monkeypatch, [httpx.Response(503), httpx.Response(201, json=_CREATED), httpx.Response(204)])
        waits: list[str] = []

        await SshRunner(_RUNNER_URL).build(str(tmp_path), lambda: waits.append("wait"))

        assert waits == ["wait"]
        assert len(server.requests) == 3

    async def test_is_unavailable_when_the_vm_does_not_start(self, monkeypatch, vm: _FakeVm, tmp_path: Path):
        _serve(monkeypatch, [httpx.Response(500, text="sshd did not start")])

        with pytest.raises(RunnerUnavailable, match="the assistant runner answered 500: sshd did not start"):
            await SshRunner(_RUNNER_URL).build(str(tmp_path), lambda: None)

        assert vm.calls == []


class TestVm:
    def test_trusts_only_the_host_key_of_the_vm_and_reaches_it_through_the_relay(self, tmp_path: Path):
        vm = _Vm.from_answer(_CREATED, tmp_path)

        assert (tmp_path / "known_hosts").read_text() == "runner-vm ssh-ed25519 AAAA host\n"
        assert (tmp_path / "client_key").read_text() == "PRIVATE KEY\n"
        assert stat.S_IMODE((tmp_path / "client_key").stat().st_mode) == 0o600
        assert vm.destination == "app-build@runner-vm"
        assert "StrictHostKeyChecking=yes" in vm.ssh_command
        assert any(
            option.startswith("ProxyCommand=") and option.endswith(f"{_VM_URL}/ssh") for option in vm.ssh_command
        )


class TestMakePatch:
    def test_makes_the_patch_of_a_changed_copy_without_changing_the_repo(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path / "repo", {"App/App.csproj": "v8", "App/Old.cs": "old"})
        copy = tmp_path / "copy"
        write_files(copy, {"App/App.csproj": "v9", "App/New.cs": "new"})

        patch = _make_patch(str(repo), str(copy))

        assert b"+v9" in patch and b"App/New.cs" in patch and b"deleted file mode" in patch
        subprocess.run(["git", "apply", "--check", "-"], cwd=repo, input=patch, check=True)
        assert subprocess.run(["git", "status", "--porcelain"], cwd=repo, capture_output=True).stdout == b""


async def _stream(data: bytes) -> asyncio.StreamReader:
    reader = asyncio.StreamReader()
    reader.feed_data(data)
    reader.feed_eof()
    return reader


async def test_keeps_the_start_of_long_output_and_marks_the_cut():
    assert await _read_limited(await _stream(b"short"), 10) == "short"
    assert (
        await _read_limited(await _stream(b"0123456789abc"), 10) == "0123456789\n[The assistant cut the output here.]"
    )


async def test_stops_when_rsync_copies_too_many_bytes():
    assert await _count_copied_bytes(await _stream(b"4096\n10\n"), 5000)
    assert not await _count_copied_bytes(await _stream(b"4096\n4096\n"), 5000)


class TestSshProxy:
    def test_upgrades_the_connection_and_copies_bytes_both_ways(self):
        server, port = _relay_server(b"HTTP/1.1 101 Switching Protocols\r\nUpgrade: ssh\r\n\r\nSSH-2.0-guest\r\n")

        proxy = subprocess.run(
            [sys.executable, "-I", str(_PROXY_SCRIPT), f"http://127.0.0.1:{port}/api/v1/vms/abc/ssh"],
            input=b"SSH-2.0-client\r\n",
            capture_output=True,
            timeout=10,
        )

        assert proxy.returncode == 0
        assert proxy.stdout == b"SSH-2.0-guest\r\nSSH-2.0-client\r\n"
        assert server.request.startswith(b"GET /api/v1/vms/abc/ssh HTTP/1.1\r\n")
        assert b"Upgrade: ssh\r\n" in server.request

    def test_fails_when_the_runner_refuses_the_relay(self):
        _, port = _relay_server(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n")

        proxy = subprocess.run(
            [sys.executable, "-I", str(_PROXY_SCRIPT), f"http://127.0.0.1:{port}/api/v1/vms/abc/ssh"],
            capture_output=True,
            timeout=10,
        )

        assert proxy.returncode == 1
        assert b"HTTP/1.1 404 Not Found" in proxy.stderr


class _Relay(threading.Thread):
    """Answers one request with `answer`, then echoes what the client sends."""

    def __init__(self, listener: socket.socket, answer: bytes) -> None:
        super().__init__(daemon=True)
        self.listener = listener
        self.answer = answer
        self.request = b""

    def run(self) -> None:
        connection, _ = self.listener.accept()
        with connection:
            while not self.request.endswith(b"\r\n\r\n"):
                self.request += connection.recv(1)
            connection.sendall(self.answer)
            while data := connection.recv(1024):
                connection.sendall(data)


def _relay_server(answer: bytes) -> tuple[_Relay, int]:
    listener = socket.create_server(("127.0.0.1", 0))
    relay = _Relay(listener, answer)
    relay.start()
    return relay, listener.getsockname()[1]


class TestCreateRunner:
    def test_uses_the_configured_runner_url(self, monkeypatch):
        monkeypatch.setattr(BaseConfig, "ASSISTANT_RUNNER_URL", _RUNNER_URL)

        assert isinstance(runner.create_runner(), SshRunner)
