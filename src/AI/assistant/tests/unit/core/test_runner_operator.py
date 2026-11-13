"""Tests for `CoreOperatorClient`, against a fake run API of the core operator (`src/core/operator/internal/runapi`)."""

from __future__ import annotations

import asyncio
import base64
import io
import json
import tarfile
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx
import pytest

from agents.core import runner as runner_module
from agents.core.runner import AppTooLarge, RunCancelled, RunnerProgress, RunnerUnavailable, RunSource
from agents.core.runner_operator import CoreOperatorClient

from .git_repo import create_committed_repo

_BASE_URL = "http://core-operator.test:8080"
_KIND = "upgrade-v9"
_RUN_ID = str(uuid.UUID(int=1))
_SOURCE = RunSource(org="ttd", app="my-app", repo_owner="developer", repo="my-app", commit="a1" * 20)
_LABELS = {"org": "ttd", "app": "my-app", "repoOwner": "developer", "repo": "my-app", "commit": "a1" * 20}
_RESULT = {
    "exitCode": 0,
    "timedOut": False,
    "stdout": "",
    "stderr": "",
    "report": {"exitCode": 0, "steps": []},
    "patch": base64.b64encode(b"diff --git a/App/App.csproj b/App/App.csproj\n").decode(),
}
_KIND_LIMITS = {
    "queueTimeoutSeconds": 900,
    "uploadTimeoutSeconds": 120,
    "runTimeoutSeconds": 1200,
    "resultTimeoutSeconds": 300,
    "maxDurationSeconds": 2700,
}
_KINDS = {"kinds": [{"name": _KIND, **_KIND_LIMITS}]}
# The maximum duration of the kind and the margin of the runner, in seconds.
_DEADLINE_SECONDS = 2700 + 60


class _Clock:
    """A monotonic clock that only `sleep` and the fake operator move forward."""

    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []

    def __call__(self) -> float:
        return self.now

    async def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


def _run(status: str, **fields: Any) -> dict[str, Any]:
    return {
        "id": _RUN_ID,
        "kind": _KIND,
        "labels": _LABELS,
        "status": status,
        "createdAt": "2026-11-03T10:00:00Z",
        **fields,
    }


def _problem(status: int, detail: str) -> httpx.Response:
    return httpx.Response(
        status,
        json={"type": "about:blank", "title": "Problem", "status": status, "detail": detail},
        headers={"Content-Type": "application/problem+json"},
    )


