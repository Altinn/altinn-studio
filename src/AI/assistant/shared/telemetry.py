"""Telemetry for operations: metrics, one span per run and WARN or ERROR logs, exported over OTLP.

None of it holds what users write, model output or exception messages. Langfuse holds those.

The providers are never registered globally. A Langfuse client made without a provider of its
own takes the global one, and its spans, which hold prompts, would then reach our exporter.
"""

from __future__ import annotations

import contextlib
import copy
import logging
import os
import time
import traceback
import uuid
from collections.abc import Iterator, Mapping
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from opentelemetry import metrics, trace
from opentelemetry.context import Context
from opentelemetry.trace import Link, SpanContext, SpanKind, StatusCode

from shared.modes import run_mode

if TYPE_CHECKING:
    from fastapi import FastAPI
    from langfuse.types import TraceContext

    from agents.graph.state import AgentState

# The names of attributes that code outside this module sets. The rest are written where this module sets them.
ERROR_TYPE = "error.type"
GEN_AI_REQUEST_MODEL = "gen_ai.request.model"
GEN_AI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons"
GEN_AI_TOOL_NAME = "gen_ai.tool.name"
LANGFUSE_TRACE_ID = "altinn.assistant.langfuse.trace_id"
LANGFUSE_OBSERVATION_ID = "altinn.assistant.langfuse.observation_id"
PROMPT_NAME = "altinn.assistant.prompt.name"
_MODE = "altinn.assistant.run.mode"
_OUTCOME = "altinn.assistant.run.outcome"

PROVIDER_ANTHROPIC = "anthropic"
PROVIDER_AZURE_OPENAI = "azure.ai.openai"
PROVIDER_OPENAI = "openai"
# Why a gate rejected a goal, and errors that the code handles before they reach the run.
OUT_OF_SCOPE = "out_of_scope"
UNSAFE = "unsafe"
GATE_UNAVAILABLE = "gate_unavailable"
OUTPUT_TRUNCATED = "output_truncated"
UNKNOWN_TOOL = "unknown"
CANCELLED = "cancelled"


def error_type(exc: BaseException) -> str:
    """The value of `error.type` for an exception: its class, never its message."""
    return type(exc).__qualname__


class _Instruments:
    def __init__(self, meter: metrics.Meter):
        self.run_duration = meter.create_histogram(
            "altinn.assistant.run.duration",
            unit="s",
            explicit_bucket_boundaries_advisory=[1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800],
        )
        self.runs_active = meter.create_up_down_counter("altinn.assistant.run.active", unit="{run}")
        self.tool_calls = meter.create_counter("altinn.assistant.tool.calls", unit="{call}")
        # The semantic conventions' buckets, the duration's with one more for the agent loop's long calls.
        self.operation_duration = meter.create_histogram(
            "gen_ai.client.operation.duration",
            unit="s",
            explicit_bucket_boundaries_advisory=[0.01 * 2**i for i in range(15)],
        )
        self.token_usage = meter.create_histogram(
            "gen_ai.client.token.usage", unit="{token}", explicit_bucket_boundaries_advisory=[4**i for i in range(14)]
        )


_tracer: trace.Tracer = trace.NoOpTracer()
_instruments = _Instruments(metrics.NoOpMeter("altinn.assistant"))
_resource: Any = None


def setup_telemetry(app: FastAPI) -> None:
    """Export over OTLP when the deployment sets OTEL_EXPORTER_OTLP_ENDPOINT. The other OTEL_* variables configure it."""
    if not os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return

    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.logging.handler import LoggingHandler
    from opentelemetry.sdk._logs import LoggerProvider
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    version = os.environ.get("SERVICE_VERSION", "dev")
    resource = Resource.create({"service.version": version, "service.instance.id": str(uuid.uuid4())})
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    meter_provider = MeterProvider(
        metric_readers=[PeriodicExportingMetricReader(OTLPMetricExporter())], resource=resource
    )
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter()))

    use_providers(tracer_provider, meter_provider)
    handler = LoggingHandler(level=logging.WARNING, logger_provider=logger_provider)
    handler.addFilter(exportable_record)
    for name in ("", "uvicorn.error"):  # uvicorn.error does not pass its records on to the root logger.
        logging.getLogger(name).addHandler(handler)
    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=tracer_provider,
        meter_provider=meter_provider,
        excluded_urls="/health$,/ws$",
        exclude_spans=["receive", "send"],
    )


