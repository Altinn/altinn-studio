"""A small client for the Kubernetes API, for the runner Jobs of this service.

It uses the ServiceAccount token and CA that Kubernetes mounts in the pod.  The ServiceAccount of this service can only
read the runner PodTemplate, and create, monitor and delete Jobs in the runner namespace.
"""

from __future__ import annotations

import asyncio
import os
import ssl
from pathlib import Path
from types import TracebackType
from typing import Any

import httpx

# Kubernetes mounts the token and the CA of the ServiceAccount here.
SERVICE_ACCOUNT_FOLDER = Path("/var/run/secrets/kubernetes.io/serviceaccount")
_TOKEN_FILE = "token"
_CA_FILE = "ca.crt"
_REQUEST_TIMEOUT_SECONDS = 10

_NOT_FOUND = 404
_FORBIDDEN = 403
_FIRST_ERROR_STATUS = 400
# A 403 with this message comes from a ResourceQuota, not from RBAC.
_QUOTA_MESSAGE = "exceeded quota"
_JOB_NAME_LABEL = "batch.kubernetes.io/job-name"


class KubernetesApiError(Exception):
    """The Kubernetes API refused a request or did not answer."""


class NotFound(KubernetesApiError):
    """The object does not exist."""


class Forbidden(KubernetesApiError):
    """RBAC or an admission policy refused the request."""


class QuotaExceeded(KubernetesApiError):
    """A ResourceQuota refused the request.  It can succeed later."""


class KubernetesApi:
    """Use it with `async with`, so that the connections close after the run."""

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def __aenter__(self) -> KubernetesApi:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        await self._client.aclose()

    async def get_pod_template(self, namespace: str, name: str) -> dict[str, Any]:
        return await self._request("GET", f"/api/v1/namespaces/{namespace}/podtemplates/{name}")

    async def create_job(self, namespace: str, job: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", f"/apis/batch/v1/namespaces/{namespace}/jobs", json=job)

    async def list_job_pods(self, namespace: str, job_name: str) -> list[dict[str, Any]]:
        pods = await self._request(
            "GET",
            f"/api/v1/namespaces/{namespace}/pods",
            params={"labelSelector": f"{_JOB_NAME_LABEL}={job_name}"},
        )
        return pods.get("items", [])

    async def delete_job(self, namespace: str, name: str) -> None:
        """Deletes the Job and, in the background, its pod.  It is not an error if the Job does not exist."""
        try:
            await self._request(
                "DELETE",
                f"/apis/batch/v1/namespaces/{namespace}/jobs/{name}",
                json={"propagationPolicy": "Background"},
            )
        except NotFound:
            return

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        # Read the token for each request, because Kubernetes rotates it.
        token = await asyncio.to_thread(read_token)
        try:
            response = await self._client.request(
                method, path, json=json, params=params, headers={"Authorization": f"Bearer {token}"}
            )
        except httpx.HTTPError as error:
            raise KubernetesApiError(f"{method} {path}: {type(error).__name__}: {error}") from error
        if response.status_code < _FIRST_ERROR_STATUS:
            return response.json()
        raise _to_error(method, path, response)


def open_in_cluster() -> KubernetesApi:
    """Returns a client for the API server of the cluster that this pod runs in."""
    host = os.environ["KUBERNETES_SERVICE_HOST"]
    port = os.environ["KUBERNETES_SERVICE_PORT"]
    host = f"[{host}]" if ":" in host else host
    return KubernetesApi(_create_client(f"https://{host}:{port}"))


def read_token() -> str:
    return (SERVICE_ACCOUNT_FOLDER / _TOKEN_FILE).read_text(encoding="utf-8").strip()


def _create_client(base_url: str) -> httpx.AsyncClient:
    """This function is at module level so that the tests can replace the API server."""
    context = ssl.create_default_context(cafile=str(SERVICE_ACCOUNT_FOLDER / _CA_FILE))
    return httpx.AsyncClient(base_url=base_url, verify=context, timeout=_REQUEST_TIMEOUT_SECONDS)


def _to_error(method: str, path: str, response: httpx.Response) -> KubernetesApiError:
    message = _status_message(response)
    detail = f"{method} {path} answered {response.status_code}: {message}"
    if response.status_code == _NOT_FOUND:
        return NotFound(detail)
    if response.status_code == _FORBIDDEN and _QUOTA_MESSAGE in message:
        return QuotaExceeded(detail)
    if response.status_code == _FORBIDDEN:
        return Forbidden(detail)
    return KubernetesApiError(detail)


def _status_message(response: httpx.Response) -> str:
    """Returns the message of a Kubernetes `Status` answer, or the text of another answer."""
    try:
        return str(response.json().get("message", response.text))
    except ValueError:
        return response.text
