"""Tests for the LLM cost aggregator."""

import logging

import pytest

from services.token_usage.aggregate import Observation, Trace, aggregate_token_usage

LOADED_AT = "2026-05-04T02:00:00.000Z"
SERVICE_OWNER = "ttd"
DEFAULT_TRACE_ID = "trace-1"


def make_observation(
    *,
    trace_id=DEFAULT_TRACE_ID,
    obs_id="obs-1",
    start_time="2026-05-03T10:00:00Z",
    model="gpt-4o",
    input_tokens=100,
    output_tokens=50,
    extra_usage_details=None,
) -> Observation:
    usage = {
        "input": input_tokens,
        "output": output_tokens,
        "total": input_tokens + output_tokens,
    }
    usage_details = {
        "input": input_tokens,
        "output": output_tokens,
        "total": input_tokens + output_tokens,
        **(extra_usage_details or {}),
    }
    return {
        "id": obs_id,
        "trace_id": trace_id,
        "start_time": start_time,
        "model": model,
        "usage": usage,
        "usage_details": usage_details,
    }


def make_trace(
    *,
    trace_id=DEFAULT_TRACE_ID,
    app_name="ttd-my-app",
    user_id=SERVICE_OWNER,
) -> Trace:
    metadata = {"app_name": app_name} if app_name is not None else {}
    return {"id": trace_id, "user_id": user_id, "metadata": metadata}


class TestBucketing:
    def test_buckets_observations_into_one_row_per_owner_app_date(self):
        observations = [make_observation()]
        traces = {DEFAULT_TRACE_ID: make_trace()}

        rows = aggregate_token_usage(observations, traces, LOADED_AT)

        assert len(rows) == 1
        assert rows[0]["date"] == "2026-05-03"
        assert rows[0]["serviceownercode"] == SERVICE_OWNER
        assert rows[0]["serviceresourceid"] == "app_ttd_ttd-my-app"
        assert rows[0]["messagesender"] is None

    def test_splits_observations_across_different_days(self):
        observations = [
            make_observation(trace_id="trace-1", start_time="2026-05-03T10:00:00Z"),
            make_observation(trace_id="trace-2", start_time="2026-05-04T10:00:00Z"),
        ]
        traces = {
            "trace-1": make_trace(trace_id="trace-1"),
            "trace-2": make_trace(trace_id="trace-2"),
        }

        rows = aggregate_token_usage(observations, traces, LOADED_AT)

        assert len(rows) == 2
        assert sorted(row["date"] for row in rows) == ["2026-05-03", "2026-05-04"]

    def test_one_row_per_service_owner(self):
        observations = [
            make_observation(trace_id="trace-ttd", start_time="2026-05-03T10:00:00Z"),
            make_observation(trace_id="trace-skd", start_time="2026-05-03T11:00:00Z"),
        ]
        traces = {
            "trace-ttd": make_trace(
                trace_id="trace-ttd", user_id="ttd", app_name="ttd-app"
            ),
            "trace-skd": make_trace(
                trace_id="trace-skd", user_id="skd", app_name="skd-app"
            ),
        }

        rows = aggregate_token_usage(observations, traces, LOADED_AT)

        assert len(rows) == 2
        assert sorted(row["serviceownercode"] for row in rows) == ["skd", "ttd"]


