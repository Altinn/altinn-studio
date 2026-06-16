"""Tests for the LLM cost metrics API route."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from api.main import app

FETCH_TARGET = "metrics.token_usage.fetch_traces_and_observations"


def make_raw_trace(trace_id, user_id, app_name):
    return {
        "id": trace_id,
        "userId": user_id,
        "metadata": {"app_name": app_name},
    }


def make_raw_observation(obs_id, trace_id, start_time, input_tokens, output_tokens):
    usage = {
        "input": input_tokens,
        "output": output_tokens,
        "total": input_tokens + output_tokens,
    }
    return {
        "id": obs_id,
        "traceId": trace_id,
        "startTime": start_time,
        "model": "gpt-4o",
        "usage": usage,
        "usageDetails": usage,
    }


def get_row(rows, service_owner_code, date):
    return next(
        row
        for row in rows
        if row["serviceownercode"] == service_owner_code and row["date"] == date
    )


class TestGetDailyUsage:
    def test_groups_token_data_by_day_service_owner_and_app(self):
        traces = [
            make_raw_trace("trace-1", "ttd", "ttd-app"),
            make_raw_trace("trace-2", "skd", "skd-app"),
        ]
        observations = [
            make_raw_observation("obs-1", "trace-1", "2026-05-03T10:00:00Z", 100, 50),
            make_raw_observation("obs-2", "trace-2", "2026-05-03T11:00:00Z", 200, 80),
            make_raw_observation("obs-3", "trace-2", "2026-05-04T11:00:00Z", 300, 90),
        ]
        with patch(FETCH_TARGET, new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = (traces, observations)

            response = TestClient(app).get("/api/metrics/tokens/daily")

        assert response.status_code == 200
        rows = response.json()
        assert len(rows) == 3

        ttd_row = get_row(rows, "ttd", "2026-05-03")
        assert ttd_row["serviceresourceid"] == "app_ttd_ttd-app"
        assert ttd_row["total_tokens"] == 150

        skd_first_day = get_row(rows, "skd", "2026-05-03")
        assert skd_first_day["serviceresourceid"] == "app_skd_skd-app"
        assert skd_first_day["total_tokens"] == 280

        skd_second_day = get_row(rows, "skd", "2026-05-04")
        assert skd_second_day["total_tokens"] == 390

    def test_returns_empty_array_when_no_data_for_the_day(self):
        with patch(FETCH_TARGET, new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = ([], [])

            response = TestClient(app).get("/api/metrics/tokens/daily")

        assert response.status_code == 200
        assert response.json() == []