def use_providers(tracer_provider: Any, meter_provider: Any) -> None:
    """Make the service's spans and metrics go to these providers."""
    global _tracer, _instruments, _resource
    _tracer, _resource = tracer_provider.get_tracer("altinn.assistant"), tracer_provider.resource
    meter = meter_provider.get_meter("altinn.assistant")
    _instruments = _Instruments(meter)
    started = time.time()
    meter.create_observable_gauge("altinn.workload.start_time", [lambda _: [metrics.Observation(started)]], unit="s")


def is_service_span(span: trace.Span) -> bool:
    """Whether a span is the service's own, rather than Langfuse's."""
    return _resource is not None and getattr(span, "resource", None) is _resource


def exportable_record(record: logging.LogRecord) -> logging.LogRecord | bool:
    """A copy of the record without values in its message, or the exception's message. A filter may return one."""
    if record.name.startswith("opentelemetry"):
        return False
    record = copy.copy(record)
    record.msg, record.args = str(record.msg), None
    if record.exc_info and record.exc_info[1] is not None:
        exc = record.exc_info[1]
        setattr(record, "exception.type", error_type(exc))
        setattr(record, "exception.stacktrace", "".join(traceback.format_tb(exc.__traceback__)))
    record.exc_info, record.exc_text = None, None
    return record


def correlation_attributes(state: AgentState) -> dict[str, Any]:
    """The keys that find a run and its request. A personal repository's owner is a username, so it is left out."""
    attributes: dict[str, Any] = {"gen_ai.conversation.id": state.session_id, "altinn.repo_type": "app"}
    if state.repo_owner and state.repo_owner == state.cost_org and not state.experiment:
        attributes.update({"altinn.service_owner": state.repo_owner, "altinn.app": state.app_name})
    return attributes


@dataclass
class Run:
    """What a run's span records, added up while the run goes."""

    span: trace.Span
    mode: str
    started: float = field(default_factory=time.perf_counter)
    outcome: str | None = None
    error_type: str | None = None
    termination: str | None = None
    counts: dict[str, float] = field(default_factory=dict)

    def add(self, name: str, value: float) -> None:
        self.counts[name] = self.counts.get(name, 0) + value

    def finish(self, final_state: Mapping[str, Any] | None) -> None:
        """The outcome of a run that returned. No state means the request was declined."""
        if final_state is None:
            self.outcome = "declined"
            return
        self.add("altinn.assistant.run.changed_files", len(final_state.get("changed_files") or []))
        if self.error_type:
            self.outcome = "error"
        elif final_state.get("tests_passed"):
            self.outcome = "completed"
        else:
            self.outcome = self.termination if self.termination in ("max_turns", "stuck") else "failed"

    def reject(self, reason: str) -> None:
        if reason == GATE_UNAVAILABLE:
            self.fail(GATE_UNAVAILABLE)
        else:
            self.outcome = "declined" if reason == OUT_OF_SCOPE else "rejected"

    def fail(self, error: str) -> None:
        self.outcome, self.error_type = "error", error

    def _end(self) -> None:
        outcome = self.outcome or CANCELLED
        recorded = {_MODE: self.mode, _OUTCOME: outcome} | ({ERROR_TYPE: self.error_type} if self.error_type else {})
        self.span.set_attributes(self.counts | recorded)
        if outcome == "error":
            self.span.set_status(StatusCode.ERROR, self.error_type)
        self.span.end()
        _instruments.run_duration.record(time.perf_counter() - self.started, recorded)


