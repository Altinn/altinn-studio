"""The result of a tool that cannot run, because of the deployment or the infrastructure."""

from __future__ import annotations

from agents.core.tool import ToolResult

_UNAVAILABLE_GUIDANCE = (
    "This is an infrastructure limitation, not a problem with the app — "
    "do NOT retry, and do NOT try to fix anything based on this."
)


def report_unavailable(reason: str, *, next_step: str = "") -> ToolResult:
    """Tells the model why the tool cannot run, and that it must not retry.  `next_step` says what the model does
    instead.  `unavailable` in the metadata tells the code that called the tool that the app did not fail."""
    content = " ".join(part for part in (reason, _UNAVAILABLE_GUIDANCE, next_step) if part)
    return ToolResult(content=content, is_error=True, metadata={"unavailable": True})
