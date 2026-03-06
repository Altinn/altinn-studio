"""Intake workflow pipeline for generating repository-aware planning context."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from shared.utils.langfuse_utils import trace_generation

from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
from shared.utils.logging_utils import get_logger
from shared.models import AgentAttachment

log = get_logger(__name__)


@dataclass
class RepositoryContext:
    available_locales: List[str] = field(default_factory=lambda: ["nb", "nn"])
    source_of_truth: str = "json_schema"
    layout_pages: List[str] = field(default_factory=list)
    model_files: List[str] = field(default_factory=list)
    resource_files: List[str] = field(default_factory=list)


def _build_context(facts: Dict[str, List[str]]) -> RepositoryContext:
    # Simplified - just return defaults since intake doesn't scan
    return RepositoryContext()


def run_intake_pipeline(
    repo_path: str,
    user_goal: str,
    *,
    attachments: Optional[List[AgentAttachment]] = None,
    conversation_history: Optional[List] = None,
) -> Dict[str, object]:
    """Execute the intake workflow and return plan WITHOUT repository context."""
    
    # Don't scan here - let the scan node handle repository discovery
    context = RepositoryContext()  # Use defaults
    system_prompt = get_prompt_content("intake_planning")
    
    # Build user prompt with conversation history context if available
    user_prompt = render_template("intake_planning_user", user_goal=user_goal)
    
    # Add conversation history context for follow-up requests
    if conversation_history and len(conversation_history) > 0:
        history_context = "\n\nPREVIOUS CONVERSATION CONTEXT:\n"
        for msg in conversation_history[-6:]:  # Last 3 exchanges (6 messages)
            role = "User" if msg.role == "user" else "Assistant"
            content = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
            history_context += f"{role}: {content}\n\n"
        history_context += "Use this context to understand what has already been done and what the user is asking for now.\n"
        user_prompt = history_context + user_prompt

    client = LLMClient(role="planner")
    with trace_generation(
        "intake_planning_llm",
        model=client.model,
        input={"user_goal": user_goal},
        metadata={"has_attachments": bool(attachments), **client.get_model_metadata()},
    ) as span:

        response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
        span.update(output={"response": response[:5000]})

    return {
        "plan": response.strip(),
        "facts": None,  # Don't provide facts here
        "context": context,
    }
