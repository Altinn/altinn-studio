"""The assistant runner over SSH.

The runner starts a VM with sshd for each job.  The assistant copies the app into the VM with rsync and runs the
command with ssh.  For an upgrade, git makes the patch in the VM, and the assistant reads it with ssh.  Then the
assistant deletes the VM.  The runner also deletes a VM at the end of its lifetime, so a VM that the assistant does not
delete does not stay.
"""

from __future__ import annotations

import asyncio
import logging
import shlex
import subprocess
import sys
import tempfile
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass, replace
from pathlib import Path

import httpx

from agents.core.runner import JOB_APP_FOLDER, RunnerUnavailable, RunResult, call_until_not_busy, list_app_files

log = logging.getLogger(__name__)

_VMS_PATH = "/api/v1/vms"
# The runner starts the VM and sshd before it answers.
_CREATE_TIMEOUT_SECONDS = 2 * 60
_DELETE_TIMEOUT_SECONDS = 70
_CONNECT_TIMEOUT_SECONDS = 10
# studioctl stops an upgrade after 10 minutes, so this limit only stops a studioctl that hangs.
_UPGRADE_TIMEOUT_SECONDS = 11 * 60
_BUILD_TIMEOUT_SECONDS = 5 * 60
_MAX_UPGRADE_STDOUT_BYTES = 8 * 1024 * 1024
_MAX_OUTPUT_BYTES = 1024 * 1024
# App code in the VM controls the patch, so the assistant stops at this size.
_MAX_PATCH_BYTES = 20 * 1024 * 1024
_PATCH_TIMEOUT_SECONDS = 60
_COPY_TIMEOUT_SECONDS = 2 * 60
_SSH_ERROR_EXIT_CODE = 255
_HOST_ALIAS = "runner-vm"
_PROXY_SCRIPT = Path(__file__).with_name("ssh_proxy.py")
_CUT_NOTE = "\n[The assistant cut the output here.]"

# studioctl needs a clean working tree, so the app is committed first.
_UPGRADE_SCRIPT = (
    f"set -eu; cd {JOB_APP_FOLDER}; git init --quiet; git add -A; "
    "git commit --quiet --no-verify --allow-empty --message base; "
    "exec studioctl app upgrade v9 -p . --json"
)
_BUILD_SCRIPT = f"cd {JOB_APP_FOLDER} && exec dotnet build App/App.csproj -nologo -v:q --disable-build-servers"
# The patch also has the changes that studioctl did not stage.
_PATCH_SCRIPT = f"set -eu; cd {JOB_APP_FOLDER}; git add -A; exec git diff --cached --binary"