@dataclass
class _FakeOperator:
    """Answers the run API.  Each poll takes the next status from `statuses`, and repeats the last one."""

    clock: _Clock
    created: httpx.Response = field(default_factory=lambda: httpx.Response(202, json=_run("queued", queuePosition=1)))
    statuses: list[str] = field(default_factory=lambda: ["awaiting-archive", "completed"])
    errors: dict[str, dict[str, Any]] = field(default_factory=lambda: dict(_ERRORS))
    kinds: httpx.Response = field(default_factory=lambda: httpx.Response(200, json=_KINDS))
    uploaded: httpx.Response = field(default_factory=lambda: httpx.Response(202, json=_run("running")))
    result: httpx.Response = field(default_factory=lambda: httpx.Response(200, json=_RESULT))
    # Answers that come before `created` for each create request, for example 503 while the operator restarts.
    create_failures: list[httpx.Response | Exception] = field(default_factory=list)
    upload_failures: list[httpx.Response | Exception] = field(default_factory=list)
    poll_failures: list[httpx.Response | Exception] = field(default_factory=list)
    # Seconds that each poll takes.
    poll_seconds: float = 0
    on_poll: Callable[[], Awaitable[None]] | None = None
    requests: list[httpx.Request] = field(default_factory=list)

    async def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        path = request.url.path
        if request.method == "GET" and path == "/api/v1/kinds":
            return self.kinds
        if request.method == "POST" and path == "/api/v1/runs":
            return _answer(self.create_failures.pop(0)) if self.create_failures else self.created
        if request.method == "GET" and path == f"/api/v1/runs/{_RUN_ID}":
            return await self._poll()
        if request.method == "PUT" and path == f"/api/v1/runs/{_RUN_ID}/archive":
            return _answer(self.upload_failures.pop(0)) if self.upload_failures else self.uploaded
        if request.method == "GET" and path == f"/api/v1/runs/{_RUN_ID}/result":
            return self.result
        if request.method == "POST" and path == f"/api/v1/runs/{_RUN_ID}/cancel":
            return httpx.Response(202, json=_run("canceled"))
        return _problem(404, f"no route for {request.method} {path}")

    async def _poll(self) -> httpx.Response:
        if self.on_poll is not None:
            await self.on_poll()
        self.clock.now += self.poll_seconds
        if self.poll_failures:
            return _answer(self.poll_failures.pop(0))
        status = self.statuses.pop(0) if len(self.statuses) > 1 else self.statuses[0]
        return httpx.Response(200, json=_run(status, **self.errors.get(status, {})))

    def paths(self, method: str | None = None) -> list[str]:
        return [request.url.path for request in self.requests if method is None or request.method == method]

    def polls(self) -> list[httpx.Request]:
        return [request for request in self.requests if request.url.path == f"/api/v1/runs/{_RUN_ID}"]

    def uploads(self) -> list[httpx.Request]:
        return [request for request in self.requests if request.url.path.endswith("/archive")]

    def cancels(self) -> list[httpx.Request]:
        return [request for request in self.requests if request.url.path.endswith("/cancel")]


_ERRORS = {
    "failed": {"error": {"reason": "start-failed", "detail": "the pod did not become ready in 5 minutes"}},
    "expired": {"error": {"reason": "queue-timeout", "detail": "the run waited 15 minutes in the queue"}},
}
_ARCHIVE_TIMEOUT = {"error": {"reason": "archive-timeout", "detail": "no archive arrived in 120 seconds"}}


def _answer(failure: httpx.Response | Exception) -> httpx.Response:
    if isinstance(failure, Exception):
        raise failure
    return failure


@dataclass
class _Setup:
    operator: _FakeOperator
    runner: CoreOperatorClient
    clock: _Clock
    token_file: Path
    repo: Path
    progress: list[RunnerProgress]

    async def run(self, is_cancelled: Callable[[], bool] = lambda: False):
        return await self.runner.run(_KIND, _SOURCE, str(self.repo), self.progress.append, is_cancelled)


@pytest.fixture
def setup(tmp_path: Path) -> _Setup:
    clock = _Clock()
    operator = _FakeOperator(clock)
    token_file = tmp_path / "token"
    token_file.write_text("first-token\n", encoding="utf-8")
    runner = CoreOperatorClient(
        _BASE_URL,
        str(token_file),
        transport=httpx.MockTransport(operator),
        clock=clock,
        sleep=clock.sleep,
    )
    repo = create_committed_repo(tmp_path / "app", {"App/App.csproj": "<Project />"})
    return _Setup(operator, runner, clock, token_file, repo, [])


def _creates(operator: _FakeOperator) -> list[httpx.Request]:
    return [request for request in operator.requests if request.method == "POST" and request.url.path == "/api/v1/runs"]


