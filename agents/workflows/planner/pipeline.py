"""Planner workflow pipeline for generating initial implementation plans."""

from __future__ import annotations

import json
import mlflow
from textwrap import dedent
from typing import Any, Dict, Optional, List

from agents.services.llm import LLMClient
from shared.models import AgentAttachment
from agents.services.telemetry import is_json
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def generate_initial_plan(
    user_goal: str,
    *,
    planner_step: Optional[str] = None,
    attachments: Optional[List[AgentAttachment]] = None,
) -> Dict[str, Any]:
    """Generate the initial high-level implementation plan from the planner LLM."""

    client = LLMClient(role="planner")
    system_prompt = (
        "You are the lead strategist for an Altinn multi-agent build system. "
        "Summarize the requested change, highlight key requirements, identify risks, "
        "and outline major subtasks. Respond with JSON only."
    )
    user_prompt = dedent(
        f"""
        USER GOAL:
        {user_goal}

        CURRENT PLAN STEP (if any):
        {planner_step or "No plan generated yet"}

        Return JSON with:
        {{
          "goal_summary": "one paragraph",
          "key_requirements": ["..."],
          "risks": ["..."],
          "suggested_subtasks": ["..."],
          "notes_for_team": "guidance for other agents"
        }}
        """
    ).strip()

    with mlflow.start_span(name="initial_planning_llm", span_type="LLM") as span:
        metadata = client.get_model_metadata()
        span.set_attributes({**metadata, "user_goal_length": len(user_goal)})
        span.set_inputs({
            "user_goal": user_goal,
            "planner_step_present": bool(planner_step),
        })

        response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
        span.set_outputs({
            "raw_response": response[:5000],
            "formats": {
                "text": response,
                "markdown": "```\n" + response + "\n```",
                "json": json.loads(response) if is_json(response) else None,
            },
        })

    parsed_plan: Optional[Dict[str, Any]] = None
    if is_json(response):
        try:
            parsed_plan = json.loads(response)
        except json.JSONDecodeError as exc:
            log.warning("Planner response could not be parsed as JSON: %s", exc)

    return {
        "raw_plan": response,
        "parsed_plan": parsed_plan,
    }
