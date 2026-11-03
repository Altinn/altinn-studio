"""Runs app code for this service through the run API of the core operator (`src/core/operator/internal/runapi`).

This service creates a run for the commit of the app, and the operator queues it and starts a sandbox Job.  When the
Job is ready, this service uploads the archive of the app.  When the run has completed, this service fetches the
result from the Job at once, because the operator deletes the Job a few minutes later.  The operator keeps neither the
archive nor the result.

The operator answers a create with the run that is in progress for the same kind and labels, if there is one.  So a
create that this service sends again, such as after a timeout, does not start a second run.

This service holds no Kubernetes permission.  It sends a projected ServiceAccount token with the audience
`core-operator`, and reads it from its file for each request, because the kubelet renews the file.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections.abc import Awaitable, Callable, Generator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from agents.core.runner import (
    AppTooLarge,
    RunCancelled,
    RunnerProgress,
    RunnerUnavailable,
    RunResult,
    RunSource,
    archive_app_files,
    to_run_result,
)

log = logging.getLogger(__name__)

# The operator gives a run a terminal status within the `maxDurationSeconds` of its kind.  This service waits this much
# longer, and then gives up.
_DEADLINE_MARGIN_SECONDS = 60

# The operator answers a poll when the status changes, or after this many seconds.
_POLL_WAIT_SECONDS = 25
# A poll that answers with the same status waits this long before the next poll, so that an operator that does not
# wait is not polled in a tight loop.
_MIN_POLL_INTERVAL_SECONDS = 1

# The operator restarts in a few seconds on a rollout.  This service tries a request again for this long.
_RETRY_SECONDS = 60
_FIRST_RETRY_DELAY_SECONDS = 1
_MAX_RETRY_DELAY_SECONDS = 8
_RETRIED_STATUS_CODES = {502, 503, 504}

_TIMEOUT = httpx.Timeout(30, connect=10)
_CANCEL_TIMEOUT = httpx.Timeout(5)

_OK = 200
_ACCEPTED = 202
_FORBIDDEN = 403
_NOT_FOUND = 404
_CONFLICT = 409
_GONE = 410
_TOO_LARGE = 413
_TOO_MANY_REQUESTS = 429

_WAITING_STATUSES = {"queued", "starting"}
_AWAITING_ARCHIVE_STATUS = "awaiting-archive"
_RUNNING_STATUSES = {_AWAITING_ARCHIVE_STATUS, "running"}
_COMPLETED_STATUS = "completed"
_CANCELED_STATUS = "canceled"
_ENDED_WITHOUT_RESULT_STATUSES = {"failed", "expired"}
_TERMINAL_STATUSES = {_COMPLETED_STATUS, _CANCELED_STATUS, *_ENDED_WITHOUT_RESULT_STATUSES}

_PROBLEM_TEXT_LIMIT = 500


class CoreOperatorClient:
    """`transport`, `clock` and `sleep` are for the tests."""

    def __init__(
        self,
        base_url: str,
        token_path: str,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self._base_url = base_url
        self._auth = _ProjectedTokenAuth(Path(token_path))
        self._transport = transport
        self._clock = clock
        self._sleep = sleep

    async def run(
        self,
        kind: str,
        source: RunSource,
        repo_path: str,
        report_progress: Callable[[RunnerProgress], None],
        is_cancelled: Callable[[], bool],
    ) -> RunResult:
        async with httpx.AsyncClient(
            base_url=self._base_url, auth=self._auth, transport=self._transport, timeout=_TIMEOUT
        ) as client:
            api = _RunApi(client, self._clock, self._sleep)
            return await _run(api, kind, source, repo_path, _OnceReporter(report_progress), is_cancelled)


async def _run(
    api: _RunApi,
    kind: str,
    source: RunSource,
    repo_path: str,
    progress: _OnceReporter,
    is_cancelled: Callable[[], bool],
) -> RunResult:
    # Archives the app first, so that an app that is too large sends no request.
    archive = _Archive(await asyncio.to_thread(archive_app_files, repo_path))
    limits = await api.get_limits(kind)
    run = await api.create_run(kind, source)
    run_id = run["id"]
    deadline_seconds = limits.max_duration_seconds + _DEADLINE_MARGIN_SECONDS
    deadline = api.clock() + deadline_seconds
    try:
        run = await _wait_until_ended(api, run, archive, deadline, deadline_seconds, progress, is_cancelled)
    except BaseException:
        # This includes the cancellation of the task that runs the tool.
        await api.cancel_run(run_id)
        raise

    status = run["status"]
    log.info("The %s run %s ended as %s", kind, run_id, status)
    if status == _CANCELED_STATUS:
        raise RunCancelled
    if status in _ENDED_WITHOUT_RESULT_STATUSES:
        raise RunnerUnavailable(_describe_run_error(run))
    # The Job keeps the result only for the `resultTimeoutSeconds` of the kind after the run has ended.
    return await api.get_run_result(run_id, limits.run_timeout_seconds)


@dataclass
class _Archive:
    """The archive of the app.  This service keeps it until the run's Job has it."""

    content: bytes | None


