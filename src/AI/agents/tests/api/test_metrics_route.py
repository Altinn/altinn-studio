"""Tests for the LLM cost metrics API route."""
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from api.main import app


class TestGetLlmCostsHappyPath:
    def test_returns_aggregated_rows(self):
        sample_row = {
            "date": "2026-05-10",
            "year": "2026",
            "month": "05",
            "day": "10",
            "serviceownerorgnr": None,
            "serviceownercode": "ttd",
            "messagesender": "ttd",
            "serviceresourceid": "my-app",
            "serviceresourcetitle": None,
            "recipienttype": None,
            "costcenter": None,
            "messagecount": None,
            "instancecount": None,
            "databasestoragebytes": None,
            "attachmentstoragebytes": None,
            "loaded_at": "2026-05-11T00:00:00.000Z",
            "source_file": "https://langfuse.example.com",
            "input_tokens": 100,
            "output_tokens": 50,
            "total_tokens": 150,
            "tokens_by_model": {"gpt-4o": {"input": 100, "output": 50, "total": 150}},
        }
        with patch(
            "api.routes.metrics.get_previous_day_token_usage",
            new_callable=AsyncMock,
        ) as mock_fetch:
            mock_fetch.return_value = [sample_row]

            response = TestClient(app).get("/api/metrics/tokens/daily")

        assert response.status_code == 200
        assert response.json() == [sample_row]
        mock_fetch.assert_awaited_once_with()


class TestGetLlmCostsErrorMapping:
    def test_langfuse_not_initialized_returns_503(self):
        with patch(
            "api.routes.metrics.get_previous_day_token_usage",
            new_callable=AsyncMock,
            side_effect=RuntimeError("Langfuse client is not initialized"),
        ):
            response = TestClient(app).get("/api/metrics/tokens/daily")

        assert response.status_code == 503

    def test_upstream_error_returns_502(self):
        with patch(
            "api.routes.metrics.get_previous_day_token_usage",
            new_callable=AsyncMock,
            side_effect=Exception("Langfuse API 500"),
        ):
            response = TestClient(app).get("/api/metrics/tokens/daily")

        assert response.status_code == 502