class TestCreate:
    async def test_sends_the_kind_and_the_source_as_json(self, setup: _Setup):
        await setup.run()

        (create,) = _creates(setup.operator)
        assert create.headers["Content-Type"] == "application/json"
        assert json.loads(create.content) == {"kind": _KIND, "labels": _LABELS}

    async def test_returns_the_result_of_a_run_that_completed(self, setup: _Setup):
        result = await setup.run()

        assert result.exit_code == 0
        assert result.report == {"exitCode": 0, "steps": []}
        assert result.patch == b"diff --git a/App/App.csproj b/App/App.csproj\n"
        assert setup.operator.paths() == [
            "/api/v1/kinds",
            "/api/v1/runs",
            f"/api/v1/runs/{_RUN_ID}",
            f"/api/v1/runs/{_RUN_ID}/archive",
            f"/api/v1/runs/{_RUN_ID}",
            f"/api/v1/runs/{_RUN_ID}/result",
        ]

    async def test_follows_the_run_that_is_in_progress_for_the_source(self, setup: _Setup):
        setup.operator.created = httpx.Response(200, json=_run("running"))
        setup.operator.statuses = ["completed"]

        result = await setup.run()

        assert result.exit_code == 0
        assert len(_creates(setup.operator)) == 1
        assert setup.operator.uploads() == []

    async def test_uploads_the_archive_to_a_run_in_progress_that_awaits_it(self, setup: _Setup):
        setup.operator.created = httpx.Response(200, json=_run("awaiting-archive"))
        setup.operator.statuses = ["completed"]

        await setup.run()

        assert len(setup.operator.uploads()) == 1

    @pytest.mark.parametrize("status", [403, 404])
    async def test_says_the_kind_is_not_here_when_the_operator_does_not_offer_it(self, setup: _Setup, status: int):
        setup.operator.created = _problem(status, "upgrade-v9 is not for this caller")

        with pytest.raises(RunnerUnavailable, match="does not run upgrade-v9 for this service in this environment"):
            await setup.run()

    async def test_says_the_kind_is_not_here_when_the_operator_offers_no_kinds(self, setup: _Setup):
        setup.operator.kinds = httpx.Response(200, json={"kinds": []})

        with pytest.raises(RunnerUnavailable, match="does not run upgrade-v9 for this service in this environment"):
            await setup.run()

        assert _creates(setup.operator) == []

    async def test_is_unavailable_when_the_kind_has_no_maximum_duration(self, setup: _Setup):
        kind = {"name": _KIND, **_KIND_LIMITS}
        del kind["maxDurationSeconds"]
        setup.operator.kinds = httpx.Response(200, json={"kinds": [kind]})

        with pytest.raises(RunnerUnavailable, match="the kind upgrade-v9 has no valid timeouts"):
            await setup.run()

        assert _creates(setup.operator) == []

    async def test_passes_on_the_problem_when_a_run_with_other_arguments_is_in_progress(self, setup: _Setup):
        setup.operator.created = _problem(409, "a run with other arguments is in progress")

        with pytest.raises(
            RunnerUnavailable, match="refused the run \\(409: a run with other arguments is in progress"
        ):
            await setup.run()

    async def test_says_the_user_can_try_again_later_when_the_queue_is_full(self, setup: _Setup):
        setup.operator.created = _problem(429, "the queue of upgrade-v9 is full")

        with pytest.raises(RunnerUnavailable, match="too many upgrade-v9 runs wait for a sandbox now"):
            await setup.run()

        assert len(_creates(setup.operator)) == 1

    async def test_creates_again_for_the_same_source_while_the_operator_restarts(self, setup: _Setup):
        """The operator answers a create for a source that has a run in progress with that run, so a create that
        reached the operator before it stopped answering starts no second run."""
        setup.operator.create_failures = [
            _problem(503, "the engine does not answer"),
            httpx.ReadTimeout("timed out"),
        ]

        result = await setup.run()

        assert result.exit_code == 0
        bodies = [json.loads(create.content) for create in _creates(setup.operator)]
        assert bodies == [{"kind": _KIND, "labels": _LABELS}] * 3
        assert setup.clock.sleeps == [1, 2]

    async def test_gives_up_when_the_operator_does_not_answer_for_a_minute(self, setup: _Setup):
        setup.operator.created = _problem(503, "the engine does not answer")

        with pytest.raises(RunnerUnavailable, match="did not answer \\(503: the engine does not answer\\)"):
            await setup.run()

        assert sum(setup.clock.sleeps) <= 60
        assert len(_creates(setup.operator)) > 3

    async def test_does_not_send_an_app_that_is_too_large(self, setup: _Setup, monkeypatch):
        monkeypatch.setattr(runner_module, "MAX_ARCHIVE_BYTES", 10)

        with pytest.raises(AppTooLarge):
            await setup.run()

        assert setup.operator.requests == []


