"""Planner workflow pipeline for generating initial implementation plans."""

from __future__ import annotations

import json
from langfuse import get_client
from typing import Any, Dict, Optional, List

from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
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
    system_prompt = get_prompt_content("planner_initial")
    user_prompt = render_template(
        "planner_initial_user",
        user_goal=user_goal,
        planner_step=planner_step or "No plan generated yet"
    )

    langfuse = get_client()
    with langfuse.start_as_current_observation(
        name="initial_planning_llm",
        as_type="generation",
        model=client.model,
        metadata={"user_goal_length": len(user_goal), **client.get_model_metadata()},
        input={
            "user_goal": user_goal,
            "planner_step_present": bool(planner_step),
        }
    ) as span:

        response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
        parsed = json.loads(response) if is_json(response) else None
        span.update(output={
            "response": parsed if parsed else response[:5000],
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
