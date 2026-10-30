"""Tests for the small Kubernetes API client of the runner Jobs."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from agents.core import kubernetes_api
from agents.core.kubernetes_api import Forbidden, KubernetesApiError, NotFound, QuotaExceeded, open_in_cluster

_NAMESPACE = "assistant-runners"


class _FakeApiServer:
    def __init__(self, answers: list[httpx.Response | Exception]) -> None:
        self.answers = answers
        self.requests: list[httpx.Request] = []

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


@pytest.fixture
def token_file(monkeypatch, tmp_path: Path) -> Path:
    monkeypatch.setattr(kubernetes_api, "SERVICE_ACCOUNT_FOLDER", tmp_path)
    token = tmp_path / "token"
    token.write_text("first-token\n", encoding="utf-8")
    return token


@pytest.fixture
def base_urls(monkeypatch) -> list[str]:
    monkeypatch.setenv("KUBERNETES_SERVICE_HOST", "10.0.0.1")
    monkeypatch.setenv("KUBERNETES_SERVICE_PORT", "443")
    return []


def _serve(monkeypatch, base_urls: list[str], server: _FakeApiServer) -> None:
    def create_client(base_url: str) -> httpx.AsyncClient:
        base_urls.append(base_url)
        return httpx.AsyncClient(base_url=base_url, transport=httpx.MockTransport(server.handle))

    monkeypatch.setattr(kubernetes_api, "_create_client", create_client)


def _status(code: int, message: str) -> httpx.Response:
    return httpx.Response(code, json={"kind": "Status", "status": "Failure", "message": message, "code": code})


class TestRequests:
    async def test_reads_the_token_for_each_request(self, monkeypatch, token_file: Path, base_urls: list[str]):
        server = _FakeApiServer([httpx.Response(200, json={}), httpx.Response(200, json={})])
        _serve(monkeypatch, base_urls, server)

        async with open_in_cluster() as api:
            await api.get_pod_template(_NAMESPACE, "assistant-runner")
            token_file.write_text("rotated-token\n", encoding="utf-8")
            await api.get_pod_template(_NAMESPACE, "assistant-runner")

        assert [request.headers["Authorization"] for request in server.requests] == [
            "Bearer first-token",
            "Bearer rotated-token",
        ]
        assert base_urls == ["https://10.0.0.1:443"]

    async def test_puts_an_ipv6_address_of_the_api_server_in_brackets(
        self, monkeypatch, token_file: Path, base_urls: list[str]
    ):
        monkeypatch.setenv("KUBERNETES_SERVICE_HOST", "fd00::1")
        _serve(monkeypatch, base_urls, _FakeApiServer([]))

        async with open_in_cluster():
            pass

        assert base_urls == ["https://[fd00::1]:443"]

    async def test_lists_the_pods_of_a_job_by_its_label(self, monkeypatch, token_file: Path, base_urls: list[str]):
        server = _FakeApiServer([httpx.Response(200, json={"items": [{"metadata": {"name": "pod"}}]})])
        _serve(monkeypatch, base_urls, server)

        async with open_in_cluster() as api:
            pods = await api.list_job_pods(_NAMESPACE, "assistant-runner-abcde")

        assert pods == [{"metadata": {"name": "pod"}}]
        request = server.requests[0]
        assert request.url.path == f"/api/v1/namespaces/{_NAMESPACE}/pods"
        assert request.url.params["labelSelector"] == "batch.kubernetes.io/job-name=assistant-runner-abcde"

    async def test_deletes_a_job_with_its_pod_in_the_background(
        self, monkeypatch, token_file: Path, base_urls: list[str]
    ):
        server = _FakeApiServer([httpx.Response(200, json={})])
        _serve(monkeypatch, base_urls, server)

        async with open_in_cluster() as api:
            await api.delete_job(_NAMESPACE, "assistant-runner-abcde")

        request = server.requests[0]
        assert request.method == "DELETE"
        assert request.url.path == f"/apis/batch/v1/namespaces/{_NAMESPACE}/jobs/assistant-runner-abcde"
        assert json.loads(request.content) == {"propagationPolicy": "Background"}

    async def test_a_job_that_is_already_gone_is_not_an_error(
        self, monkeypatch, token_file: Path, base_urls: list[str]
    ):
        _serve(monkeypatch, base_urls, _FakeApiServer([_status(404, 'jobs.batch "x" not found')]))

        async with open_in_cluster() as api:
            await api.delete_job(_NAMESPACE, "x")


class TestErrors:
    @pytest.mark.parametrize(
        ("answer", "error_type"),
        [
            (_status(404, 'podtemplates "assistant-runner" not found'), NotFound),
            (_status(403, "cannot get resource podtemplates"), Forbidden),
            (_status(403, 'jobs.batch "x" is forbidden: exceeded quota: assistant-runners'), QuotaExceeded),
            (_status(500, "etcd is gone"), KubernetesApiError),
            (httpx.ConnectError("Connection refused"), KubernetesApiError),
        ],
    )
    async def test_maps_answers_to_typed_errors(
        self, monkeypatch, token_file: Path, base_urls: list[str], answer, error_type
    ):
        _serve(monkeypatch, base_urls, _FakeApiServer([answer]))

        async with open_in_cluster() as api:
            with pytest.raises(error_type) as raised:
                await api.get_pod_template(_NAMESPACE, "assistant-runner")

        assert type(raised.value) is error_type