class TestTokenSums:
    def test_sums_tokens_across_multiple_observations(self):
        observations = [
            make_observation(trace_id="trace-1", input_tokens=100, output_tokens=50),
            make_observation(trace_id="trace-2", input_tokens=200, output_tokens=100),
        ]
        traces = {
            "trace-1": make_trace(trace_id="trace-1"),
            "trace-2": make_trace(trace_id="trace-2"),
        }

        [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert row["input_tokens"] == 300
        assert row["output_tokens"] == 150
        assert row["total_tokens"] == 450


class TestDateParts:
    def test_year_month_day_are_string_parts_of_date(self):
        observations = [make_observation(start_time="2026-05-03T10:00:00Z")]
        traces = {DEFAULT_TRACE_ID: make_trace()}

        [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert row["year"] == "2026"
        assert row["month"] == "05"
        assert row["day"] == "03"

    def test_converts_offset_timestamp_to_utc_day(self):
        # 00:30 at +02:00 is 22:30 UTC the previous day.
        observations = [make_observation(start_time="2026-05-04T00:30:00+02:00")]
        traces = {DEFAULT_TRACE_ID: make_trace()}

        [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert row["date"] == "2026-05-03"


class TestEdgeCases:
    def test_empty_observations_returns_empty(self):
        assert aggregate_token_usage([], {}, LOADED_AT) == []

    def test_warns_when_app_name_missing(self, caplog):
        observations = [make_observation()]
        traces = {DEFAULT_TRACE_ID: make_trace(app_name=None)}

        with caplog.at_level(logging.WARNING):
            rows = aggregate_token_usage(observations, traces, LOADED_AT)

        assert rows[0]["serviceresourceid"] == "app_ttd_unknown"
        assert DEFAULT_TRACE_ID in caplog.text

    def test_raises_when_user_id_empty(self):
        observations = [make_observation()]
        traces = {DEFAULT_TRACE_ID: make_trace(user_id="")}

        with pytest.raises(ValueError, match="Missing service owner code"):
            aggregate_token_usage(observations, traces, LOADED_AT)

    def test_skips_observation_when_parent_trace_missing(self, caplog):
        observations = [make_observation(trace_id="unknown-trace")]

        with caplog.at_level(logging.WARNING):
            rows = aggregate_token_usage(observations, {}, LOADED_AT)

        assert rows == []
        assert "unknown-trace" in caplog.text

    def test_warns_when_model_missing(self, caplog):
        observations = [make_observation()]
        observations[0]["model"] = None
        traces = {DEFAULT_TRACE_ID: make_trace()}

        with caplog.at_level(logging.WARNING):
            [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert "unknown" in row["tokens_by_model"]
        assert DEFAULT_TRACE_ID in caplog.text


class TestTokensByModel:
    def test_one_entry_per_model_in_bucket(self):
        observations = [make_observation(input_tokens=100, output_tokens=50)]
        traces = {DEFAULT_TRACE_ID: make_trace()}

        [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert row["tokens_by_model"] == {
            "gpt-4o": {"input": 100, "output": 50, "total": 150},
        }

    def test_keeps_models_separate(self):
        observations = [
            make_observation(
                trace_id="trace-1",
                model="gpt-4o",
                input_tokens=100,
                output_tokens=50,
            ),
            make_observation(
                trace_id="trace-2",
                model="gpt-4o-mini",
                input_tokens=200,
                output_tokens=80,
            ),
        ]
        traces = {
            "trace-1": make_trace(trace_id="trace-1"),
            "trace-2": make_trace(trace_id="trace-2"),
        }

        [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert row["tokens_by_model"] == {
            "gpt-4o": {"input": 100, "output": 50, "total": 150},
            "gpt-4o-mini": {"input": 200, "output": 80, "total": 280},
        }
        assert row["input_tokens"] == 300
        assert row["output_tokens"] == 130
        assert row["total_tokens"] == 430

    def test_preserves_and_sums_non_standard_usage_details(self):
        observations = [
            make_observation(
                trace_id="trace-1",
                model="claude-sonnet-4-6",
                input_tokens=100,
                output_tokens=50,
                extra_usage_details={"cache_read_input_tokens": 200},
            ),
            make_observation(
                trace_id="trace-2",
                model="claude-sonnet-4-6",
                input_tokens=100,
                output_tokens=50,
                extra_usage_details={"cache_read_input_tokens": 300},
            ),
        ]
        traces = {
            "trace-1": make_trace(trace_id="trace-1"),
            "trace-2": make_trace(trace_id="trace-2"),
        }

        [row] = aggregate_token_usage(observations, traces, LOADED_AT)

        assert row["tokens_by_model"] == {
            "claude-sonnet-4-6": {
                "input": 200,
                "output": 100,
                "total": 300,
                "cache_read_input_tokens": 500,
            },
        }
