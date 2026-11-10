"""Silencing two harmless SDK messages that drown everything else."""

from __future__ import annotations

import logging

# httpx tears its client down after the SDK's loop has closed. Cosmetic, ten a run.
LOOP_CLOSED = ("Event loop is closed", "Task exception was never retrieved")

# Span attributes cap at 200 characters; only the span copy of the note is dropped.
LANGFUSE_NOISE = (
    "is over 200 characters",
    # The judge review is a plain model call outside any experiment span.
    "No active span in current context",
)

# The SDK sets up tracing per experiment; every one after the first is a no-op.
TRACER_PROVIDER = ("Overriding of current TracerProvider is not allowed",)


class _Drop(logging.Filter):
    def __init__(self, needles: tuple[str, ...]) -> None:
        super().__init__()
        self.needles = needles

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(needle in message for needle in self.needles)


def apply() -> None:
    """Install the filters. Safe to call more than once."""
    for name, needles in (
        ("asyncio", LOOP_CLOSED),
        ("langfuse", LANGFUSE_NOISE),
        ("opentelemetry.trace", TRACER_PROVIDER),
    ):
        logger = logging.getLogger(name)
        if not any(isinstance(f, _Drop) and f.needles == needles for f in logger.filters):
            logger.addFilter(_Drop(needles))