async def _wait_until_ended(
    api: _RunApi,
    run: dict[str, Any],
    archive: _Archive,
    deadline: float,
    deadline_seconds: int,
    progress: _OnceReporter,
    is_cancelled: Callable[[], bool],
) -> dict[str, Any]:
    while True:
        status = run["status"]
        if status in _TERMINAL_STATUSES:
            return run
        if status in _WAITING_STATUSES:
            progress.report(RunnerProgress.WAITING)
        elif status in _RUNNING_STATUSES:
            progress.report(RunnerProgress.RUNNING)
        if is_cancelled():
            raise RunCancelled
        if api.clock() > deadline:
            raise RunnerUnavailable(f"the core operator did not end the run in {deadline_seconds // 60} minutes")
        if status == _AWAITING_ARCHIVE_STATUS and archive.content is not None:
            run, uploaded = await _upload_archive(api, run["id"], archive.content)
            if uploaded:
                # The archive can be 50 MiB, so this service does not keep it while the command runs.
                archive.content = None
            continue
        polled_at = api.clock()
        run = await api.get_run(run["id"], wait_seconds=_POLL_WAIT_SECONDS)
        if run["status"] == status and api.clock() - polled_at < _MIN_POLL_INTERVAL_SECONDS:
            await api.sleep(_MIN_POLL_INTERVAL_SECONDS)


async def _upload_archive(api: _RunApi, run_id: str, archive: bytes) -> tuple[dict[str, Any], bool]:
    """Returns the run after the upload, and whether the Job has the archive.  The run fails when its Job does not get
    the archive within the `uploadTimeoutSeconds` of its kind."""
    uploaded = await api.upload_archive(run_id, archive)
    if uploaded is not None:
        log.info("Uploaded the archive of the run %s", run_id)
        return uploaded, True
    # The run does not await the archive.  It is still starting, or it has ended.
    run = await api.get_run(run_id, wait_seconds=0)
    if run["status"] == _AWAITING_ARCHIVE_STATUS:
        # The status and the Job disagree for a moment.  This keeps the next upload from following at once.
        await api.sleep(_MIN_POLL_INTERVAL_SECONDS)
    return run, False


@dataclass(frozen=True)
class _KindLimits:
    # How long the command may run once it has started.
    run_timeout_seconds: int
    # How long a run may take from its creation until the operator gives it a terminal status.
    max_duration_seconds: int


