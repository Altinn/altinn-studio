"""Raw-REST Langfuse client for dataset-item upsert and score configs."""

from __future__ import annotations

import os
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

    def upsert_dataset_item(
        self,
        dataset_name: str,
        item_id: str,
        input: Any = None,
        expected_output: Any = None,
        metadata: Any = None,
        status: str | None = None,
    ) -> dict:
        body: dict[str, Any] = {"datasetName": dataset_name, "id": item_id}
        if status:
            body["status"] = status
        if input is not None:
            body["input"] = input
        if expected_output is not None:
            body["expectedOutput"] = expected_output
        if metadata is not None:
            body["metadata"] = metadata
        return self._post("/api/public/dataset-items", body)

    # -- scores -----------------------------------------------------------

    def models_by_connection(self) -> dict[str, list[str]]:
        """The models each LLM connection offers."""
        data = self._get("/api/public/llm-connections", limit=50)
        return {
            row["provider"]: sorted(row.get("customModels") or [])
            for row in data.get("data") or []
        }

    def score_configs_by_name(self) -> dict[str, dict]:
        data = self._get("/api/public/score-configs", limit=100)
        return {sc["name"]: sc for sc in data.get("data") or []}

    def create_score_config(self, name: str, data_type: str, **extra: Any) -> dict:
        return self._post(
            "/api/public/score-configs", {"name": name, "dataType": data_type, **extra}
        )


def assert_run_is_new(lf: "LangfuseApi", dataset: str, run_name: str) -> None:
    """Refuse to write into a run that already exists."""
    encoded = dataset.replace("/", "%2F")
    existing = lf._get(f"/api/public/datasets/{encoded}/runs", limit=50).get("data") or []
    for run in existing:
        if (run.get("name") or "") == run_name:
            raise SystemExit(
                f"A run named {run_name!r} already exists on {dataset!r}. Re-using the "
                "name merges the results rather than replacing them. Pick another name, "
                "or delete the run first."
            )
