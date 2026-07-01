"""Tests for the observability trace-cleanup route."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from api.main import app

TRACE_CLEANUP_PATH = "/api/observability/trace-cleanup"


class TestTraceCleanupEndpoint:
    def test_returns_deleted_count(self):
        with patch(
            "api.routes.observability.delete_expired_traces",
            new=AsyncMock(return_value=7),
        ) as mock_delete:
            response = TestClient(app).post(TRACE_CLEANUP_PATH)

        assert response.status_code == 200
        assert response.json() == {"deleted": 7}
        mock_delete.assert_awaited_once_with()
