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
            "messagesender": None,
            "serviceresourceid": "my-app",
            "serviceresourcetitle": "My App",
            "recipienttype": None,
            "costcenter": None,
            "messagecount": None,
            "instancecount": None,
            "databasestoragebytes": None,
            "attachmentstoragebytes": None,
            "loaded_at": "2026-05-11T00:00:00.000Z",
            "source": "https://langfuse.example.com",
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