class TestUpload:
    async def test_uploads_the_app_as_a_gzip_archive_when_the_run_awaits_it(self, setup: _Setup):
        await setup.run()

        (upload,) = setup.operator.uploads()
        assert upload.method == "PUT"
        assert upload.headers["Content-Type"] == "application/gzip"
        with tarfile.open(fileobj=io.BytesIO(upload.content), mode="r:gz") as app:
            assert app.getnames() == ["App/App.csproj"]

    async def test_uploads_once_when_the_status_still_says_it_awaits_the_archive(self, setup: _Setup):
        setup.operator.uploaded = httpx.Response(202, json=_run("awaiting-archive"))
        setup.operator.statuses = ["awaiting-archive", "awaiting-archive", "running", "completed"]

        await setup.run()

        assert len(setup.operator.uploads()) == 1

    async def test_reads_the_status_again_when_the_run_is_still_starting(self, setup: _Setup):
        setup.operator.upload_failures = [_problem(409, "the run is starting")]
        setup.operator.statuses = ["awaiting-archive", "starting", "awaiting-archive", "completed"]

        result = await setup.run()

        assert result.exit_code == 0
        assert len(setup.operator.uploads()) == 2
        assert [poll.url.params["wait"] for poll in setup.operator.polls()] == ["25", "0", "25", "25"]

    async def test_waits_before_it_uploads_again_when_the_status_says_the_run_awaits_the_archive(self, setup: _Setup):
        setup.operator.upload_failures = [_problem(409, "the run is starting")]
        setup.operator.statuses = ["awaiting-archive", "awaiting-archive", "completed"]

        await setup.run()

        assert len(setup.operator.uploads()) == 2
        assert setup.clock.sleeps == [1]

    async def test_passes_on_the_error_when_the_run_ended_instead_of_taking_the_archive(self, setup: _Setup):
        setup.operator.upload_failures = [_problem(409, "the run has ended")]
        setup.operator.statuses = ["awaiting-archive", "failed"]
        setup.operator.errors["failed"] = _ARCHIVE_TIMEOUT

        with pytest.raises(RunnerUnavailable) as raised:
            await setup.run()

        assert str(raised.value) == "the run failed (archive-timeout: no archive arrived in 120 seconds)"
        assert len(setup.operator.uploads()) == 1
        assert setup.operator.cancels() == []

    async def test_tries_the_upload_again_while_the_operator_restarts(self, setup: _Setup):
        setup.operator.upload_failures = [_problem(503, "the job does not answer"), httpx.WriteError("broken pipe")]

        result = await setup.run()

        assert result.exit_code == 0
        assert len(setup.operator.uploads()) == 3

    async def test_says_the_app_is_too_large_and_cancels_the_run_when_the_operator_refuses_the_archive(
        self, setup: _Setup
    ):
        setup.operator.uploaded = _problem(413, "the archive is larger than 50 MiB")

        with pytest.raises(AppTooLarge):
            await setup.run()

        assert len(setup.operator.cancels()) == 1

    async def test_passes_on_the_problem_when_the_operator_refuses_the_archive(self, setup: _Setup):
        setup.operator.uploaded = _problem(400, "the body is not a gzip archive")

        with pytest.raises(RunnerUnavailable, match="refused the archive \\(400: the body is not a gzip archive\\)"):
            await setup.run()