class _RunApi:
    """The requests of the run API.  It tries a request again while the operator does not answer."""

    def __init__(
        self, client: httpx.AsyncClient, clock: Callable[[], float], sleep: Callable[[float], Awaitable[None]]
    ) -> None:
        self._client = client
        self.clock = clock
        self.sleep = sleep

    async def get_limits(self, kind: str) -> _KindLimits:
        """Raises `RunnerUnavailable` when the operator does not offer the kind to this service here."""
        response = await self._send("GET", "/api/v1/kinds")
        if response.status_code != _OK:
            raise RunnerUnavailable(f"the core operator did not list its kinds ({_describe_problem(response)})")
        offered = _json(response).get("kinds")
        for offered_kind in offered if isinstance(offered, list) else []:
            if isinstance(offered_kind, dict) and offered_kind.get("name") == kind:
                try:
                    return _KindLimits(
                        run_timeout_seconds=int(offered_kind["runTimeoutSeconds"]),
                        max_duration_seconds=int(offered_kind["maxDurationSeconds"]),
                    )
                except (KeyError, TypeError, ValueError) as error:
                    raise RunnerUnavailable(f"the kind {kind} has no valid timeouts ({error!r})") from error
        raise RunnerUnavailable(_not_here(kind))

    async def create_run(self, kind: str, source: RunSource) -> dict[str, Any]:
        """Returns the new run, or the run of the kind with the source's labels that is in progress."""
        response = await self._send("POST", "/api/v1/runs", json={"kind": kind, "labels": _labels(source)})
        if response.status_code in (_ACCEPTED, _OK):
            run = _run_from(response)
            found = "Found" if response.status_code == _OK else "Created"
            log.info("%s the %s run %s for %s", found, kind, run["id"], source.commit)
            return run
        if response.status_code in (_FORBIDDEN, _NOT_FOUND):
            raise RunnerUnavailable(_not_here(kind))
        if response.status_code == _TOO_MANY_REQUESTS:
            raise RunnerUnavailable(f"too many {kind} runs wait for a sandbox now, so the user can try again later")
        raise RunnerUnavailable(f"the core operator refused the run ({_describe_problem(response)})")

    async def upload_archive(self, run_id: str, archive: bytes) -> dict[str, Any] | None:
        """Returns the run when the Job has the archive, or None when the run does not await an archive.  The Job
        discards an archive that comes again, so an upload that broke off can be sent again."""
        response = await self._send(
            "PUT", f"/api/v1/runs/{run_id}/archive", content=archive, headers={"Content-Type": "application/gzip"}
        )
        if response.status_code == _ACCEPTED:
            return _run_from(response)
        if response.status_code == _CONFLICT:
            return None
        if response.status_code == _TOO_LARGE:
            raise AppTooLarge("the core operator refused the archive of the app")
        raise RunnerUnavailable(f"the core operator refused the archive ({_describe_problem(response)})")

    async def get_run(self, run_id: str, *, wait_seconds: int) -> dict[str, Any]:
        response = await self._send("GET", f"/api/v1/runs/{run_id}", params={"wait": wait_seconds})
        if response.status_code != _OK:
            raise RunnerUnavailable(f"the core operator lost the run ({_describe_problem(response)})")
        return _run_from(response)

    async def get_run_result(self, run_id: str, run_timeout_seconds: int) -> RunResult:
        response = await self._send("GET", f"/api/v1/runs/{run_id}/result")
        if response.status_code == _GONE:
            raise RunnerUnavailable("the result of the run expired before this service fetched it")
        if response.status_code != _OK:
            raise RunnerUnavailable(f"the core operator has no result ({_describe_problem(response)})")
        try:
            return to_run_result(_json(response), run_timeout_seconds)
        except (KeyError, TypeError, ValueError) as error:
            raise RunnerUnavailable(f"the result of the run is not valid ({error!r})") from error

    async def cancel_run(self, run_id: str) -> None:
        """Tries once.  When the operator does not cancel the run, the run ends by its timeout."""
        try:
            response = await self._client.post(f"/api/v1/runs/{run_id}/cancel", timeout=_CANCEL_TIMEOUT)
        except httpx.RequestError, RunnerUnavailable:
            log.warning("Could not cancel the run %s", run_id, exc_info=True)
            return
        if response.status_code not in (_ACCEPTED, _OK):
            log.warning("Could not cancel the run %s: %s", run_id, _describe_problem(response))

    async def _send(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        started = self.clock()
        delay = _FIRST_RETRY_DELAY_SECONDS
        while True:
            try:
                response = await self._client.request(method, url, **kwargs)
            except httpx.RequestError as error:
                failure = f"{type(error).__name__}: {error}"
            else:
                if response.status_code not in _RETRIED_STATUS_CODES:
                    return response
                failure = _describe_problem(response)
            if self.clock() - started + delay > _RETRY_SECONDS:
                raise RunnerUnavailable(f"the core operator did not answer ({failure})")
            log.info("The core operator did not answer %s %s (%s); trying again", method, url, failure)
            await self.sleep(delay)
            delay = min(delay * 2, _MAX_RETRY_DELAY_SECONDS)


class _ProjectedTokenAuth(httpx.Auth):
    """Reads the token for each request, because the kubelet renews the file before the token expires."""

    def __init__(self, token_path: Path) -> None:
        self._token_path = token_path

    def auth_flow(self, request: httpx.Request) -> Generator[httpx.Request, httpx.Response]:
        try:
            token = self._token_path.read_text(encoding="utf-8").strip()
        except OSError as error:
            raise RunnerUnavailable(f"cannot read the token for the core operator ({error})") from error
        if not token:
            raise RunnerUnavailable(f"the token file {self._token_path} is empty")
        request.headers["Authorization"] = f"Bearer {token}"
        yield request


class _OnceReporter:
    """Reports each progress state at most once."""

    def __init__(self, report: Callable[[RunnerProgress], None]) -> None:
        self._report = report
        self._reported: set[RunnerProgress] = set()

    def report(self, state: RunnerProgress) -> None:
        if state not in self._reported:
            self._reported.add(state)
            self._report(state)


def _run_from(response: httpx.Response) -> dict[str, Any]:
    """Returns the run, with an id that is safe to put in a URL path."""
    run = _json(response)
    try:
        run["id"] = str(uuid.UUID(run["id"]))
        run["status"] = str(run["status"])
    except (KeyError, TypeError, ValueError) as error:
        raise RunnerUnavailable(f"the core operator sent a run that is not valid ({error!r})") from error
    return run


def _labels(source: RunSource) -> dict[str, str]:
    """The labels of a run of the app at the commit, which the kinds that run app code have."""
    return {
        "org": source.org,
        "app": source.app,
        "repoOwner": source.repo_owner,
        "repo": source.repo,
        "commit": source.commit,
    }


def _json(response: httpx.Response) -> dict[str, Any]:
    try:
        body = response.json()
    except ValueError as error:
        raise RunnerUnavailable(f"the core operator sent a body that is not JSON ({response.status_code})") from error
    if not isinstance(body, dict):
        raise RunnerUnavailable(f"the core operator sent JSON that is not an object ({response.status_code})")
    return body


def _not_here(kind: str) -> str:
    return f"the core operator does not run {kind} for this service in this environment"


def _describe_run_error(run: dict[str, Any]) -> str:
    error = run.get("error") or {}
    reason = error.get("reason") or run["status"]
    detail = error.get("detail") or "no detail"
    return f"the run {run['status']} ({reason}: {detail})"


def _describe_problem(response: httpx.Response) -> str:
    """Returns the status code and the detail of an RFC 9457 problem, or the start of the body."""
    try:
        problem = response.json()
    except ValueError:
        problem = None
    if isinstance(problem, dict) and (problem.get("detail") or problem.get("title")):
        text = str(problem.get("detail") or problem.get("title"))
    else:
        text = response.text
    return f"{response.status_code}: {text[:_PROBLEM_TEXT_LIMIT]}" if text else str(response.status_code)
