"""In-memory telemetry for the tests.

OpenTelemetry accepts one global tracer and meter provider per process, so this module sets them once, and the
fixtures clear what the previous test recorded.
"""

import os

import pytest
from opentelemetry import metrics, trace
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import InMemoryMetricReader
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from shared.telemetry import langfuse_tracer_provider
from shared.telemetry.isolation import LANGFUSE_TRACER_NAME, service_tracer_provider

# As setup_telemetry sets it, before any instrumentation reads it.
os.environ.setdefault("OTEL_SEMCONV_STABILITY_OPT_IN", "http")

_service_spans = InMemorySpanExporter()
_service_provider = service_tracer_provider()
_service_provider.add_span_processor(SimpleSpanProcessor(_service_spans))
trace.set_tracer_provider(_service_provider)

_metrics = InMemoryMetricReader()
metrics.set_meter_provider(MeterProvider(metric_readers=[_metrics]))


@pytest.fixture
def service_spans() -> InMemorySpanExporter:
    assert trace.get_tracer_provider() is _service_provider, "another test set the global tracer provider"
    _service_spans.clear()
    return _service_spans


@pytest.fixture
def metric_reader() -> InMemoryMetricReader:
    return _metrics


@pytest.fixture
def langfuse_spans() -> InMemorySpanExporter:
    return InMemorySpanExporter()


@pytest.fixture
def langfuse_provider(langfuse_spans: InMemorySpanExporter) -> TracerProvider:
    provider = langfuse_tracer_provider()
    provider.add_span_processor(SimpleSpanProcessor(langfuse_spans))
    return provider


@pytest.fixture
def langfuse_tracer(langfuse_provider: TracerProvider) -> trace.Tracer:
    """A tracer under the name Langfuse gives its own."""
    return langfuse_provider.get_tracer(LANGFUSE_TRACER_NAME)


@pytest.fixture
def service_tracer() -> trace.Tracer:
    return trace.get_tracer("tests")


def points(reader: InMemoryMetricReader, name: str) -> list:
    """The data points of the metric called name, as the reader collects them now."""
    data = reader.get_metrics_data()
    if data is None:
        return []
    return [
        point
        for resource_metrics in data.resource_metrics
        for scope_metrics in resource_metrics.scope_metrics
        for metric in scope_metrics.metrics
        if metric.name == name
        for point in metric.data.data_points
    ]
