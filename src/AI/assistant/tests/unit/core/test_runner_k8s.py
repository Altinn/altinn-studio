"""Tests for the runner that starts one Kubernetes Job for each run.

`_FakeCluster` plays the Kubernetes API server and the job host in the pod, over `httpx.MockTransport`.
"""

from __future__ import annotations

import gzip
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx
import pytest

from agents.core import kubernetes_api, runner_k8s
from agents.core.runner import RunnerProgress, RunnerUnavailable
from agents.core.runner_k8s import KubernetesJobRunner

from .git_repo import create_committed_repo

_NAMESPACE = "assistant-runners"
_JOB_NAME = "assistant-runner-abcde"
_POD_IP = "10.244.0.7"
_TEMPLATE = {
    "metadata": {"name": "assistant-runner", "namespace": _NAMESPACE},
    "template": {
        "metadata": {"labels": {"app": "altinn-assistant-runner"}},
        "spec": {"restartPolicy": "Never", "containers": [{"name": "job-host", "image": "job-host@sha256:abc"}]},
    },
}
_ANSWER = {"exitCode": 0, "timedOut": False, "stdout": "{}", "stderr": "", "patch": "ZGlmZgo="}


def _pod(*, ready: bool = False, phase: str = "Pending", unschedulable: bool = False) -> dict[str, Any]:
    conditions = [{"type": "Ready", "status": "True" if ready else "False"}]
    if unschedulable:
        conditions.append({"type": "PodScheduled", "status": "False", "reason": "Unschedulable"})
    return {"status": {"phase": phase, "podIP": _POD_IP, "conditions": conditions}}


_READY_POD = _pod(ready=True, phase="Running")


def _status(code: int, message: str) -> httpx.Response:
    return httpx.Response(code, json={"kind": "Status", "status": "Failure", "message": message, "code": code})


