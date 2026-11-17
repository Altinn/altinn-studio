"""What the service exports for operations, and that none of it holds what a user wrote."""

import logging
from typing import Any
from unittest.mock import MagicMock

import pytest
from langfuse import Langfuse
from langfuse._client.resource_manager import LangfuseResourceManager
from opentelemetry.instrumentation.logging.handler import LoggingHandler
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import InMemoryLogRecordExporter, SimpleLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import InMemoryMetricReader
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from agents.graph import runner
from agents.graph.state import AgentState
from shared import telemetry

GOAL = "Legg til et felt for fødselsnummer 01017012345"


@pytest.fixture
def exported(monkeypatch):
    for name in ("_tracer", "_instruments", "_resource"):
        monkeypatch.setattr(telemetry, name, getattr(telemetry, name))
    spans, reader, tracer_provider = InMemorySpanExporter(), InMemoryMetricReader(), TracerProvider()
    tracer_provider.add_span_processor(SimpleSpanProcessor(spans))
    telemetry.use_providers(tracer_provider, MeterProvider(metric_readers=[reader]))
    monkeypatch.setattr(runner, "flush_langfuse", lambda: None)
    return tracer_provider.get_tracer("test"), spans, reader


def _points(reader, name):
    data = reader.get_metrics_data()
    return [
        p
        for r in data.resource_metrics
        for s in r.scope_metrics
        for m in s.metrics
        if m.name == name
        for p in m.data.data_points
    ]


async def _run(tracer, behaviour, monkeypatch, **state: Any):
    monkeypatch.setattr(runner, "run_once", lambda *_: behaviour())
    fields: dict[str, Any] = {
        "session_id": "s1",
        "user_goal": GOAL,
        "repo_path": "/r",
        "app_name": "app",
        "developer": "dev-ola",
        "repo_owner": "ttd",
        "cost_org": "ttd",
    } | state
    sink = MagicMock(is_cancelled=MagicMock(return_value=False))
    with tracer.start_as_current_span("POST /api/agent/start") as request:
        task = runner.run_in_background(AgentState(**fields), sink)
    await task
    return request


async def test_a_run_is_one_span_in_a_trace_of_its_own(exported, monkeypatch):
    tracer, spans, reader = exported

    async def behaviour():
        with telemetry.model_call(telemetry.PROVIDER_AZURE_OPENAI, "gpt-x") as model_usage:
            model_usage.update({"input": 10, "output": 5, "input_cache_read": 3})
        telemetry.record_tool_call("read_file", is_error=True, seconds=0.5)
        telemetry.record_loop_result("completed", 2)
        return {"tests_passed": True, "changed_files": ["App/ui/form.json"]}

    request = await _run(tracer, behaviour, monkeypatch)

    run = spans.get_finished_spans()[-1]
    assert run.name == "invoke_agent assistant"
    assert run.context.trace_id != request.get_span_context().trace_id
    assert [link.context for link in run.links] == [request.get_span_context()]
    attributes = dict(run.attributes or {})
    assert attributes.pop("altinn.assistant.run.model.duration") >= 0
    assert attributes.pop("altinn.assistant.run.tool.duration") == 0.5
    assert attributes == {
        "gen_ai.operation.name": "invoke_agent",
        "gen_ai.agent.name": "assistant",
        "gen_ai.conversation.id": "s1",
        "gen_ai.usage.input_tokens": 13,
        "gen_ai.usage.output_tokens": 5,
        "gen_ai.usage.cache_read.input_tokens": 3,
        "gen_ai.usage.cache_creation.input_tokens": 0,
        "altinn.repo_type": "app",
        "altinn.service_owner": "ttd",
        "altinn.app": "app",
        "altinn.assistant.run.mode": "chat",
        "altinn.assistant.run.outcome": "completed",
        "altinn.assistant.run.attachments": 0,
        "altinn.assistant.run.changed_files": 1,
        "altinn.assistant.run.model_calls": 1,
        "altinn.assistant.run.tool_calls": 1,
        "altinn.assistant.run.tool_errors": 1,
        "altinn.assistant.run.turns": 2,
    }
    [run_point] = _points(reader, "altinn.assistant.run.duration")
    assert dict(run_point.attributes) == {
        "altinn.assistant.run.mode": "chat",
        "altinn.assistant.run.outcome": "completed",
    }
    assert sorted((p.attributes["gen_ai.token.type"], p.sum) for p in _points(reader, "gen_ai.client.token.usage")) == [
        ("input", 13),
        ("output", 5),
    ]
    [tool] = _points(reader, "altinn.assistant.tool.calls")
    assert dict(tool.attributes) == {"gen_ai.tool.name": "read_file", "error.type": "tool_error"}


