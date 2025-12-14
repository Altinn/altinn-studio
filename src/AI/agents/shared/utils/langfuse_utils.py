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