@dataclass
class _FakeCluster:
    template_answer: httpx.Response = field(default_factory=lambda: httpx.Response(200, json=_TEMPLATE))
    # Answers to the Job creation before it succeeds, for example a refusal from the quota.
    create_refusals: list[httpx.Response] = field(default_factory=list)
    # The pods of the Job in each poll.  The last answer repeats.
    pod_polls: list[list[dict[str, Any]]] = field(default_factory=lambda: [[_READY_POD]])
    job_host_answer: httpx.Response | Exception = field(default_factory=lambda: httpx.Response(200, json=_ANSWER))
    created_jobs: list[dict[str, Any]] = field(default_factory=list)
    deleted_jobs: list[str] = field(default_factory=list)
    job_requests: list[httpx.Request] = field(default_factory=list)

    def handle_api(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == f"/api/v1/namespaces/{_NAMESPACE}/podtemplates/assistant-runner":
            return self.template_answer
        if request.method == "POST" and path == f"/apis/batch/v1/namespaces/{_NAMESPACE}/jobs":
            if self.create_refusals:
                return self.create_refusals.pop(0)
            self.created_jobs.append(json.loads(request.content))
            return httpx.Response(201, json={"metadata": {"name": _JOB_NAME}})
        if path == f"/api/v1/namespaces/{_NAMESPACE}/pods":
            pods = self.pod_polls.pop(0) if len(self.pod_polls) > 1 else self.pod_polls[0]
            return httpx.Response(200, json={"items": pods})
        if request.method == "DELETE" and path == f"/apis/batch/v1/namespaces/{_NAMESPACE}/jobs/{_JOB_NAME}":
            self.deleted_jobs.append(_JOB_NAME)
            return httpx.Response(200, json={})
        return httpx.Response(500, json={"message": f"unexpected request {request.method} {path}"})

    def handle_job_host(self, request: httpx.Request) -> httpx.Response:
        self.job_requests.append(request)
        if isinstance(self.job_host_answer, Exception):
            raise self.job_host_answer
        return self.job_host_answer


@pytest.fixture
def cluster(monkeypatch, tmp_path_factory: pytest.TempPathFactory) -> _FakeCluster:
    fake = _FakeCluster()
    service_account = tmp_path_factory.mktemp("serviceaccount")
    (service_account / "token").write_text("token", encoding="utf-8")
    monkeypatch.setattr(kubernetes_api, "SERVICE_ACCOUNT_FOLDER", service_account)
    monkeypatch.setenv("KUBERNETES_SERVICE_HOST", "10.0.0.1")
    monkeypatch.setenv("KUBERNETES_SERVICE_PORT", "443")
    monkeypatch.setattr(
        kubernetes_api,
        "_create_client",
        lambda base_url: httpx.AsyncClient(base_url=base_url, transport=httpx.MockTransport(fake.handle_api)),
    )
    monkeypatch.setattr(
        runner_k8s,
        "_create_job_host_client",
        lambda base_url, timeout_seconds: httpx.AsyncClient(
            base_url=base_url, transport=httpx.MockTransport(fake.handle_job_host)
        ),
    )
    monkeypatch.setattr(runner_k8s, "_POLL_INTERVAL_SECONDS", 0)
    monkeypatch.setattr(runner_k8s, "_POD_CREATE_GRACE_SECONDS", 0)
    return fake


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    return create_committed_repo(tmp_path, {"App/App.csproj": "<Project />"})


async def _upgrade(repo: Path, progress: list[RunnerProgress] | None = None):
    reported = progress if progress is not None else []
    return await KubernetesJobRunner(_NAMESPACE).upgrade(str(repo), reported.append)


class TestUpgrade:
    async def test_runs_the_upgrade_in_a_job_with_the_pod_of_the_template(self, cluster: _FakeCluster, repo: Path):
        progress: list[RunnerProgress] = []

        result = await _upgrade(repo, progress)

        assert result.exit_code == 0
        assert result.patch == b"diff\n"
        assert progress == [RunnerProgress.RUNNING]
        assert cluster.created_jobs == [
            {
                "apiVersion": "batch/v1",
                "kind": "Job",
                "metadata": {
                    "generateName": "assistant-runner-",
                    "labels": {"app.kubernetes.io/name": "assistant-runner", "altinn.studio/run-kind": "upgrade-v9"},
                },
                "spec": {
                    "backoffLimit": 0,
                    "activeDeadlineSeconds": 1200,
                    "ttlSecondsAfterFinished": 60,
                    "template": _TEMPLATE["template"],
                },
            }
        ]
        assert cluster.deleted_jobs == [_JOB_NAME]

    async def test_sends_the_app_as_a_gzip_archive_to_the_pod(self, cluster: _FakeCluster, repo: Path):
        await _upgrade(repo)

        request = cluster.job_requests[0]
        assert str(request.url) == f"http://{_POD_IP}:8080/api/v1/upgrades/v9"
        assert request.headers["Content-Type"] == "application/gzip"
        assert gzip.decompress(request.content)

    async def test_waits_for_room_in_the_quota_and_reports_the_wait_once(self, cluster: _FakeCluster, repo: Path):
        quota = 'jobs.batch "assistant-runner-x" is forbidden: exceeded quota: assistant-runners'
        cluster.create_refusals = [_status(403, quota), _status(403, quota)]
        progress: list[RunnerProgress] = []

        result = await _upgrade(repo, progress)

        assert result.exit_code == 0
        assert progress == [RunnerProgress.WAITING, RunnerProgress.RUNNING]

    @pytest.mark.parametrize(
        "waiting_pods",
        [[], [_pod(unschedulable=True)]],
        ids=["no pod yet", "pod unschedulable"],
    )
    async def test_reports_a_wait_until_the_pod_gets_room(self, cluster: _FakeCluster, repo: Path, waiting_pods):
        cluster.pod_polls = [waiting_pods, waiting_pods, [_READY_POD]]
        progress: list[RunnerProgress] = []

        await _upgrade(repo, progress)

        assert progress == [RunnerProgress.WAITING, RunnerProgress.RUNNING]

    async def test_does_not_report_a_wait_while_the_pod_starts(self, cluster: _FakeCluster, repo: Path):
        cluster.pod_polls = [[_pod()], [_pod(phase="Running")], [_READY_POD]]
        progress: list[RunnerProgress] = []

        await _upgrade(repo, progress)

        assert progress == [RunnerProgress.RUNNING]

    async def test_has_no_exit_code_when_the_answer_does_not_come_in_time(self, cluster: _FakeCluster, repo: Path):
        cluster.job_host_answer = httpx.ReadTimeout("timed out")

        result = await _upgrade(repo)

        assert result.timed_out
        assert cluster.deleted_jobs == [_JOB_NAME]


class TestUnavailable:
    @pytest.mark.parametrize(
        "template_answer",
        [_status(404, 'podtemplates "assistant-runner" not found'), _status(403, "cannot get podtemplates")],
        ids=["no template", "no permission"],
    )
    async def test_has_no_runner_without_the_template(self, cluster: _FakeCluster, repo: Path, template_answer):
        cluster.template_answer = template_answer

        with pytest.raises(RunnerUnavailable, match="this deployment has no assistant runner"):
            await _upgrade(repo)

        assert cluster.created_jobs == []

    async def test_has_no_runner_outside_a_cluster(self, cluster: _FakeCluster, repo: Path, monkeypatch):
        monkeypatch.delenv("KUBERNETES_SERVICE_HOST")

        with pytest.raises(RunnerUnavailable, match="cannot reach the Kubernetes API"):
            await _upgrade(repo)

    async def test_gives_up_when_the_pod_does_not_start_in_time(self, cluster: _FakeCluster, repo: Path, monkeypatch):
        monkeypatch.setattr(runner_k8s, "_START_TIMEOUT_SECONDS", -1)
        cluster.pod_polls = [[_pod(unschedulable=True)]]

        with pytest.raises(RunnerUnavailable, match="did not start"):
            await _upgrade(repo)

        assert cluster.deleted_jobs == [_JOB_NAME]

    async def test_fails_when_the_pod_stops_before_it_is_ready(self, cluster: _FakeCluster, repo: Path):
        cluster.pod_polls = [[{"status": {"phase": "Failed", "reason": "DeadlineExceeded"}}]]

        with pytest.raises(RunnerUnavailable, match=r"stopped before it was ready \(Failed: DeadlineExceeded\)"):
            await _upgrade(repo)

        assert cluster.deleted_jobs == [_JOB_NAME]

    async def test_fails_when_the_job_host_refuses_the_app(self, cluster: _FakeCluster, repo: Path):
        cluster.job_host_answer = httpx.Response(409, text="This job host has already taken its job.")

        with pytest.raises(RunnerUnavailable, match="the runner answered 409"):
            await _upgrade(repo)

        assert cluster.deleted_jobs == [_JOB_NAME]

    async def test_fails_when_the_job_host_does_not_answer(self, cluster: _FakeCluster, repo: Path):
        cluster.job_host_answer = httpx.ConnectError("Connection refused")

        with pytest.raises(RunnerUnavailable, match=r"the runner did not answer \(ConnectError"):
            await _upgrade(repo)

        assert cluster.deleted_jobs == [_JOB_NAME]

    async def test_fails_when_the_admission_policy_refuses_the_job(self, cluster: _FakeCluster, repo: Path):
        cluster.create_refusals = [_status(403, "denied request: The pod spec of the Job must be the pod spec")]

        with pytest.raises(RunnerUnavailable, match="cannot start a runner"):
            await _upgrade(repo)

        assert cluster.deleted_jobs == []
