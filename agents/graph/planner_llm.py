"""
Planner LLM node for creating implementation plans before repository scanning
"""
from typing import Dict, List
from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from agents.workflows.planner.pipeline import generate_initial_plan


def planner_llm(state: AgentState) -> AgentState:
    """Initial planner node leveraging the planner workflow pipeline."""

    try:
        result = generate_initial_plan(state.user_goal, attachments=state.attachments)
        state.general_plan = result.get("parsed_plan")
        state.implementation_plan = result.get("raw_plan")

        sink.send(AgentEvent(
            type="implementation_plan_created",
            session_id=state.session_id,
            data={
                "plan": (state.implementation_plan[:500] + "...")
                if state.implementation_plan and len(state.implementation_plan) > 500
                else state.implementation_plan,
            },
        ))

        state.next_action = "scan"

    except Exception as exc:
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Implementation planning failed: {str(exc)}"},
        ))
        state.next_action = "stop"

    return state
