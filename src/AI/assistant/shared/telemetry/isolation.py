"""Keeps the service's spans and Langfuse's spans in separate traces.

The service exports its spans through the global tracer provider, and Langfuse records the agent's prompts and output
through a provider of its own. OpenTelemetry has one current span per context, though, so a span from one provider
would otherwise become the parent of spans from the other: Langfuse's traces would start inside the service's request
spans, and the service's HTTP client spans would land in Langfuse's traces.

A provider here starts a span under the current span only when that span is its own or a remote one. When the current
span is the other provider's, it starts the span under its own last current span instead, which it keeps under a
context key of its own, or as a root when it has none.
"""

from collections.abc import Callable, Iterator
from contextlib import contextmanager

from opentelemetry import context as otel_context
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.trace import Link, SpanKind
from opentelemetry.util.types import Attributes

# The name Langfuse gives its tracer, which its spans carry as their instrumentation scope.
LANGFUSE_TRACER_NAME = "langfuse-sdk"

_SERVICE_SPAN_KEY = otel_context.create_key("altinn-assistant-service-span")
_LANGFUSE_SPAN_KEY = otel_context.create_key("altinn-assistant-langfuse-span")


def _is_langfuse_span(span: trace.Span) -> bool:
    if not isinstance(span, ReadableSpan):
        return False
    scope = span.instrumentation_scope
    return scope is not None and scope.name == LANGFUSE_TRACER_NAME


def _is_service_span(span: trace.Span) -> bool:
    # A remote parent, or a span the SDK doesn't record, belongs to neither side.
    return isinstance(span, ReadableSpan) and not _is_langfuse_span(span)


def _own_context(key: str, is_foreign: Callable[[trace.Span], bool], context: Context | None) -> Context:
    current = context if context is not None else otel_context.get_current()
    if not is_foreign(trace.get_current_span(current)):
        return current
    own = otel_context.get_value(key, current)
    return trace.set_span_in_context(own if isinstance(own, trace.Span) else trace.INVALID_SPAN, current)


def service_context(context: Context | None = None) -> Context:
    """The context, with the service's own span as its current span when a Langfuse span is current."""
    return _own_context(_SERVICE_SPAN_KEY, _is_langfuse_span, context)


def langfuse_context(context: Context | None = None) -> Context:
    """The context, with Langfuse's own span as its current span when one of the service's spans is current."""
    return _own_context(_LANGFUSE_SPAN_KEY, _is_service_span, context)


@contextmanager
def attached(context: Context) -> Iterator[None]:
    """Make context the current context in the block."""
    token = otel_context.attach(context)
    try:
        yield
    finally:
        otel_context.detach(token)


class _IsolatedTracer(trace.Tracer):
    def __init__(self, tracer: trace.Tracer, key: str, is_foreign: Callable[[trace.Span], bool]) -> None:
        self._tracer = tracer
        self._key = key
        self._is_foreign = is_foreign

    def start_span(
        self,
        name: str,
        context: Context | None = None,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: Attributes = None,
        links: list[Link] | None = None,
        start_time: int | None = None,
        record_exception: bool = True,
        set_status_on_exception: bool = True,
    ) -> trace.Span:
        return self._tracer.start_span(
            name,
            _own_context(self._key, self._is_foreign, context),
            kind,
            attributes,
            links,
            start_time,
            record_exception,
            set_status_on_exception,
        )

    @contextmanager
    def start_as_current_span(
        self,
        name: str,
        context: Context | None = None,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: Attributes = None,
        links: list[Link] | None = None,
        start_time: int | None = None,
        record_exception: bool = True,
        set_status_on_exception: bool = True,
        end_on_exit: bool = True,
    ) -> Iterator[trace.Span]:
        span = self.start_span(
            name, context, kind, attributes, links, start_time, record_exception, set_status_on_exception
        )
        with (
            attached(otel_context.set_value(self._key, span)),
            trace.use_span(
                span,
                end_on_exit=end_on_exit,
                record_exception=record_exception,
                set_status_on_exception=set_status_on_exception,
            ) as current,
        ):
            yield current


class _IsolatedTracerProvider(TracerProvider):
    def __init__(self, *, key: str, is_foreign: Callable[[trace.Span], bool], **kwargs) -> None:
        super().__init__(**kwargs)
        self._key = key
        self._is_foreign = is_foreign

    def get_tracer(self, *args, **kwargs) -> trace.Tracer:
        return _IsolatedTracer(super().get_tracer(*args, **kwargs), self._key, self._is_foreign)


def service_tracer_provider(**kwargs) -> TracerProvider:
    """The service's tracer provider, whose spans never take a Langfuse span as their parent."""
    return _IsolatedTracerProvider(key=_SERVICE_SPAN_KEY, is_foreign=_is_langfuse_span, **kwargs)


def langfuse_tracer_provider(**kwargs) -> TracerProvider:
    """Langfuse's tracer provider, whose spans never take one of the service's spans as their parent."""
    return _IsolatedTracerProvider(key=_LANGFUSE_SPAN_KEY, is_foreign=_is_service_span, **kwargs)


def new_service_context(span: trace.Span) -> Context:
    """A new context with span as its only current span, for work that runs in a trace of its own."""
    return otel_context.set_value(_SERVICE_SPAN_KEY, span, trace.set_span_in_context(span, Context()))
