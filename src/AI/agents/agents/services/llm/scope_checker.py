"""Scope classification for chat assistant Q&A queries.

Runs before any tool retrieval so out-of-scope questions never reach
doc-injected response generation, where keyword overlap with retrieved
documentation previously caused the model to answer questions it should
have declined (e.g. a phone-number lookup matching Altinn's "lookup-service"
feature by name).
"""
import json
from typing import Optional

from pydantic import BaseModel

from .llm_client import get_llm_client
from agents.prompts import get_prompt_with_langfuse
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class ScopeCheckResult(BaseModel):
    in_scope: bool
    decline_message: Optional[str] = None
    reason: Optional[str] = None


async def check_scope_async(query: str) -> ScopeCheckResult:
    """Classify whether a chat question is about Altinn Studio/apps.

    Fails open (in_scope=True) if the classifier call itself fails, so a
    broken/timed-out classifier blocks legitimate users rather than every user.
    """
    system_prompt, lf_prompt = get_prompt_with_langfuse("scope_check")
    user_prompt = f"Classify this question: {query}"

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
        return ScopeCheckResult(
            in_scope=bool(data.get("in_scope", True)),
            decline_message=data.get("decline_message"),
            reason=data.get("reason"),
        )
    except (json.JSONDecodeError, TypeError) as e:
        log.warning(f"Failed to parse scope check response, defaulting to in-scope: {response!r} ({e})")
        return ScopeCheckResult(in_scope=True, reason="Failed to parse scope check response")
