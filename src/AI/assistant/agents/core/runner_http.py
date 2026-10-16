"""The assistant runner over HTTP: the app goes to the runner as a tar.gz in one request, and the answer has the
result and, for an upgrade, the changes as a patch.  The runner starts a new VM for the request, and deletes it
before it answers."""

from __future__ import annotations

import asyncio
import base64
import io
import os
import tarfile
from collections.abc import Callable

import httpx

from agents.core.runner import RunnerUnavailable, RunResult, call_until_not_busy, list_app_files

_UPGRADE_PATH = "/api/v1/upgrades/v9"
_BUILD_PATH = "/api/v1/builds"
_ARCHIVE_CONTENT_TYPE = "application/gzip"
# The runner stops the command at these limits, and answers after the VM is deleted.
_UPGRADE_TIMEOUT_SECONDS = 12 * 60
_BUILD_TIMEOUT_SECONDS = 6 * 60
_CONNECT_TIMEOUT_SECONDS = 10


class HttpRunner:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url

    async def upgrade(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        return await self._run(_UPGRADE_PATH, repo_path, _UPGRADE_TIMEOUT_SECONDS, report_wait)

    async def build(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        return await self._run(_BUILD_PATH, repo_path, _BUILD_TIMEOUT_SECONDS, report_wait)

    async def _run(self, path: str, repo_path: str, timeout_seconds: int, report_wait: Callable[[], None]) -> RunResult:
        archive = await asyncio.to_thread(_archive_app_files, repo_path)
        try:
            response = await call_until_not_busy(lambda: self._post_once(path, archive, timeout_seconds), report_wait)
        except httpx.ReadTimeout:
            return RunResult(exit_code=None, stdout="", stderr="")
        if response.status_code != httpx.codes.OK:
            raise RunnerUnavailable(f"the assistant runner answered {response.status_code}: {response.text}")
        return _to_run_result(response.json())

    async def _post_once(self, path: str, archive: bytes, timeout_seconds: int) -> httpx.Response:
        """Each try opens a new connection, because the Service sends a new connection to a random runner pod, and
        a kept connection goes to the same busy pod."""
        try:
            async with _create_client(self._base_url, timeout_seconds) as client:
                return await client.post(path, content=archive, headers={"Content-Type": _ARCHIVE_CONTENT_TYPE})
        except httpx.ReadTimeout:
            raise
        except httpx.HTTPError as error:
            raise RunnerUnavailable(f"the assistant runner did not answer ({type(error).__name__}: {error})") from error


def _create_client(base_url: str, timeout_seconds: int) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=base_url, timeout=httpx.Timeout(timeout_seconds, connect=_CONNECT_TIMEOUT_SECONDS)
    )


def _archive_app_files(repo_path: str) -> bytes:
    """A tar.gz of the app files, without `.git`.  Symbolic links stay links."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path in list_app_files(repo_path):
            archive.add(os.path.join(repo_path, path), arcname=path, recursive=False)
    return buffer.getvalue()


def _to_run_result(answer: dict) -> RunResult:
    patch = base64.b64decode(answer["patch"]) if answer["patch"] else b""
    exit_code = None if answer["timedOut"] else answer["exitCode"]
    return RunResult(exit_code=exit_code, stdout=answer["stdout"], stderr=answer["stderr"], patch=patch)