class TestPolling:
    async def test_reports_waiting_while_queued_or_starting_and_running_once_each(self, setup: _Setup):
        setup.operator.statuses = ["queued", "starting", "starting", "awaiting-archive", "running", "completed"]

        await setup.run()

        assert setup.progress == [RunnerProgress.WAITING, RunnerProgress.RUNNING]

    async def test_reports_running_once_the_sandbox_awaits_the_archive(self, setup: _Setup):
        setup.operator.statuses = ["awaiting-archive"]
        setup.operator.uploaded = _problem(400, "the body is not a gzip archive")

        with pytest.raises(RunnerUnavailable):
            await setup.run()

        assert setup.progress == [RunnerProgress.WAITING, RunnerProgress.RUNNING]

    async def test_reports_only_running_when_the_run_runs_at_once(self, setup: _Setup):
        setup.operator.created = httpx.Response(202, json=_run("running"))

        await setup.run()

        assert setup.progress == [RunnerProgress.RUNNING]

    async def test_asks_the_operator_to_wait_for_a_change(self, setup: _Setup):
        setup.operator.statuses = ["running", "completed"]
        setup.operator.poll_seconds = 20

        await setup.run()

        assert [poll.url.params["wait"] for poll in setup.operator.polls()] == ["25", "25"]
        assert setup.clock.sleeps == []

    async def test_waits_between_polls_when_the_operator_answers_at_once(self, setup: _Setup):
        setup.operator.statuses = ["queued", "queued", "completed"]

        await setup.run()

        assert setup.clock.sleeps == [1, 1]

    async def test_keeps_polling_while_the_operator_restarts(self, setup: _Setup):
        setup.operator.statuses = ["running", "completed"]
        setup.operator.poll_failures = [httpx.ReadTimeout("timed out"), _problem(502, "bad gateway")]

        result = await setup.run()

        assert result.exit_code == 0
        assert setup.operator.cancels() == []

    @pytest.mark.parametrize(
        ("status", "error", "detail"),
        [
            ("failed", _ERRORS["failed"], "the run failed (start-failed: the pod did not become ready in 5 minutes)"),
            ("failed", _ARCHIVE_TIMEOUT, "the run failed (archive-timeout: no archive arrived in 120 seconds)"),
            ("expired", _ERRORS["expired"], "the run expired (queue-timeout: the run waited 15 minutes in the queue)"),
        ],
    )
    async def test_passes_on_the_error_of_a_run_that_ended_without_a_result(
        self, setup: _Setup, status: str, error: dict[str, Any], detail: str
    ):
        setup.operator.statuses = ["running", status]
        setup.operator.errors[status] = error

        with pytest.raises(RunnerUnavailable) as raised:
            await setup.run()

        assert str(raised.value) == detail
        assert f"/api/v1/runs/{_RUN_ID}/result" not in setup.operator.paths()
        assert setup.operator.cancels() == []

    async def test_raises_run_cancelled_when_the_operator_says_the_run_was_canceled(self, setup: _Setup):
        setup.operator.statuses = ["canceled"]

        with pytest.raises(RunCancelled):
            await setup.run()

    async def test_gives_up_and_cancels_the_run_after_the_deadline(self, setup: _Setup):
        setup.operator.statuses = ["running"]
        setup.operator.poll_seconds = 20

        with pytest.raises(RunnerUnavailable, match=f"did not end the run in {_DEADLINE_SECONDS // 60} minutes"):
            await setup.run()

        assert len(setup.operator.cancels()) == 1
        assert setup.clock.now == pytest.approx(_DEADLINE_SECONDS, abs=20)

    async def test_says_the_operator_lost_the_run(self, setup: _Setup):
        setup.operator.poll_failures = [_problem(404, "no such run")]

        with pytest.raises(RunnerUnavailable, match="lost the run \\(404: no such run\\)"):
            await setup.run()


