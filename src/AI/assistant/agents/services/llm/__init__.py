"""LLM client and the security gate."""

from .llm_client import LLMClient, check_security_with_llm, suggest_goals_with_llm
from .scope_checker import ScopeCheckResult, check_scope_async
from .security_checker import (
    GATE_FAILED_ACTION,
    SecurityCheckResult,
    check_security_async,
    suggest_goal_correction,
)

__all__ = [
    "GATE_FAILED_ACTION",
    "LLMClient",
    "ScopeCheckResult",
    "SecurityCheckResult",
    "check_scope_async",
    "check_security_async",
    "check_security_with_llm",
    "suggest_goal_correction",
    "suggest_goals_with_llm",
]
