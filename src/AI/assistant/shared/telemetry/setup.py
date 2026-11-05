"""OpenTelemetry for the service, as docs/observability.md asks of every service.

The service exports traces, metrics and logs over OTLP when the deployment sets OTEL_EXPORTER_OTLP_ENDPOINT, and the
deployment's other OTEL_* variables configure the SDK. Without the endpoint the service exports nothing, so it runs
without a collector locally, and Langfuse works as before either way.
"""

import logging
import os
import time
import traceback
import uuid
from typing import Any

import httpx
from fastapi import FastAPI
from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor, RequestInfo
from opentelemetry.instrumentation.logging.handler import LoggingHandler
from opentelemetry.metrics import CallbackOptions, Meter, Observation
from opentelemetry.propagate import set_global_textmap
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_INSTANCE_ID, SERVICE_VERSION, Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.attributes.exception_attributes import EXCEPTION_MESSAGE, EXCEPTION_STACKTRACE
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.util.types import AnyValue

from . import names
from .isolation import attached, service_context, service_tracer_provider

# The process's identity, taken when the service imports this module at startup. A restart gets a new ID, even in
# the same pod.
_PROCESS_START_TIME = time.time()
_PROCESS_INSTANCE_ID = str(uuid.uuid4())

# Probes are not traffic, and the WebSocket connection is no unit of work.
_EXCLUDED_URLS = "/health$,/ws$"

# The header in which Designer names the developer a request acts for, as ASGI gives header names.
_DEVELOPER_HEADER = b"x-developer"


def is_enabled() -> bool:
    return bool(os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))


def setup_telemetry() -> None:
    """Set the global providers and instrument httpx, if the deployment names a collector."""
    if not is_enabled():
        return

    # The instrumentations write the old HTTP names, such as http.server.duration in ms, unless told otherwise.
    os.environ.setdefault("OTEL_SEMCONV_STABILITY_OPT_IN", "http")
    # Langfuse keeps its trace ID in the baggage, which must not reach the model providers or other services.
    set_global_textmap(TraceContextTextMapPropagator())

    resource = _resource()

    tracer_provider = service_tracer_provider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    # No interval here: one set in code overrides OTEL_METRIC_EXPORT_INTERVAL.
    meter_provider = MeterProvider(
        resource=resource, metric_readers=[PeriodicExportingMetricReader(OTLPMetricExporter())]
    )
    metrics.set_meter_provider(meter_provider)
    _register_start_time(meter_provider.get_meter(names.SCOPE))

    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter()))
    set_logger_provider(logger_provider)
    logging.getLogger().addHandler(_ServiceLogHandler(level=logging.WARNING, logger_provider=logger_provider))

    HTTPXClientInstrumentor().instrument(request_hook=_url_without_query, async_request_hook=_async_url_without_query)


def instrument_app(app: FastAPI) -> None:
    """Trace the app's requests, continuing the trace context the caller sends, such as Designer's."""
    if not is_enabled():
        return
    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls=_EXCLUDED_URLS,
        exclude_spans=["receive", "send"],
        server_request_hook=_record_developer,
    )


def _record_developer(span: trace.Span, scope: dict[str, Any]) -> None:
    """Put the developer the request acts for on its span as enduser.id."""
    if not span.is_recording():
        return
    for name, value in scope.get("headers", []):
        if name == _DEVELOPER_HEADER:
            span.set_attribute(names.ENDUSER_ID, value.decode("latin-1"))
            return


def _resource() -> Resource:
    # OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES, which the deployment sets, take precedence.
    return Resource(
        {
            SERVICE_VERSION: os.getenv("SERVICE_VERSION") or "dev",
            SERVICE_INSTANCE_ID: _PROCESS_INSTANCE_ID,
        }
    ).merge(Resource.create())


def _register_start_time(meter: Meter) -> None:
    """Report the process's start time at every collection, so dashboards can count processes and mark restarts."""

    def observe(_options: CallbackOptions) -> list[Observation]:
        return [Observation(_PROCESS_START_TIME)]

    meter.create_observable_gauge(
        names.WORKLOAD_START_TIME,
        callbacks=[observe],
        unit="s",
        description="Process start time in Unix seconds.",
    )


class _ServiceLogHandler(LoggingHandler):
    """Exports log records at WARNING and above, in the service's trace rather than a Langfuse trace.

    An exception's message can carry what telemetry must not, such as a model provider's response body or a git
    command with its API key, so a record's exception keeps its types and stack frames but not its messages.
    """

    def filter(self, record: logging.LogRecord) -> bool | logging.LogRecord:
        # A failed export logs a warning, which the next export would carry, and so on.
        if record.name.startswith("opentelemetry"):
            return False
        return super().filter(record)

    def emit(self, record: logging.LogRecord) -> None:
        with attached(service_context()):
            super().emit(record)

    def _get_attributes(self, record: logging.LogRecord) -> tuple[dict[str, AnyValue], str | None]:
        attributes, event_name = super()._get_attributes(record)
        attributes.pop(EXCEPTION_MESSAGE, None)
        if EXCEPTION_STACKTRACE in attributes and record.exc_info and record.exc_info[1] is not None:
            attributes[EXCEPTION_STACKTRACE] = _stacktrace_without_messages(record.exc_info[1])
        return attributes, event_name


def _stacktrace_without_messages(exc: BaseException) -> str:
    """The traceback Python prints for exc and the exceptions it was raised from, without their messages."""
    chain: list[tuple[BaseException, str]] = []
    seen: set[int] = set()
    current: BaseException | None = exc
    lead = ""
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        chain.append((current, lead))
        if current.__cause__ is not None:
            current, lead = current.__cause__, "The above exception was the direct cause of the following exception:"
        elif current.__context__ is not None and not current.__suppress_context__:
            current, lead = current.__context__, "During handling of the above exception, another exception occurred:"
        else:
            current = None

    parts: list[str] = []
    next_lead = ""
    for current, lead in reversed(chain):
        if next_lead:
            parts.append(f"\n{next_lead}\n\n")
        parts.append("Traceback (most recent call last):\n")
        parts.extend(traceback.format_tb(current.__traceback__))
        parts.append(f"{type(current).__module__}.{type(current).__qualname__}\n")
        next_lead = lead
    return "".join(parts)


def _url_without_query(span: trace.Span, request: RequestInfo) -> None:
    """Record the URL without its query string and user info, which telemetry must not carry."""
    if not span.is_recording():
        return
    url = request.url
    if isinstance(url, tuple):
        scheme, host, port, target = url
        url = httpx.URL(scheme=scheme.decode(), host=host.decode(), port=port, raw_path=target)
    span.set_attribute(names.URL_FULL, str(url.copy_with(query=None, fragment=None, username=None, password=None)))


async def _async_url_without_query(span: trace.Span, request: RequestInfo) -> None:
    _url_without_query(span, request)
