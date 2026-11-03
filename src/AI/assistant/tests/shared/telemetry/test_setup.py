"""What the service exports, and what it keeps out."""

import logging
import uuid

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import InMemoryLogRecordExporter, SimpleLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import InMemoryMetricReader

from shared.telemetry import instrument_app, model_call, start_run
from shared.telemetry.setup import (
    _PROCESS_START_TIME,
    _async_url_without_query,
    _register_start_time,
    _resource,
    _ServiceLogHandler,
)

from .conftest import points


@pytest.fixture
def exported_logs():
    exporter = InMemoryLogRecordExporter()
    provider = LoggerProvider()
    provider.add_log_record_processor(SimpleLogRecordProcessor(exporter))
    handler = _ServiceLogHandler(level=logging.WARNING, logger_provider=provider)
    logger = logging.getLogger("tests.telemetry")
    logger.addHandler(handler)
    otel_logger = logging.getLogger("opentelemetry.tests")
    otel_logger.addHandler(handler)
    yield exporter
    logger.removeHandler(handler)
    otel_logger.removeHandler(handler)


def test_an_exported_record_is_in_the_services_trace_without_exception_messages(
    exported_logs, service_tracer, langfuse_tracer
):
    logger = logging.getLogger("tests.telemetry")
    # In variables, since the stack trace quotes the lines that raise.
    goal, output = "the user's goal", "the model's output"
    with (
        service_tracer.start_as_current_span("service.run") as run,
        langfuse_tracer.start_as_current_span("langfuse.generation"),
    ):
        try:
            try:
                raise ValueError(goal)
            except ValueError as inner:
                raise RuntimeError(output) from inner
        except RuntimeError:
            logger.error("Workflow failed", exc_info=True)
        logger.info("Started session")
    logging.getLogger("opentelemetry.tests").warning("Failed to export a batch")

    (record,) = [readable.log_record for readable in exported_logs.get_finished_logs()]
    assert record.body == "Workflow failed"
    assert record.trace_id == run.get_span_context().trace_id
    assert record.span_id == run.get_span_context().span_id
    assert record.attributes is not None
    assert record.attributes["exception.type"] == "RuntimeError"
    assert "exception.message" not in record.attributes
    stacktrace = str(record.attributes["exception.stacktrace"])
    assert "builtins.ValueError\n" in stacktrace
    assert "The above exception was the direct cause of the following exception:" in stacktrace
    assert stacktrace.endswith("builtins.RuntimeError\n")
    assert goal not in stacktrace
    assert output not in stacktrace


async def test_a_providers_http_call_is_a_child_of_the_model_call_without_its_query(langfuse_tracer, service_spans):
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda _request: httpx.Response(200)))
    HTTPXClientInstrumentor.instrument_client(client, request_hook=_async_url_without_query)
    run = start_run(
        repo_owner="ttd", developer="developer", app="my-app", conversation_id="session-1", mode="chat", attachments=0
    )
    with run:
        with langfuse_tracer.start_as_current_span("generation"), model_call(provider="openai", model="model-c"):
            await client.post("https://user:secret@models.example/v1/chat?api-version=1&key=secret")
        run.set_outcome("completed")

    spans = {span.name: span for span in service_spans.get_finished_spans()}
    assert spans["POST"].parent.span_id == spans["chat model-c"].context.span_id
    assert spans["POST"].attributes["url.full"] == "https://models.example/v1/chat"


def test_the_resource_names_the_build_and_the_process(monkeypatch):
    monkeypatch.setenv("SERVICE_VERSION", "8c71030c13")
    monkeypatch.setenv("OTEL_SERVICE_NAME", "assistant")
    monkeypatch.setenv("OTEL_RESOURCE_ATTRIBUTES", "k8s.pod.uid=pod-1")

    attributes = _resource().attributes

    assert attributes["service.name"] == "assistant"
    assert attributes["service.version"] == "8c71030c13"
    assert attributes["k8s.pod.uid"] == "pod-1"
    uuid.UUID(str(attributes["service.instance.id"]))


def test_a_local_build_is_dev(monkeypatch):
    monkeypatch.delenv("SERVICE_VERSION", raising=False)
    assert _resource().attributes["service.version"] == "dev"


def test_the_process_reports_its_start_time():
    reader = InMemoryMetricReader()
    _register_start_time(MeterProvider(metric_readers=[reader]).get_meter("tests"))

    (point,) = points(reader, "altinn.workload.start_time")
    assert point.value == _PROCESS_START_TIME


def test_the_app_continues_the_callers_trace_for_the_developer_and_leaves_out_probes(monkeypatch, service_spans):
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-router.observability.svc.cluster.local:4318")
    app = FastAPI()

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.post("/api/agent/cancel/{session_id}")
    async def cancel(session_id: str):
        return {"session_id": session_id}

    instrument_app(app)
    client = TestClient(app)
    client.get("/health")
    client.post(
        "/api/agent/cancel/session-1",
        headers={
            "traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
            "X-Developer": "developer",
        },
    )

    (span,) = service_spans.get_finished_spans()
    assert span.name == "POST /api/agent/cancel/{session_id}"
    assert span.context.trace_id == 0x0AF7651916CD43DD8448EB211C80319C
    assert span.parent.span_id == 0xB7AD6B7169203331
    assert span.attributes["http.route"] == "/api/agent/cancel/{session_id}"
    assert span.attributes["enduser.id"] == "developer"
