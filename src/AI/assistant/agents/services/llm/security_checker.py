"""The security gate: screens a write request for abuse before the agent starts."""

# TODO: Not sure if this is necessary at all
import asyncio
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel

from shared.models import AgentAttachment
from shared.utils.logging_utils import get_logger

from .llm_client import check_security_with_llm, suggest_goals_with_llm

log = get_logger(__name__)

# `action` when the classifier never ran, as opposed to answering "unsafe".
GATE_FAILED_ACTION = "error"


class SecurityCheckResult(BaseModel):
    """The security gate's verdict on a goal, with what the classifier read from it."""

    action: str  # add, remove, update, move
    component: str  # field, layout, validation, etc.
    target: str  # specific target like "layout main", "field totalWeight"
    details: dict[str, str] = {}  # additional details like type, binding
    safe: bool = True  # whether the goal is a legitimate request
    reason: str | None = None  # reason if not safe


async def check_security_async(
    goal: str,
    attachments: list[AgentAttachment] | None = None,
    conversation: Sequence[Any] | None = None,
) -> SecurityCheckResult:
    """Screen a goal for abuse: a keyword blocklist, then the classifier."""

    # Quick safety check before LLM processing
    is_safe, safety_reason = _validate_goal_safety_quick(goal)
    if not is_safe:
        return SecurityCheckResult(
            action="blocked",
            component="unknown",
            target=goal,
            safe=False,
            reason=safety_reason,
        )

    try:
        result = await check_security_with_llm(goal, attachments=attachments, conversation=conversation)

        # Validate LLM response structure
        parsed = SecurityCheckResult(
            action=result.get("action", "unknown"),
            component=result.get("component", "unknown"),
            target=result.get("target", goal),
            details=result.get("details", {}),
            safe=result.get("safe", False),
            reason=result.get("reason"),
        )

        # Log if the classifier marked something unsafe
        if not parsed.safe:
            log.warning(f"Security gate flagged goal as unsafe: {parsed.reason}")

        return parsed

    except Exception as e:
        log.error(f"Security check failed: {e}")
        return SecurityCheckResult(
            action=GATE_FAILED_ACTION,
            component="unknown",
            target=goal,
            safe=False,
            reason=f"Security check failed: {e!s}",
        )


def _validate_goal_safety_quick(goal: str) -> tuple[bool, str | None]:
    """Quick safety check for dangerous keywords before LLM processing"""
    goal_lower = goal.lower().strip()

    # Hard safety blocks - focus on truly destructive or security-sensitive patterns
    dangerous_patterns = [
        "drop database",
        "drop table",
        "truncate table",
        "truncate database",
        "destroy server",
        "destroy environment",
        "wipe database",
        "wipe server",
        "format disk",
        "shutdown production",
        "kill process",
        "disable auth",
        "exfiltrate",
    ]

    for pattern in dangerous_patterns:
        if pattern in goal_lower:
            return False, f"Contains potentially dangerous pattern: {pattern}"

    return True, None


async def suggest_goal_correction(
    goal: str,
    rejection_reason: str | None = None,
    conversation: Sequence[Any] | None = None,
) -> list[str]:
    """Suggest goals the user could ask for instead of the rejected one.

    Never raises: a rejection must not turn into a generic error because the
    suggestions could not be produced.
    """
    try:
        candidates = await asyncio.to_thread(suggest_goals_with_llm, goal, rejection_reason, conversation)
    except Exception as e:
        log.warning(f"Could not generate goal suggestions: {e}")
        return []
    return await _drop_suggestions_the_gate_would_reject(candidates, conversation)


async def _drop_suggestions_the_gate_would_reject(
    candidates: list[str], conversation: Sequence[Any] | None
) -> list[str]:
    """Offering a suggestion the gate rejects sends the user round in a circle."""
    if not candidates:
        return []
    verdicts = await asyncio.gather(*(_would_be_accepted(candidate, conversation) for candidate in candidates))
    kept = [candidate for candidate, ok in zip(candidates, verdicts, strict=False) if ok]
    if len(kept) != len(candidates):
        log.info(f"Dropped {len(candidates) - len(kept)} suggestion(s) the gate would reject")
    return kept


async def _would_be_accepted(goal: str, conversation: Sequence[Any] | None) -> bool:
    is_safe, _ = _validate_goal_safety_quick(goal)
    if not is_safe:
        return False
    try:
        parsed = await check_security_async(goal, conversation=conversation)
    except Exception:
        return False
    return parsed.safe
