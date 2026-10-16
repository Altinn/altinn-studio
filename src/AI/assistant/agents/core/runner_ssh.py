"""The assistant runner over SSH.

The runner starts a VM with sshd for each job.  The assistant copies the app into the VM with rsync, runs the command
with ssh, and for an upgrade copies the changes back with rsync.  Then it deletes the VM.  The runner also deletes a
VM at the end of its lifetime, so a VM that the assistant does not delete does not stay.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shlex
import shutil
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
# App code in the VM controls what rsync copies back, so the assistant stops at this size.
_MAX_CHANGED_BYTES = 20 * 1024 * 1024
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


class SshRunner:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url

    async def upgrade(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        async with self._vm(report_wait) as vm:
            await vm.copy_app_in(repo_path)
            run = await vm.run(_UPGRADE_SCRIPT, _UPGRADE_TIMEOUT_SECONDS, _MAX_UPGRADE_STDOUT_BYTES)
            if run.timed_out:
                return run
            return replace(run, patch=await vm.copy_changes_back(repo_path))

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
        await self._rsync(
            [
                "--links",
                "--times",
                "--perms",
                "--from0",
                "--files-from=-",
                "./",
                f"{self.destination}:{JOB_APP_FOLDER}",
            ],
            cwd=repo_path,
            stdin="\0".join(app_files).encode(),
        )

    async def run(self, script: str, timeout_seconds: int, max_stdout_bytes: int) -> RunResult:
        process = await asyncio.create_subprocess_exec(
            *self.ssh_command,
            self.destination,
            script,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
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

    async def copy_changes_back(self, repo_path: str) -> bytes:
        """rsync writes into a copy of the app, so that it copies only the changed files, and git makes the patch
        from that copy.  The tool checks the patch before it changes the session repo."""
        with tempfile.TemporaryDirectory() as copy_folder:
            await asyncio.to_thread(_copy_app_files, repo_path, copy_folder)
            await self._rsync(
                [
                    "--recursive",
                    "--links",
                    "--times",
                    "--perms",
                    "--delete",
                    "--exclude=/.git",
                    "--out-format=%l",
                    f"{self.destination}:{JOB_APP_FOLDER}",
                    f"{copy_folder}/",
                ],
                max_copied_bytes=_MAX_CHANGED_BYTES,
            )
            return await asyncio.to_thread(_make_patch, repo_path, copy_folder)

    async def _rsync(
        self, arguments: list[str], cwd: str | None = None, stdin: bytes = b"", max_copied_bytes: int | None = None
    ) -> None:
        process = await asyncio.create_subprocess_exec(
            "rsync",
            "-e",
            shlex.join(self.ssh_command),
            *arguments,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        try:
            copied_all, stderr = await asyncio.wait_for(
                _watch_rsync(process, stdin, max_copied_bytes), _COPY_TIMEOUT_SECONDS
            )
        except TimeoutError:
            process.kill()
            await process.wait()
            raise RunnerUnavailable(
                f"rsync to the runner VM did not finish in {_COPY_TIMEOUT_SECONDS} seconds"
            ) from None
        exit_code = await process.wait()
        if not copied_all:
            raise RunnerUnavailable(f"the changes from the runner VM are larger than {max_copied_bytes} bytes")
        if exit_code != 0:
            raise RunnerUnavailable(f"rsync to the runner VM failed: {stderr}")


async def _watch_rsync(
    process: asyncio.subprocess.Process, stdin: bytes, max_copied_bytes: int | None
) -> tuple[bool, str]:
    """Reads stdout and stderr at the same time, so that a full pipe does not stop rsync.  Stops rsync at the size
    limit."""
    assert process.stdin is not None and process.stdout is not None and process.stderr is not None
    process.stdin.write(stdin)
    await process.stdin.drain()
    process.stdin.close()

    async def count_or_stop(stdout: asyncio.StreamReader) -> bool:
        copied_all = await _count_copied_bytes(stdout, max_copied_bytes)
        if not copied_all:
            process.kill()
        return copied_all

    copied_all, stderr = await asyncio.gather(count_or_stop(process.stdout), process.stderr.read())
    return copied_all, stderr.decode(errors="replace").strip()


async def _count_copied_bytes(stdout: asyncio.StreamReader, max_copied_bytes: int | None) -> bool:
    """With `--out-format=%l`, rsync writes the size of each file that it copies.  Returns False when the sizes
    reach the limit."""
    copied_bytes = 0
    async for line in stdout:
        copied_bytes += int(line) if line.strip().isdigit() else 0
        if max_copied_bytes is not None and copied_bytes > max_copied_bytes:
            return False
    return True


async def _read_limited(stream: asyncio.StreamReader, max_bytes: int) -> str:
    """Reads to the end, and keeps the start up to `max_bytes`, so that a command with much output does not stop."""
    kept = bytearray()
    is_cut = False
    while chunk := await stream.read(64 * 1024):
        kept += chunk[: max(max_bytes - len(kept), 0)]
        is_cut = is_cut or len(kept) >= max_bytes
    text = kept.decode(errors="replace")
    return text + _CUT_NOTE if is_cut else text


def _copy_app_files(repo_path: str, copy_folder: str) -> None:
    for path in list_app_files(repo_path):
        target = os.path.join(copy_folder, path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copy2(os.path.join(repo_path, path), target, follow_symlinks=False)


def _make_patch(repo_path: str, folder: str) -> bytes:
    """The changes in `folder` against HEAD, as `git diff --binary` output.  git uses `folder` as the working tree and
    a temporary index, so the session repo does not change."""
    with tempfile.TemporaryDirectory() as index_folder:
        environment = {**os.environ, "GIT_INDEX_FILE": os.path.join(index_folder, "index")}
        git = ["git", "-C", repo_path, f"--work-tree={folder}"]
        subprocess.run([*git, "read-tree", "HEAD"], env=environment, check=True, capture_output=True)
        subprocess.run([*git, "add", "-A"], env=environment, check=True, capture_output=True)
        diff = subprocess.run([*git, "diff", "--cached", "--binary"], env=environment, check=True, capture_output=True)
    return diff.stdout
