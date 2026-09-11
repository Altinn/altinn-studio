"""Scope classification for chat assistant Q&A queries.

Runs before any tool retrieval so out-of-scope questions never reach
doc-injected response generation, where keyword overlap with retrieved
documentation previously caused the model to answer questions it should
have declined (e.g. a phone-number lookup matching Altinn's "lookup-service"
feature by name).
"""
import json
from typing import Any, Optional, Sequence

from pydantic import BaseModel

from .llm_client import get_llm_client
from agents.prompts import get_prompt_with_langfuse
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class ScopeCheckResult(BaseModel):
    in_scope: bool
    decline_message: Optional[str] = None
    reason: Optional[str] = None


CONTEXT_TURNS = 4
CONTEXT_CHARS_PER_TURN = 400


def build_scope_check_message(query: str, conversation: Sequence[Any] | None = None) -> str:
    """The user message the scope classifier sees, as a value so a dataset can
    send exactly what production sends."""
    recent = _recent_turns(conversation)
    if not recent:
        return f"Classify this question: {query}"
    return (
        "Recent conversation, oldest first, for judging a follow-up:\n"
        f"{recent}\n\n"
        f"Classify this question: {query}"
    )


def _recent_turns(conversation: Sequence[Any] | None) -> str:
    lines = []
    for turn in list(conversation or [])[-CONTEXT_TURNS:]:
        role = _field(turn, "role")
        text = _field(turn, "content") or _field(turn, "text")
        if role and text:
            lines.append(f"{role}: {text[:CONTEXT_CHARS_PER_TURN]}")
    return "\n".join(lines)


def _field(turn: Any, name: str) -> str:
    value = turn.get(name) if isinstance(turn, dict) else getattr(turn, name, None)
    return value if isinstance(value, str) else ""


async def check_scope_async(
    query: str, conversation_history: Sequence[Any] | None = None
) -> ScopeCheckResult:
    """Classify whether a chat question is about Altinn Studio/apps.

    The recent conversation goes with it: a follow-up read alone is about
    whatever its own words name, which is how "og hva med den andre siden?"
    became out of scope.
    """
    system_prompt, lf_prompt = get_prompt_with_langfuse("scope_check")
    user_prompt = build_scope_check_message(query, conversation_history)

    client = get_llm_client()
    try:
        response = await client.call_async(system_prompt, user_prompt, langfuse_prompt=lf_prompt)
    except Exception as e:
        log.warning(f"Scope check LLM call failed, defaulting to in-scope: {e}")
        return ScopeCheckResult(in_scope=True, reason=f"Scope check failed open: {e}")

    cleaned = response.strip()
    if cleaned.startswith("```"):
        fence_end = cleaned.find("\n")
        first_line = cleaned[:fence_end] if fence_end != -1 else cleaned
        cleaned = cleaned[len(first_line):].strip() if first_line.startswith("```") else cleaned
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            raise ValueError("Parsed JSON is not an object")
        in_scope = data.get("in_scope", True)
        if not isinstance(in_scope, bool):
            # Truthiness would misread string booleans ("false" is truthy);
            # a verdict that isn't an actual boolean is a parse failure.
            raise ValueError(f"in_scope is not a boolean: {in_scope!r}")
        return ScopeCheckResult(
            in_scope=in_scope,
            decline_message=data.get("decline_message"),
            reason=data.get("reason"),
        )
    except (json.JSONDecodeError, TypeError, ValueError, AttributeError) as e:
        log.warning(f"Failed to parse scope check response, defaulting to in-scope: {response!r} ({e})")
        return ScopeCheckResult(in_scope=True, reason="Failed to parse scope check response")