class TestResult:
    async def test_fetches_the_result_as_soon_as_the_run_has_completed(self, setup: _Setup):
        setup.operator.statuses = ["running", "completed"]

        await setup.run()

        assert setup.operator.paths()[-2:] == [f"/api/v1/runs/{_RUN_ID}", f"/api/v1/runs/{_RUN_ID}/result"]
        assert setup.clock.sleeps == []

    async def test_reads_a_result_that_has_its_status(self, setup: _Setup):
        setup.operator.result = httpx.Response(200, json={"status": "completed", **_RESULT})

        result = await setup.run()

        assert result.exit_code == 0
        assert result.report == {"exitCode": 0, "steps": []}

    async def test_says_the_result_expired_when_the_job_is_gone(self, setup: _Setup):
        setup.operator.result = _problem(410, "the result has expired")

        with pytest.raises(RunnerUnavailable, match="the result of the run expired before this service fetched it"):
            await setup.run()

    async def test_passes_on_the_problem_when_the_operator_has_no_result(self, setup: _Setup):
        setup.operator.result = _problem(409, "the run has not finished")

        with pytest.raises(RunnerUnavailable, match="has no result \\(409: the run has not finished\\)"):
            await setup.run()

    async def test_refuses_a_result_that_is_not_valid(self, setup: _Setup):
        setup.operator.result = httpx.Response(200, json={"exitCode": 0})

        with pytest.raises(RunnerUnavailable, match="result of the run is not valid"):
            await setup.run()

    async def test_has_no_exit_code_when_the_command_timed_out(self, setup: _Setup):
        setup.operator.result = httpx.Response(
            200, json={"exitCode": None, "timedOut": True, "stdout": "", "stderr": "", "report": None, "patch": None}
        )

        result = await setup.run()

        assert result.timed_out
        assert result.run_timeout_seconds == _KIND_LIMITS["runTimeoutSeconds"]


class TestCancel:
    async def test_cancels_the_run_when_the_session_is_cancelled(self, setup: _Setup):
        setup.operator.statuses = ["running"]
        cancelled = iter([False, False, True])

        with pytest.raises(RunCancelled):
            await setup.run(is_cancelled=lambda: next(cancelled))

        assert len(setup.operator.cancels()) == 1
        assert len(setup.operator.polls()) == 2

    async def test_cancels_the_run_when_the_task_of_the_tool_is_cancelled(self, setup: _Setup):
        polling = asyncio.Event()
        never = asyncio.Event()

        async def block() -> None:
            polling.set()
            await never.wait()

        setup.operator.on_poll = block
        task = asyncio.create_task(setup.run())
        await polling.wait()
        task.cancel()

        with pytest.raises(asyncio.CancelledError):
            await task

        assert len(setup.operator.cancels()) == 1

    async def test_a_cancel_that_fails_does_not_hide_why_the_run_stopped(self, setup: _Setup):
        setup.operator.statuses = ["running"]
        operator = setup.operator

        async def refuse_cancel(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/cancel"):
                raise httpx.ConnectError("Connection refused")
            return await operator(request)

        setup.runner = CoreOperatorClient(
            _BASE_URL,
            str(setup.token_file),
            transport=httpx.MockTransport(refuse_cancel),
            clock=setup.clock,
            sleep=setup.clock.sleep,
        )

        with pytest.raises(RunCancelled):
            await setup.run(is_cancelled=lambda: True)


class TestToken:
    async def test_sends_the_token_from_the_file(self, setup: _Setup):
        await setup.run()

        assert {request.headers["Authorization"] for request in setup.operator.requests} == {"Bearer first-token"}

    async def test_reads_the_token_again_for_each_request(self, setup: _Setup):
        setup.operator.statuses = ["running", "completed"]

        async def rotate_token() -> None:
            setup.token_file.write_text("second-token", encoding="utf-8")

        setup.operator.on_poll = rotate_token

        await setup.run()

        tokens = [request.headers["Authorization"] for request in setup.operator.requests]
        assert tokens[:2] == ["Bearer first-token", "Bearer first-token"]
        assert tokens[-1] == "Bearer second-token"

    async def test_is_unavailable_without_a_token_file(self, setup: _Setup):
        setup.token_file.unlink()

        with pytest.raises(RunnerUnavailable, match="cannot read the token for the core operator"):
            await setup.run()

        assert setup.operator.requests == []