_current_run: ContextVar[Run | None] = ContextVar("assistant_run", default=None)


@contextlib.contextmanager
def agent_run(state: AgentState, request: SpanContext) -> Iterator[Run]:
    """The span of one run, in a trace of its own that links to the request that started it."""
    mode = run_mode(state.allow_app_changes)
    attributes: dict[str, Any] = {
        "gen_ai.operation.name": "invoke_agent",
        "gen_ai.agent.name": "assistant",
        _MODE: mode,
    }
    attributes["altinn.assistant.run.attachments"] = len(state.attachments or [])
    span = _tracer.start_span(
        "invoke_agent assistant",
        context=Context(),
        kind=SpanKind.INTERNAL,
        links=[Link(request)] if request.is_valid else None,
        attributes=attributes | correlation_attributes(state),
    )
    run = Run(span=span, mode=mode)
    token = _current_run.set(run)
    _instruments.runs_active.add(1, {_MODE: mode})
    try:
        with trace.use_span(span, end_on_exit=False, record_exception=False, set_status_on_exception=False):
            yield run
    finally:
        _current_run.reset(token)
        _instruments.runs_active.add(-1, {_MODE: mode})
        run._end()


def run_trace_context() -> TraceContext | None:
    """The trace that Langfuse's root observation of the run joins, so both have one trace ID."""
    run = _current_run.get()
    if run is None or not run.span.get_span_context().is_valid:
        return None
    return {"trace_id": format(run.span.get_span_context().trace_id, "032x")}


@contextlib.contextmanager
def model_call(provider: str, model: str) -> Iterator[dict[str, int]]:
    """Count one call to a model, and add it to the run. The caller fills in the usage it gives Langfuse."""
    details: dict[str, int] = {}
    run, started = _current_run.get(), time.perf_counter()
    attributes = {"gen_ai.operation.name": "chat", "gen_ai.provider.name": provider, GEN_AI_REQUEST_MODEL: model}
    try:
        yield details
    except Exception as exc:
        attributes[ERROR_TYPE] = error_type(exc)
        raise
    finally:
        seconds = time.perf_counter() - started
        _instruments.operation_duration.record(seconds, attributes)
        cached = (details.get("input_cache_read") or 0, details.get("input_cache_creation") or 0)
        tokens = {
            "input": (details.get("input", details.get("input_tokens")) or 0) + sum(cached),
            "output": details.get("output", details.get("output_tokens")) or 0,
        }
        if details:
            for token_type, count in tokens.items():
                _instruments.token_usage.record(count, attributes | {"gen_ai.token.type": token_type})
        if run is not None:
            run.add("altinn.assistant.run.model_calls", 1)
            run.add("altinn.assistant.run.model.duration", seconds)
            run.add("gen_ai.usage.input_tokens", tokens["input"])
            run.add("gen_ai.usage.output_tokens", tokens["output"])
            run.add("gen_ai.usage.cache_read.input_tokens", cached[0])
            run.add("gen_ai.usage.cache_creation.input_tokens", cached[1])


def record_tool_call(name: str, is_error: bool, seconds: float) -> None:
    """Count one tool call. The name must come from the registry, since the model can write anything."""
    _instruments.tool_calls.add(1, {GEN_AI_TOOL_NAME: name} | ({ERROR_TYPE: "tool_error"} if is_error else {}))
    if run := _current_run.get():
        run.add("altinn.assistant.run.tool_calls", 1)
        run.add("altinn.assistant.run.tool_errors", is_error)
        run.add("altinn.assistant.run.tool.duration", seconds)


def record_loop_result(reason: str, turns: int) -> None:
    """Add a pass of the agent loop to the run. The last pass's reason is how the loop ended."""
    if run := _current_run.get():
        run.add("altinn.assistant.run.turns", turns)
        run.termination = reason


def record_run_error(error: str) -> None:
    """Mark the run as failed by an error that the code handled, such as a model call the loop gave up on."""
    if (run := _current_run.get()) and run.error_type is None:
        run.error_type = error
