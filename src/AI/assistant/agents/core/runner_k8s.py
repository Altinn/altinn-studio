"""Runs app code for this service in a Kubernetes Job: one Job, one pod and one microVM for each run.

The pod runs the job host from `src/AI/assistant-runner`.  This service creates the Job from the PodTemplate
`assistant-runner` in the runner namespace, waits until the pod is Ready, sends the app to the pod over HTTP, and
deletes the Job.  The admission policy of the runner namespace accepts only a Job with the pod of that PodTemplate.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from typing import Any

import httpx

from agents.core import kubernetes_api
from agents.core.kubernetes_api import Forbidden, KubernetesApi, KubernetesApiError, NotFound, QuotaExceeded
from agents.core.runner import RunnerProgress, RunnerUnavailable, RunResult, archive_app_files, to_run_result

logger = logging.getLogger(__name__)

POD_TEMPLATE_NAME = "assistant-runner"
_JOB_NAME_PREFIX = "assistant-runner-"
_RUN_KIND_LABEL = "altinn.studio/run-kind"
_UPGRADE_RUN_KIND = "upgrade-v9"
_UPGRADE_PATH = "/api/v1/upgrades/v9"
_JOB_HOST_PORT = 8080
_ARCHIVE_CONTENT_TYPE = "application/gzip"
_OK = 200

# The admission policy of the runner namespace requires these values.
_BACKOFF_LIMIT = 0
_ACTIVE_DEADLINE_SECONDS = 1200
_TTL_SECONDS_AFTER_FINISHED = 60

# A run that has no Ready pod after this time fails.  The Job deadline also covers this time.
_START_TIMEOUT_SECONDS = 5 * 60
_POLL_INTERVAL_SECONDS = 1
# The Job controller creates the pod within a few seconds.  A Job without a pod after this time waits for room.
_POD_CREATE_GRACE_SECONDS = 3
# The job host stops the upgrade after 11 minutes, so the answer comes before this timeout.
_UPGRADE_TIMEOUT_SECONDS = 12 * 60
_CONNECT_TIMEOUT_SECONDS = 10

_NO_RUNNER = "this deployment has no assistant runner"


class KubernetesJobRunner:
    def __init__(self, namespace: str) -> None:
        self._namespace = namespace

    async def upgrade(self, repo_path: str, report_progress: Callable[[RunnerProgress], None]) -> RunResult:
        return await self._run(_UPGRADE_RUN_KIND, _UPGRADE_PATH, repo_path, _UPGRADE_TIMEOUT_SECONDS, report_progress)

    async def _run(
        self,
        run_kind: str,
        path: str,
        repo_path: str,
        timeout_seconds: int,
        report_progress: Callable[[RunnerProgress], None],
    ) -> RunResult:
        archive = await asyncio.to_thread(archive_app_files, repo_path)
        progress = _OnceReporter(report_progress)
        try:
            api = kubernetes_api.open_in_cluster()
        except (KeyError, OSError) as error:
            raise RunnerUnavailable(f"cannot reach the Kubernetes API: {error}") from error
        async with api:
            job_name = await _start_job(api, self._namespace, run_kind, progress)
            try:
                pod_ip = await _wait_until_ready(api, self._namespace, job_name, progress)
                progress.report(RunnerProgress.RUNNING)
                return await _send_job_request(pod_ip, path, archive, timeout_seconds)
            finally:
                await _delete_job(api, self._namespace, job_name)


class _OnceReporter:
    """Reports each progress state at most once."""

    def __init__(self, report: Callable[[RunnerProgress], None]) -> None:
        self._report = report
        self._reported: set[RunnerProgress] = set()

    def report(self, state: RunnerProgress) -> None:
        if state not in self._reported:
            self._reported.add(state)
            self._report(state)


async def _start_job(api: KubernetesApi, namespace: str, run_kind: str, progress: _OnceReporter) -> str:
    """Creates the Job from the PodTemplate, and returns its name.  When the quota of the namespace has no room for
    another Job, it waits for room."""
    try:
        template = await api.get_pod_template(namespace, POD_TEMPLATE_NAME)
    except (NotFound, Forbidden) as error:
        raise RunnerUnavailable(_NO_RUNNER) from error
    except KubernetesApiError as error:
        raise RunnerUnavailable(f"cannot read the runner PodTemplate: {error}") from error
    job = _job_from(template, run_kind)
    deadline = time.monotonic() + _START_TIMEOUT_SECONDS
    while True:
        try:
            created = await api.create_job(namespace, job)
            return created["metadata"]["name"]
        except QuotaExceeded as error:
            if time.monotonic() > deadline:
                raise RunnerUnavailable(f"no runner was free for {_START_TIMEOUT_SECONDS} seconds") from error
            progress.report(RunnerProgress.WAITING)
            await asyncio.sleep(_POLL_INTERVAL_SECONDS)
        except KubernetesApiError as error:
            raise RunnerUnavailable(f"cannot start a runner: {error}") from error


def _job_from(template: dict[str, Any], run_kind: str) -> dict[str, Any]:
    """A Job with the pod of the PodTemplate, as the admission policy requires.  The labels have no developer data."""
    return {
        "apiVersion": "batch/v1",
        "kind": "Job",
        "metadata": {
            "generateName": _JOB_NAME_PREFIX,
            "labels": {"app.kubernetes.io/name": POD_TEMPLATE_NAME, _RUN_KIND_LABEL: run_kind},
        },
        "spec": {
            "backoffLimit": _BACKOFF_LIMIT,
            "activeDeadlineSeconds": _ACTIVE_DEADLINE_SECONDS,
            "ttlSecondsAfterFinished": _TTL_SECONDS_AFTER_FINISHED,
            "template": template["template"],
        },
    }


async def _wait_until_ready(api: KubernetesApi, namespace: str, job_name: str, progress: _OnceReporter) -> str:
    """Returns the IP address of the pod when it is Ready."""
    started = time.monotonic()
    while True:
        try:
            pods = await api.list_job_pods(namespace, job_name)
        except KubernetesApiError as error:
            raise RunnerUnavailable(f"cannot follow the runner: {error}") from error
        pod = pods[0] if pods else None
        if pod is not None:
            _raise_if_stopped(pod)
            pod_ip = _ready_pod_ip(pod)
            if pod_ip:
                return pod_ip
        if _is_waiting_for_room(pod, time.monotonic() - started):
            progress.report(RunnerProgress.WAITING)
        if time.monotonic() - started > _START_TIMEOUT_SECONDS:
            raise RunnerUnavailable(f"the runner did not start in {_START_TIMEOUT_SECONDS} seconds")
        await asyncio.sleep(_POLL_INTERVAL_SECONDS)


def _raise_if_stopped(pod: dict[str, Any]) -> None:
    status = pod.get("status", {})
    phase = status.get("phase")
    if phase in ("Succeeded", "Failed"):
        reason = status.get("reason") or status.get("message") or "no reason"
        raise RunnerUnavailable(f"the runner pod stopped before it was ready ({phase}: {reason})")


def _ready_pod_ip(pod: dict[str, Any]) -> str | None:
    status = pod.get("status", {})
    conditions = status.get("conditions", [])
    is_ready = any(condition.get("type") == "Ready" and condition.get("status") == "True" for condition in conditions)
    return status.get("podIP") if is_ready else None


def _is_waiting_for_room(pod: dict[str, Any] | None, elapsed_seconds: float) -> bool:
    """A run waits for room when the quota stops the Job controller from creating the pod, or when no sandbox node
    has room for the pod."""
    if pod is None:
        return elapsed_seconds >= _POD_CREATE_GRACE_SECONDS
    conditions = pod.get("status", {}).get("conditions", [])
    return any(
        condition.get("type") == "PodScheduled" and condition.get("reason") == "Unschedulable"
        for condition in conditions
    )


async def _send_job_request(pod_ip: str, path: str, archive: bytes, timeout_seconds: int) -> RunResult:
    host = f"[{pod_ip}]" if ":" in pod_ip else pod_ip
    try:
        async with _create_job_host_client(f"http://{host}:{_JOB_HOST_PORT}", timeout_seconds) as client:
            response = await client.post(path, content=archive, headers={"Content-Type": _ARCHIVE_CONTENT_TYPE})
    except httpx.ReadTimeout:
        return RunResult(exit_code=None, stdout="", stderr="")
    except httpx.HTTPError as error:
        raise RunnerUnavailable(f"the runner did not answer ({type(error).__name__}: {error})") from error
    if response.status_code != _OK:
        raise RunnerUnavailable(f"the runner answered {response.status_code}: {response.text}")
    return to_run_result(response.json())


def _create_job_host_client(base_url: str, timeout_seconds: int) -> httpx.AsyncClient:
    """Module level, so that the tests can replace the job host."""
    return httpx.AsyncClient(
        base_url=base_url, timeout=httpx.Timeout(timeout_seconds, connect=_CONNECT_TIMEOUT_SECONDS)
    )


async def _delete_job(api: KubernetesApi, namespace: str, job_name: str) -> None:
    """The Job deadline and the TTL remove the Job when this delete fails."""
    try:
        await api.delete_job(namespace, job_name)
    except KubernetesApiError:
        logger.warning("Could not delete the runner Job %s; its deadline and TTL remove it", job_name, exc_info=True)
