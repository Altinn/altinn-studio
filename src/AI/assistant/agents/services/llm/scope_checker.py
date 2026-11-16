"""Scope classification for chat assistant Q&A queries.

Runs before any tool retrieval so out-of-scope questions never reach
doc-injected response generation, where keyword overlap with retrieved
documentation previously caused the model to answer questions it should
have declined (e.g. a phone-number lookup matching Altinn's "lookup-service"
feature by name).
"""

from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel

from agents.prompts import get_prompt_with_langfuse
from shared.utils.logging_utils import get_logger

from .llm_client import get_llm_client
from .recent_turns import prepend_recent_turns

log = get_logger(__name__)


class ScopeCheckResult(BaseModel):
    in_scope: bool
    decline_message: str | None = None
    reason: str | None = None


def build_scope_check_message(query: str, conversation: Sequence[Any] | None = None) -> str:
    """The user message the scope classifier sees, as a value so a dataset can
    send exactly what production sends."""
    return prepend_recent_turns(f"Classify this question: {query}", conversation)


async def check_scope_async(query: str, conversation_history: Sequence[Any] | None = None) -> ScopeCheckResult:
    """Classify whether a chat question is about Altinn Studio/apps.

    The recent conversation goes with it: a follow-up read alone is about
    whatever its own words name, which is how "og hva med den andre siden?"
    became out of scope.
    """
    system_prompt, lf_prompt = get_prompt_with_langfuse("scope_check")
    user_prompt = build_scope_check_message(query, conversation_history)

    try:
        response = await get_llm_client().call_async(
            system_prompt, user_prompt, langfuse_prompt=lf_prompt, response_schema=ScopeCheckResult
        )
        return ScopeCheckResult.model_validate_json(response)
    except Exception as e:
        log.warning(f"Scope check failed, defaulting to in-scope: {e}")
        return ScopeCheckResult(in_scope=True, reason=f"Scope check failed open: {e}")