def _raises(exc):
    async def behaviour():
        raise exc

    return behaviour


def _returns(value, termination=None):
    async def behaviour():
        if termination:
            telemetry.record_loop_result(termination, 20)
        return value

    return behaviour


@pytest.mark.parametrize(
    ("behaviour", "outcome", "error"),
    [
        (_returns({"tests_passed": True}), "completed", None),
        (_returns({"tests_passed": False}), "failed", None),
        (_returns({"tests_passed": False}, termination="max_turns"), "max_turns", None),
        (_returns(None), "declined", None),
        (_raises(runner.GoalRejected("no", reason=telemetry.OUT_OF_SCOPE)), "declined", None),
        (_raises(runner.GoalRejected("no", reason=telemetry.UNSAFE)), "rejected", None),
        (_raises(runner.GoalRejected("no", reason=telemetry.GATE_UNAVAILABLE)), "error", "gate_unavailable"),
        (_raises(runner.WorkflowCancelled("stop")), "cancelled", None),
        (_raises(RuntimeError(GOAL)), "error", "RuntimeError"),
    ],
)
async def test_each_way_a_run_ends_has_one_outcome(exported, monkeypatch, behaviour, outcome, error):
    tracer, spans, _ = exported

    await _run(tracer, behaviour, monkeypatch, repo_owner="dev-ola")

    run = spans.get_finished_spans()[-1]
    assert run.attributes["altinn.assistant.run.outcome"] == outcome
    assert run.attributes.get("error.type") == error
    assert (run.status.status_code == StatusCode.ERROR) == (outcome == "error")
    assert "altinn.service_owner" not in run.attributes, "a personal repository's owner is a username"
    assert all(GOAL not in str(value) for value in run.attributes.values())


async def test_langfuse_starts_its_root_in_the_run_trace(exported, monkeypatch):
    tracer, spans, _ = exported
    langfuse_spans, provider = InMemorySpanExporter(), TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(langfuse_spans))
    langfuse = Langfuse(
        public_key="pk-test", secret_key="sk-test", tracer_provider=provider, should_export_span=lambda _: False
    )

    async def behaviour():
        with langfuse.start_as_current_observation(trace_context=telemetry.run_trace_context(), name="root"):
            pass

    try:
        await _run(tracer, behaviour, monkeypatch)
    finally:
        LangfuseResourceManager.reset()

    [root], run = langfuse_spans.get_finished_spans(), spans.get_finished_spans()[-1]
    assert root.context and run.context and root.context.trace_id == run.context.trace_id
    assert (root.attributes or {})["langfuse.internal.as_root"] is True


def test_an_exported_record_holds_neither_values_nor_the_exception_message():
    exporter, provider = InMemoryLogRecordExporter(), LoggerProvider()
    provider.add_log_record_processor(SimpleLogRecordProcessor(exporter))
    handler = LoggingHandler(logger_provider=provider)
    handler.addFilter(telemetry.exportable_record)
    logger = logging.getLogger("agents.test_telemetry")
    logger.addHandler(handler)
    try:
        try:
            raise ValueError(GOAL)
        except ValueError:
            logger.exception("The run failed for %s", GOAL)
        logging.getLogger("opentelemetry.exporter").addHandler(handler)
        logging.getLogger("opentelemetry.exporter").warning("Export failed")
    finally:
        logger.removeHandler(handler)
        logging.getLogger("opentelemetry.exporter").removeHandler(handler)

    [record] = [log.log_record for log in exporter.get_finished_logs()]
    attributes = dict(record.attributes or {})
    assert record.body == "The run failed for %s"
    assert attributes["exception.type"] == "ValueError"
    assert "raise ValueError(GOAL)" in str(attributes["exception.stacktrace"])
    assert all(GOAL not in str(value) for value in attributes.values())
