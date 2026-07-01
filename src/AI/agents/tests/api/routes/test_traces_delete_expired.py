import json
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from api.main import app
from services.traces.delete_expired_traces import PAGE_SIZE

TRACE_CLEANUP_PATH = "/api/traces/delete-expired"
LANGFUSE_CONFIG = SimpleNamespace(
    LANGFUSE_PUBLIC_KEY="pk-test",
    LANGFUSE_SECRET_KEY="sk-test",
    LANGFUSE_HOST="https://langfuse.test",
)


class TestTraceCleanupEndpoint:
    def test_deletes_expired_traces(self):
        remaining = ["trace-0", "trace-1", "trace-2"]
        deleted_batches: list[list[str]] = []

        with _mock_langfuse(_stateful_handler(remaining, deleted_batches)):
            response = TestClient(app).post(TRACE_CLEANUP_PATH)

        assert response.status_code == 200
        assert response.json() == {"deleted": 3}
        assert deleted_batches == [["trace-0", "trace-1", "trace-2"]]
        assert remaining == []

    def test_returns_zero_when_no_expired_traces(self):
        with _mock_langfuse(_stateful_handler([], [])):
            response = TestClient(app).post(TRACE_CLEANUP_PATH)

        assert response.status_code == 200
        assert response.json() == {"deleted": 0}


def _stateful_handler(remaining: list[str], deleted_batches: list[list[str]]):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "DELETE":
            batch = json.loads(request.content)["traceIds"]
            deleted_batches.append(batch)
            for trace_id in batch:
                remaining.remove(trace_id)
            return httpx.Response(200, json={})
        page = [{"id": trace_id} for trace_id in remaining[:PAGE_SIZE]]
        return httpx.Response(200, json={"data": page})

    return handler


@contextmanager
def _mock_langfuse(handler):
    real_async_client = httpx.AsyncClient

    def with_mock_transport(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_async_client(*args, **kwargs)

    with (
        patch("services.traces.delete_expired_traces.get_config", return_value=LANGFUSE_CONFIG),
        patch(
            "services.traces.delete_expired_traces.httpx.AsyncClient",
            side_effect=with_mock_transport,
        ),
    ):
        yield
