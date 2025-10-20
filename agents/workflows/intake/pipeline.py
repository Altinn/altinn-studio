"""Intake workflow pipeline for generating repository-aware planning context."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from textwrap import dedent
from typing import Dict, List, Optional

import mlflow

from agents.services.llm import LLMClient
from agents.workflows.shared.utils import load_system_prompt
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
) -> Dict[str, object]:
    """Execute the intake workflow and return plan WITHOUT repository context."""
    
    # Don't scan here - let the scan node handle repository discovery
    context = RepositoryContext()  # Use defaults
    system_prompt = load_system_prompt("intake_prompt")

    user_prompt = dedent(
        f"""
        GOAL: {user_goal}

        Create a high-level plan without repository details. Focus on understanding user intent.
        
        Keep it simple - repository scanning and detailed planning come later.
        """
    ).strip()

    client = LLMClient(role="planner")
    with mlflow.start_span(name="intake_planning_llm", span_type="LLM") as span:
        metadata = client.get_model_metadata()
        span.set_attributes({**metadata, "user_goal_length": len(user_goal)})
        span.set_inputs({"user_goal": user_goal})

        response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
        span.set_outputs({
            "raw_response": response[:5000],
            "formats": {
                "text": response,
                "markdown": "```\n" + response + "\n```",
            },
        })

    return {
        "plan": response.strip(),
        "facts": None,  # Don't provide facts here
        "context": context,
    }
