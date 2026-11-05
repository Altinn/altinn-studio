"""Logging utilities"""

import logging


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)


def describe_error(exc: BaseException) -> str:
    """The exception's type, and the HTTP status of a provider error, without its message.

    Log records at WARNING and above go to the shared telemetry backend, and an exception's message can carry what
    must not: a model provider's response body, a git command with its API key, or the input a validation error
    rejected.
    """
    status = getattr(exc, "status_code", None)
    return f"{type(exc).__name__} (status {status})" if isinstance(status, int) else type(exc).__name__
