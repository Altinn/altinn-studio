"""A run's span, its model calls and the metrics that dashboards and alerts use."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from opentelemetry.trace import SpanKind, StatusCode

from agents.graph.runner import GoalRejected, WorkflowCancelled, run_in_background
from agents.graph.state import AgentState
from shared.telemetry import (
    annotate_agent_start,
    model_call,
    record_loop_result,
    record_tool_call,
    run_phase,
    start_run,
)

from .conftest import points


def _start(mode: str = "chat"):
    return start_run(
        repo_owner="ttd", developer="developer", app="my-app", conversation_id="session-1", mode=mode, attachments=0
    )


def _span(exporter, name: str):
    (span,) = [span for span in exporter.get_finished_spans() if span.name == name]
    return span


def test_a_run_starts_its_own_trace_linked_to_the_request(service_tracer, service_spans):
    with service_tracer.start_as_current_span("POST /api/agent/start"):
        annotate_agent_start(repo_owner="ttd", developer="developer", app="my-app", conversation_id="session-1")
        run = _start()
    with run:
        run.set_outcome("completed")

    request = _span(service_spans, "POST /api/agent/start")
    run_span = _span(service_spans, "assistant.run")
    assert run_span.parent is None
    assert run_span.context.trace_id != request.context.trace_id
    assert [link.context.span_id for link in run_span.links] == [request.context.span_id]
    for span in (request, run_span):
        assert span.attributes["altinn.service_owner"] == "ttd"
        assert span.attributes["altinn.app"] == "my-app"
        assert span.attributes["gen_ai.conversation.id"] == "session-1"
    assert request.attributes["altinn.studio.sampling"] == "always"
    assert run_span.attributes["altinn.assistant.run.mode"] == "chat"
    assert run_span.attributes["altinn.assistant.run.outcome"] == "completed"


def test_a_model_call_in_a_langfuse_generation_is_a_child_of_the_run(langfuse_tracer, service_spans, metric_reader):
    run = _start()
    with run:
        with (
            langfuse_tracer.start_as_current_span("llm_call_default"),
            model_call(provider="anthropic", model="model-a") as call,
        ):
            call.response_model = "model-a-2026"
            call.finish_reason = "end_turn"
            call.record_usage(input_tokens=120, output_tokens=30, cache_read_input_tokens=100)
        run.set_outcome("completed")

    run_span = _span(service_spans, "assistant.run")
    chat = _span(service_spans, "chat model-a")
    assert chat.kind is SpanKind.CLIENT
    assert chat.parent.span_id == run_span.context.span_id
    assert dict(chat.attributes) == {
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "anthropic",
        "gen_ai.request.model": "model-a",
        "gen_ai.response.model": "model-a-2026",
        "gen_ai.response.finish_reasons": ("end_turn",),
        "gen_ai.usage.input_tokens": 120,
        "gen_ai.usage.output_tokens": 30,
        "gen_ai.usage.cache_read.input_tokens": 100,
        "gen_ai.usage.cache_creation.input_tokens": 0,
    }
    assert run_span.attributes["altinn.assistant.run.models"] == ("model-a",)
    assert run_span.attributes["altinn.assistant.run.model_calls"] == 1
    assert run_span.attributes["gen_ai.usage.input_tokens"] == 120
    assert run_span.attributes["gen_ai.usage.output_tokens"] == 30

    tokens = {
        point.attributes["gen_ai.token.type"]: point.sum
        for point in points(metric_reader, "gen_ai.client.token.usage")
        if point.attributes.get("gen_ai.request.model") == "model-a"
    }
    assert tokens == {"input": 120, "output": 30}
    (duration,) = [
        point
        for point in points(metric_reader, "gen_ai.client.operation.duration")
        if point.attributes.get("gen_ai.request.model") == "model-a"
    ]
    assert dict(duration.attributes) == {
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "anthropic",
        "gen_ai.request.model": "model-a",
    }
    assert duration.count == 1


class _RateLimitedError(Exception):
    status_code = 429


def test_a_run_whose_loop_stopped_on_a_failed_model_call_is_an_error(service_spans, metric_reader):
    run = _start(mode="workflow")
    with run:
        with pytest.raises(_RateLimitedError), model_call(provider="azure.ai.openai", model="model-b"):
            raise _RateLimitedError("the response body, which repeats the prompt")
        record_loop_result("error", 3)
        run.set_outcome("failed")

    chat = _span(service_spans, "chat model-b")
    assert chat.status.status_code is StatusCode.ERROR
    assert chat.status.description == "_RateLimitedError (status 429)"
    assert chat.attributes["error.type"] == "_RateLimitedError"
    assert not chat.events

    run_span = _span(service_spans, "assistant.run")
    assert run_span.status.status_code is StatusCode.ERROR
    assert run_span.attributes["altinn.assistant.run.outcome"] == "error"
    assert run_span.attributes["error.type"] == "_RateLimitedError"
    assert run_span.attributes["altinn.assistant.run.loop_termination"] == "error"

    assert any(
        point.attributes.get("error.type") == "_RateLimitedError"
        for point in points(metric_reader, "gen_ai.client.operation.duration")
    )
    assert any(
        dict(point.attributes)
        == {
            "altinn.assistant.run.mode": "workflow",
            "altinn.assistant.run.outcome": "error",
            "error.type": "_RateLimitedError",
        }
        for point in points(metric_reader, "altinn.assistant.run.duration")
    )


def test_a_developers_own_repository_has_no_service_owner(service_tracer, service_spans):
    with service_tracer.start_as_current_span("POST /api/agent/start"):
        annotate_agent_start(repo_owner="developer", developer="developer", app="my-app", conversation_id="session-1")
        run = start_run(
            repo_owner="developer",
            developer="developer",
            app="my-app",
            conversation_id="session-1",
            mode="chat",
            attachments=0,
        )
    with run:
        run.set_outcome("completed")

    for name in ("POST /api/agent/start", "assistant.run"):
        attributes = _span(service_spans, name).attributes
        assert "altinn.service_owner" not in attributes
        assert attributes["altinn.app"] == "my-app"


def test_phases_tools_and_turns_add_up_on_the_run(service_spans):
    run = _start()
    with run:
        with run_phase("gate"):
            pass
        with run_phase("agentic_loop"):
            record_tool_call("read_file", is_error=False)
            record_tool_call("write_file", is_error=True)
            record_tool_call("read_file", is_error=False)
            record_loop_result("max_turns", 40)
            record_loop_result("completed", 2)
        run.set_changed_files(2)
        run.set_outcome("completed")

    attributes = _span(service_spans, "assistant.run").attributes
    assert attributes["altinn.assistant.run.gate.duration"] >= 0
    assert attributes["altinn.assistant.run.agentic_loop.duration"] >= 0
    assert attributes["altinn.assistant.run.tools"] == ("read_file", "write_file")
    assert attributes["altinn.assistant.run.tool_calls"] == 3
    assert attributes["altinn.assistant.run.tool_errors"] == 1
    assert attributes["altinn.assistant.run.turns"] == 42
    assert attributes["altinn.assistant.run.loop_termination"] == "completed"
    assert attributes["altinn.assistant.run.changed_files"] == 2


def _state() -> AgentState:
    return AgentState(
        session_id="session-1",
        user_goal="Add a field",
        repo_path="/tmp/repo",
        app_name="my-app",
        developer="developer",
        repo_owner="ttd",
        cost_org="ttd",
    )


@pytest.mark.parametrize(
    ("run_once", "outcome", "error_type"),
    [
        (AsyncMock(return_value={"tests_passed": True, "changed_files": ["a", "b"]}), "completed", None),
        (AsyncMock(return_value={"tests_passed": False}), "failed", None),
        (AsyncMock(return_value=None), "declined", None),
        (AsyncMock(side_effect=GoalRejected("no")), "rejected", None),
        (AsyncMock(side_effect=WorkflowCancelled("stop")), "cancelled", None),
        (AsyncMock(side_effect=KeyError("the goal")), "error", "KeyError"),
    ],
)
async def test_the_runner_records_how_a_run_ended(service_spans, run_once, outcome, error_type):
    event_sink = Mock()
    event_sink.is_cancelled.return_value = False
    with patch("agents.graph.runner.run_once", run_once), patch("agents.graph.runner.flush_langfuse"):
        await run_in_background(_state(), event_sink)

    attributes = _span(service_spans, "assistant.run").attributes
    assert attributes["altinn.assistant.run.outcome"] == outcome
    assert attributes.get("error.type") == error_type
