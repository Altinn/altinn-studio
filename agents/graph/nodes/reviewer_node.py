"""Reviewer node for LangGraph workflow."""
from typing import Dict, List, Optional, Any

from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from agents.workflows.reviewer.pipeline import (
    execute_reviewer_workflow,
)
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Handle the reviewer node execution.

    Args:
        state: Current agent state

    Returns:
        Updated agent state
    """
    log.info("👨‍⚖️ Reviewer node executing")
    try:
        # Execute the complete reviewer workflow
        result = await execute_reviewer_workflow(
            repo_path=state.repo_path,
            user_goal=state.user_goal,
            step_plan=state.step_plan,
            changed_files=state.changed_files or [],
            tests_passed=state.tests_passed,
            verify_notes=state.verify_notes or [],
            session_id=state.session_id,
        )

        # Update state with results
        state.tests_passed = result.get("tests_passed", state.tests_passed)
        state.changed_files = result.get("changed_files", state.changed_files)
        state.next_action = "stop"  # Reviewer is the final step

    except Exception as e:
        log.error(f"Reviewer workflow failed: {e}", exc_info=True)
        state.next_action = "stop"

        # Send error event
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Reviewer failed: {e}"},
            )
        )

    return state