class SshRunner:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url

    async def upgrade(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        async with self._vm(report_wait) as vm:
            await vm.copy_app_in(repo_path)
            run = await vm.run(_UPGRADE_SCRIPT, _UPGRADE_TIMEOUT_SECONDS, _MAX_UPGRADE_STDOUT_BYTES)
            if run.timed_out:
                return run
            return replace(run, patch=await vm.read_patch())

    async def build(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        async with self._vm(report_wait) as vm:
            await vm.copy_app_in(repo_path)
            return await vm.run(_BUILD_SCRIPT, _BUILD_TIMEOUT_SECONDS, _MAX_OUTPUT_BYTES)

    @asynccontextmanager
    async def _vm(self, report_wait: Callable[[], None]) -> AsyncIterator[_Vm]:
        created = await self._create_vm(report_wait)
        try:
            with tempfile.TemporaryDirectory() as keys_folder:
                yield _Vm.from_answer(created, Path(keys_folder))
        finally:
            await self._delete_vm(created["url"])

    async def _create_vm(self, report_wait: Callable[[], None]) -> dict:
        response = await call_until_not_busy(self._post_vm, report_wait)
        if response.status_code != httpx.codes.CREATED:
            raise RunnerUnavailable(f"the assistant runner answered {response.status_code}: {response.text}")
        return response.json()

    async def _post_vm(self) -> httpx.Response:
        """Each try opens a new connection, because the Service sends a new connection to a random runner pod, and
        a kept connection goes to the same busy pod."""
        try:
            async with _create_client(_CREATE_TIMEOUT_SECONDS) as client:
                return await client.post(f"{self._base_url}{_VMS_PATH}")
        except httpx.HTTPError as error:
            raise RunnerUnavailable(f"the assistant runner did not answer ({type(error).__name__}: {error})") from error

    async def _delete_vm(self, url: str) -> None:
        """The runner deletes the VM at the end of its lifetime, so a failed delete only keeps the runner busy
        longer."""
        try:
            async with _create_client(_DELETE_TIMEOUT_SECONDS) as client:
                await client.delete(url)
        except httpx.HTTPError as error:
            log.warning("Could not delete the runner VM %s: %s", url, error)


def _create_client(timeout_seconds: int) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=httpx.Timeout(timeout_seconds, connect=_CONNECT_TIMEOUT_SECONDS))


@dataclass(frozen=True)
class _Vm:
    """One VM, reached with ssh through the relay of the runner pod that has it."""

    ssh_command: list[str]
    destination: str

    @classmethod
    def from_answer(cls, answer: dict, keys_folder: Path) -> _Vm:
        known_hosts = keys_folder / "known_hosts"
        known_hosts.write_text(f"{_HOST_ALIAS} {answer['hostKey']}\n", encoding="utf-8")
        client_key = keys_folder / "client_key"
        client_key.touch(mode=0o600)
        client_key.write_text(answer["clientKey"], encoding="utf-8")
        proxy = shlex.join([sys.executable, "-I", str(_PROXY_SCRIPT), f"{answer['url']}/ssh"])
        options = {
            "IdentitiesOnly": "yes",
            "BatchMode": "yes",
            "StrictHostKeyChecking": "yes",
            "UserKnownHostsFile": str(known_hosts),
            "GlobalKnownHostsFile": "/dev/null",
            "HostKeyAlias": _HOST_ALIAS,
            "ProxyCommand": proxy,
            "ForwardAgent": "no",
            "ClearAllForwardings": "yes",
            "PermitLocalCommand": "no",
            "ServerAliveInterval": "30",
            "ServerAliveCountMax": "4",
        }
        ssh_command = ["ssh", "-F", "/dev/null", "-i", str(client_key)]
        for name, value in options.items():
            ssh_command += ["-o", f"{name}={value}"]
        return cls(ssh_command, f"{answer['user']}@{_HOST_ALIAS}")

    async def copy_app_in(self, repo_path: str) -> None:
        """The files that git tracks and the new files that git does not ignore, as they are on disk."""
        app_files = await asyncio.to_thread(list_app_files, repo_path)
        process = await asyncio.create_subprocess_exec(
            "rsync",
            "-e",
            shlex.join(self.ssh_command),
            "--links",
            "--times",
            "--perms",
            "--from0",
            "--files-from=-",
            "./",
            f"{self.destination}:{JOB_APP_FOLDER}",
            cwd=repo_path,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        try:
            _, stderr = await asyncio.wait_for(
                process.communicate("\0".join(app_files).encode()), _COPY_TIMEOUT_SECONDS
            )
        except TimeoutError:
            process.kill()
            await process.wait()
            raise RunnerUnavailable(
                f"rsync to the runner VM did not finish in {_COPY_TIMEOUT_SECONDS} seconds"
            ) from None
        if process.returncode != 0:
            raise RunnerUnavailable(f"rsync to the runner VM failed: {stderr.decode(errors='replace').strip()}")

    async def run(self, script: str, timeout_seconds: int, max_stdout_bytes: int) -> RunResult:
        process = await self._start_ssh(script)
        assert process.stdout is not None and process.stderr is not None
        try:
            stdout, stderr = await asyncio.wait_for(
                asyncio.gather(
                    _read_limited(process.stdout, max_stdout_bytes),
                    _read_limited(process.stderr, _MAX_OUTPUT_BYTES),
                ),
                timeout_seconds,
            )
            exit_code = await process.wait()
        except TimeoutError:
            process.kill()
            await process.wait()
            return RunResult(exit_code=None, stdout="", stderr="")
        if exit_code == _SSH_ERROR_EXIT_CODE:
            raise RunnerUnavailable(f"ssh to the runner VM failed: {stderr.strip()}")
        return RunResult(exit_code=exit_code, stdout=stdout, stderr=stderr)

    async def read_patch(self) -> bytes:
        """git makes the patch in the VM, so the assistant takes only bytes from the VM, not files.  The tool checks the
        patch before it changes the session repo."""
        process = await self._start_ssh(_PATCH_SCRIPT)
        assert process.stdout is not None and process.stderr is not None
        try:
            patch, stderr = await asyncio.wait_for(
                asyncio.gather(
                    _read_or_stop(process, _MAX_PATCH_BYTES), _read_limited(process.stderr, _MAX_OUTPUT_BYTES)
                ),
                _PATCH_TIMEOUT_SECONDS,
            )
            exit_code = await process.wait()
        except TimeoutError:
            process.kill()
            await process.wait()
            raise RunnerUnavailable(
                f"git diff in the runner VM did not finish in {_PATCH_TIMEOUT_SECONDS} seconds"
            ) from None
        if patch is None:
            raise RunnerUnavailable(f"the changes from the runner VM are larger than {_MAX_PATCH_BYTES} bytes")
        if exit_code != 0:
            raise RunnerUnavailable(f"git diff in the runner VM failed: {stderr.strip()}")
        return patch

    async def _start_ssh(self, script: str) -> asyncio.subprocess.Process:
        return await asyncio.create_subprocess_exec(
            *self.ssh_command,
            self.destination,
            script,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )


async def _read_or_stop(process: asyncio.subprocess.Process, max_bytes: int) -> bytes | None:
    """Reads stdout to the end.  Stops the process and returns None when stdout is larger than `max_bytes`."""
    assert process.stdout is not None
    data = bytearray()
    while chunk := await process.stdout.read(64 * 1024):
        data += chunk
        if len(data) > max_bytes:
            process.kill()
            return None
    return bytes(data)


async def _read_limited(stream: asyncio.StreamReader, max_bytes: int) -> str:
    """Reads to the end, and keeps the start up to `max_bytes`, so that a command with much output does not stop."""
    kept = bytearray()
    is_cut = False
    while chunk := await stream.read(64 * 1024):
        kept += chunk[: max(max_bytes - len(kept), 0)]
        is_cut = is_cut or len(kept) >= max_bytes
    text = kept.decode(errors="replace")
    return text + _CUT_NOTE if is_cut else text
