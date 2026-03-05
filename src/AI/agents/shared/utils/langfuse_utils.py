"""Langfuse tracking utilities"""
from langfuse import Langfuse
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
        # Initialize Langfuse client (without 'enabled' parameter - control via LANGFUSE_ENABLED env var)
        _client = Langfuse(
            secret_key=config.LANGFUSE_SECRET_KEY,
            public_key=config.LANGFUSE_PUBLIC_KEY,
            host=config.LANGFUSE_HOST,
            release=config.LANGFUSE_RELEASE,
            environment=config.LANGFUSE_ENVIRONMENT,
        )

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


def get_langfuse_client() -> Langfuse | None:
    """Get or initialize Langfuse client"""
    global _client

    if not _initialized:
        init_langfuse()

    return _client


def fetch_langfuse_prompt(prompt_name: str, *, label: str = None, version: int = None, cache_ttl_seconds: int = None) -> str:
    """
    Fetch a text prompt from Langfuse by name.

    Args:
        prompt_name: Name of the prompt in Langfuse
        label: Optional label (e.g. "production", "latest"). Defaults to "production" in Langfuse.
        version: Optional specific version number to fetch
        cache_ttl_seconds: Optional cache TTL override in seconds

    Returns:
        Compiled prompt content as string

    Raises:
        RuntimeError: If Langfuse client is not initialized
        Exception: If prompt not found in Langfuse
    """
    client = get_langfuse_client()
    if client is None:
        raise RuntimeError("Langfuse client not initialized")

    kwargs = {}
    if label is not None:
        kwargs["label"] = label
    if version is not None:
        kwargs["version"] = version
    if cache_ttl_seconds is not None:
        kwargs["cache_ttl_seconds"] = cache_ttl_seconds

    prompt = client.get_prompt(prompt_name, type="text", **kwargs)
    return prompt.compile()


def fetch_langfuse_template(prompt_name: str, variables: dict, *, label: str = None, version: int = None, cache_ttl_seconds: int = None) -> str:
    """
    Fetch a text prompt from Langfuse and compile it with variables.

    Langfuse templates use {{variable}} syntax for substitution.

    Args:
        prompt_name: Name of the prompt in Langfuse
        variables: Dictionary of variables to substitute into the template
        label: Optional label (e.g. "production", "latest")
        version: Optional specific version number to fetch
        cache_ttl_seconds: Optional cache TTL override in seconds

    Returns:
        Compiled prompt content with variables substituted

    Raises:
        RuntimeError: If Langfuse client is not initialized
        Exception: If prompt not found in Langfuse
    """
    client = get_langfuse_client()
    if client is None:
        raise RuntimeError("Langfuse client not initialized")

    kwargs = {}
    if label is not None:
        kwargs["label"] = label
    if version is not None:
        kwargs["version"] = version
    if cache_ttl_seconds is not None:
        kwargs["cache_ttl_seconds"] = cache_ttl_seconds

    prompt = client.get_prompt(prompt_name, type="text", **kwargs)
    return prompt.compile(**variables)


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
) -> None:
    """Write a boolean validation result as a Langfuse score (1 = pass, 0 = fail)."""
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
        if comment:
            kwargs["comment"] = comment
        client.create_score(**kwargs)
        log.debug("Langfuse score '%s' = %s written to trace %s", name, passed, trace_id)
    except Exception as e:
        log.debug("Failed to create Langfuse score '%s': %s", name, e)

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
