"""Langfuse tracking utilities"""
from contextlib import contextmanager
from langfuse import Langfuse, get_client
from shared.config.base_config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_client = None
_initialized = False


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
        from opentelemetry.sdk.trace import TracerProvider as _OtelTracerProvider
        from opentelemetry import trace as _otel_trace

        # Give Langfuse its own dedicated TracerProvider so it is isolated from
        # the global OTel provider that third-party libraries (fastmcp) share.
        langfuse_provider = _OtelTracerProvider()

        _client = Langfuse(
            secret_key=config.LANGFUSE_SECRET_KEY,
            public_key=config.LANGFUSE_PUBLIC_KEY,
            host=config.LANGFUSE_HOST,
            release=config.LANGFUSE_RELEASE,
            environment=config.LANGFUSE_ENVIRONMENT,
            tracer_provider=langfuse_provider,
        )

        # Reset the global OTel provider to a bare no-op (no exporters/processors).
        # fastmcp's client_span() calls otel_get_tracer() against this global
        # provider and will now get a no-op tracer, eliminating the duplicate
        # 'tools/call <name>' child spans and orphan traces from health checks.
        _otel_trace.set_tracer_provider(_OtelTracerProvider())

        _initialized = True
        log.info(f"Langfuse initialized successfully (host: {config.LANGFUSE_HOST}, release: {config.LANGFUSE_RELEASE}, env: {config.LANGFUSE_ENVIRONMENT})")

        return _client

    except Exception as e:
        log.error(f"Failed to initialize Langfuse: {e}")
        log.warning("Langfuse tracking will be disabled")
        return None


def is_langfuse_enabled() -> bool:
    """Check if Langfuse tracking is enabled and initialized"""
    return config.LANGFUSE_ENABLED and _initialized


def get_langfuse_client() -> Langfuse:
    """Get or initialize Langfuse client"""
    global _client
    
    if not _initialized:
        init_langfuse()
    
    return _client


def flush_langfuse():
    """Flush any pending Langfuse events (for short-lived applications)"""
    if _client and is_langfuse_enabled():
        try:
            _client.flush()
            log.debug("Langfuse events flushed")
        except Exception as e:
            log.debug(f"Failed to flush Langfuse: {e}")


# For backward compatibility with code that expects these functions
# These are no-ops now since Langfuse handles things differently
def start_run_safe(run_name: str = None, **kwargs):
    """
    Legacy compatibility function. Langfuse uses traces instead of runs.
    Returns a dummy context manager.
    """
    class DummyContext:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
    return DummyContext()


def log_param_safe(key: str, value):
    """
    Legacy compatibility function. Langfuse uses metadata instead of params.
    This is now a no-op - use metadata on spans/traces instead.
    """
    pass


def log_metric_safe(key: str, value: float):
    """
    Legacy compatibility function. Langfuse uses scores instead of metrics.
    This is now a no-op - use scores on traces instead.
    """
    pass


def log_text_safe(text: str, artifact_file: str):
    """
    Legacy compatibility function. Langfuse stores outputs directly.
    This is now a no-op - use outputs on spans instead.
    """
    pass


class _NoopSpan:
    """Dummy span returned when there is no active Langfuse trace context."""

    def update(self, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def _has_active_trace() -> bool:
    """Return True when a Langfuse trace context is currently active."""
    try:
        trace_id = get_client().get_current_trace_id()
        return trace_id is not None
    except Exception:
        return False


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

    with get_client().start_as_current_span(name=name, **kwargs) as span:
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
