"""Thin raw-REST Langfuse client for the benchmark runner.

Deliberately not the Langfuse SDK: the self-hosted server (v3.x) omits
fields newer SDK models require (`media_references` pydantic failures),
and the runner only needs six endpoints.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

import httpx


class LangfuseApi:
    def __init__(
        self,
        host: str | None = None,
        public_key: str | None = None,
        secret_key: str | None = None,
    ):
        # The agents service names the host LANGFUSE_BASE_URL; accept both.
        host = host or os.environ.get("LANGFUSE_HOST") or os.environ.get("LANGFUSE_BASE_URL")
        public_key = public_key or os.environ.get("LANGFUSE_PUBLIC_KEY")
        secret_key = secret_key or os.environ.get("LANGFUSE_SECRET_KEY")
        missing = [
            name
            for name, value in [
                ("LANGFUSE_HOST (or LANGFUSE_BASE_URL)", host),
                ("LANGFUSE_PUBLIC_KEY", public_key),
                ("LANGFUSE_SECRET_KEY", secret_key),
            ]
            if not value
        ]
        if missing:
            raise SystemExit(
                "Missing Langfuse configuration: "
                + ", ".join(missing)
                + " — set them in benchmarks/.env or the environment."
            )
        self.host = host.rstrip("/")
        self._client = httpx.Client(
            base_url=self.host, auth=(public_key, secret_key), timeout=60
        )

    def _get(self, path: str, **params: Any) -> dict:
        response = self._client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    def _post(self, path: str, body: dict) -> dict:
        response = self._client.post(path, json=body)
        response.raise_for_status()
        return response.json()

    # -- datasets ---------------------------------------------------------

    def dataset_items(self, dataset_name: str) -> list[dict]:
        items: list[dict] = []
        page = 1
        while True:
            data = self._get(
                "/api/public/dataset-items", datasetName=dataset_name, page=page, limit=50
            )
            items.extend(data.get("data") or [])
            if page >= (data.get("meta") or {}).get("totalPages", 1):
                break
            page += 1
        return [item for item in items if item.get("status") != "ARCHIVED"]

    def upsert_dataset_item(
        self,
        dataset_name: str,
        item_id: str,
        input: Any = None,
        expected_output: Any = None,
        metadata: Any = None,
    ) -> dict:
        body: dict[str, Any] = {"datasetName": dataset_name, "id": item_id}
        if input is not None:
            body["input"] = input
        if expected_output is not None:
            body["expectedOutput"] = expected_output
        if metadata is not None:
            body["metadata"] = metadata
        return self._post("/api/public/dataset-items", body)

    def create_dataset_run_item(
        self, run_name: str, dataset_item_id: str, trace_id: str, run_description: str = ""
    ) -> dict:
        return self._post(
            "/api/public/dataset-run-items",
            {
                "runName": run_name,
                "datasetItemId": dataset_item_id,
                "traceId": trace_id,
                "runDescription": run_description,
            },
        )

    # -- scores -----------------------------------------------------------

    def score_configs_by_name(self) -> dict[str, dict]:
        data = self._get("/api/public/score-configs", limit=100)
        return {sc["name"]: sc for sc in data.get("data") or []}

    def create_score_config(self, name: str, data_type: str, **extra: Any) -> dict:
        return self._post(
            "/api/public/score-configs", {"name": name, "dataType": data_type, **extra}
        )

    def create_score(
        self,
        trace_id: str,
        name: str,
        value: float,
        data_type: str,
        comment: str = "",
        config_id: str | None = None,
    ) -> None:
        body: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "traceId": trace_id,
            "name": name,
            "value": value,
            "dataType": data_type,
            "comment": comment,
        }
        if config_id:
            body["configId"] = config_id
        self._post("/api/public/scores", body)

    # -- traces -----------------------------------------------------------

    def find_trace_for_session(
        self, session_id: str, trace_name: str, from_timestamp: str
    ) -> str | None:
        """Find the workflow trace whose metadata carries `session_id`.

        The workflow root span doesn't set a Langfuse session, so we page
        recent traces by name and match on metadata client-side.
        """
        page = 1
        while page <= 10:
            data = self._get(
                "/api/public/traces",
                name=trace_name,
                fromTimestamp=from_timestamp,
                orderBy="timestamp.desc",
                page=page,
                limit=50,
            )
            for trace in data.get("data") or []:
                if (trace.get("metadata") or {}).get("session_id") == session_id:
                    return trace.get("id")
            if page >= (data.get("meta") or {}).get("totalPages", 1):
                break
            page += 1
        return None
