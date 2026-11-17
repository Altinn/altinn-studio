"""Langfuse tracking utilities"""

from contextlib import contextmanager

from langfuse import Langfuse, get_client
from opentelemetry import context as otel_context
from opentelemetry.sdk.trace import SpanProcessor

from shared.config.base_config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_client = None
_initialized = False

_PROPAGATED_SPAN_ATTRIBUTES = otel_context.create_key("assistant.propagated_span_attributes")


class _PropagatedAttributesProcessor(SpanProcessor):
    """Copies the attributes of an enclosing `propagate_span_attributes` to each span as it starts."""

    def on_start(self, span, parent_context=None):
        attributes = otel_context.get_value(_PROPAGATED_SPAN_ATTRIBUTES, parent_context)
        if isinstance(attributes, dict):
            span.set_attributes(attributes)


@contextmanager
def propagate_span_attributes(attributes: dict[str, str]):
    """Put `attributes` on every span that starts inside this block.

    Langfuse reads each observation on its own, so its filters and aggregations
    miss a child span when only the root span has an attribute.
    `langfuse.propagate_attributes` copies the attributes it knows about. Use
    this for the others.
    """
    if not attributes:
        yield
        return
    token = otel_context.attach(otel_context.set_value(_PROPAGATED_SPAN_ATTRIBUTES, attributes))
    try:
        yield
    finally:
        otel_context.detach(token)


def init_langfuse():
    """Initialize Langfuse with proper configuration"""
    global _client, _initialized

    if _initialized:
        log.debug("Langfuse already initialized")
        return _client

    if not config.LANGFUSE_ENABLED:
        log.info("Langfuse tracking is disabled")
        return None

    try:
        from opentelemetry import trace as _otel_trace
        from opentelemetry.sdk.trace import TracerProvider as _OtelTracerProvider

        # Give Langfuse its own dedicated TracerProvider so it is isolated from
        # the global OTel provider that third-party libraries share.
        langfuse_provider = _OtelTracerProvider()
        langfuse_provider.add_span_processor(_PropagatedAttributesProcessor())

        _client = Langfuse(
            secret_key=config.LANGFUSE_SECRET_KEY,
            public_key=config.LANGFUSE_PUBLIC_KEY,
            base_url=config.LANGFUSE_HOST,
            release=config.LANGFUSE_RELEASE,
            environment=config.LANGFUSE_ENVIRONMENT,
            tracer_provider=langfuse_provider,
        )

        # Reset the global OTel provider to a bare no-op (no exporters/processors).
        # Any third-party library that instruments via the global provider will
        # now get a no-op tracer, eliminating duplicate child spans and orphan
        # traces from health checks.
        _otel_trace.set_tracer_provider(_OtelTracerProvider())

        _initialized = True
        log.info(
            f"Langfuse initialized successfully (host: {config.LANGFUSE_HOST}, release: {config.LANGFUSE_RELEASE}, env: {config.LANGFUSE_ENVIRONMENT})"
        )

        return _client

    except Exception as e:
        log.error(f"Failed to initialize Langfuse: {e}")
        log.warning("Langfuse tracking will be disabled")
        return None


def is_langfuse_enabled() -> bool:
    """Check if Langfuse tracking is enabled and initialized"""
    return config.LANGFUSE_ENABLED and _initialized


def get_langfuse_client() -> Langfuse | None:
    """Get or initialize Langfuse client"""
    global _client

    if not _initialized:
        init_langfuse()

    return _client


def get_raw_langfuse_prompt(prompt_name: str, **kwargs):
    """Return the raw Langfuse prompt object (not compiled) for linking to generation spans.

    Returns None if Langfuse is disabled, unavailable, or the prompt is not found.
    Pass the returned object to call_sync/call_async via the langfuse_prompt parameter.
    """
    client = get_langfuse_client()
    if not client:
        return None
    try:
        return client.get_prompt(prompt_name, type="text", **kwargs)
    except Exception as e:
        log.debug("Could not fetch raw prompt '%s': %s", prompt_name, e)
        return None


def flush_langfuse():
    """Flush any pending Langfuse events (for short-lived applications)"""
    if _client and is_langfuse_enabled():
        try:
            _client.flush()
            log.debug("Langfuse events flushed")
        except Exception as e:
            log.debug(f"Failed to flush Langfuse: {e}")


def score_validation(
    name: str,
    passed: bool,
    trace_id: str | None,
    observation_id: str | None = None,
    config_id: str | None = None,
    comment: str | None = None,
    score_id: str | None = None,
) -> None:
    """Write a boolean validation result as a Langfuse score (1 = pass, 0 = fail).

    Pass `score_id` to upsert: re-using the same id on a later call overwrites the previous score.
    """
    client = get_langfuse_client()
    if not config.LANGFUSE_ENABLED:
        return
    if not client or not trace_id:
        return
    try:
        kwargs: dict = {
            "trace_id": trace_id,
            "name": name,
            "value": 1.0 if passed else 0.0,
            "data_type": "BOOLEAN",
        }
        if config_id:
            kwargs["config_id"] = config_id
        if observation_id:
            kwargs["observation_id"] = observation_id
        if comment is not None:
            kwargs["comment"] = comment
        if score_id:
            kwargs["score_id"] = score_id
        client.create_score(**kwargs)
        log.debug("Langfuse score '%s' = %s written to trace %s", name, passed, trace_id)
    except Exception as e:
        log.debug("Failed to create Langfuse score '%s': %s", name, e)


class _NoopSpan:
    """Dummy span returned when there is no active Langfuse trace context."""

    def update(self, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def delete_score(score_id: str) -> None:
    """Remove a score by id. Used to clear user feedback on a trace."""
    client = get_langfuse_client()
    if not config.LANGFUSE_ENABLED:
        return
    if not client or not score_id:
        return
    try:
        client.api.scores.delete(score_id)
        log.debug("Langfuse score %s deleted", score_id)
    except Exception as e:
        log.warning("Failed to delete Langfuse score '%s': %s", score_id, e)


def get_trace_developer(trace_id: str) -> str | None:
    """Return the developer stored on a Langfuse trace's root-span metadata."""
    client = get_langfuse_client()
    if not client or not trace_id:
        return None
    try:
        root_observations = client.api.observations.get_many(
            trace_id=trace_id,
            is_root_observation=True,
            fields="core,metadata",
            limit=1,
        ).data
    except Exception as exc:
        log.debug("Langfuse trace lookup failed for %s: %s", trace_id, exc)
        return None

    if not root_observations:
        return None
    metadata = root_observations[0].metadata or {}
    return metadata.get("developer")


def get_current_trace_id() -> str | None:
    """Return the current Langfuse trace id, or None if unavailable or disabled."""
    if not is_langfuse_enabled():
        return None
    try:
        return get_client().get_current_trace_id()
    except Exception:
        log.exception("Failed to get current Langfuse trace ID")
        return None


def _has_active_trace() -> bool:
    """Return True when a Langfuse trace context is currently active."""
    return get_current_trace_id() is not None


@contextmanager
def trace_span(name: str, **kwargs):
    """
    Creates a Langfuse span only when an active parent trace exists.
    Falls back to a no-op when called outside a traced workflow,
    preventing orphan spans with null input / undefined output.
    """
    if not is_langfuse_enabled() or not _has_active_trace():
        yield _NoopSpan()
        return

    with get_client().start_as_current_observation(as_type="span", name=name, **kwargs) as span:
        yield span


@contextmanager
def trace_generation(name: str, **kwargs):
    """
    Creates a Langfuse generation observation only when an active parent trace exists.
    Falls back to a no-op otherwise.
    """
    if not is_langfuse_enabled() or not _has_active_trace():
        yield _NoopSpan()
        return

    with get_client().start_as_current_observation(name=name, as_type="generation", **kwargs) as span:
        yield span
