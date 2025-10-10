"""Verifier node implementation using the verifier workflow pipeline."""

from __future__ import annotations

from typing import Dict, Any

from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Handle the verifier node execution.

    Args:
        state: Current agent state

    Returns:
        Updated agent state
    """
    log.info("🔍 Verifier node executing")

    try:
        if not state.changed_files:
            raise ValueError("No files were changed")

        # Use MCP verification instead of the old verify.run_checks
        from agents.services.mcp.mcp_verification import MCPVerifier
        
        verifier = MCPVerifier(state.repo_path)
        patch = {
            "changes": [{"file": f, "op": "modify"} for f in state.changed_files]
        }
        
        result = await verifier.verify_with_tools(patch, {})
        
        state.tests_passed = result.passed
        state.verify_notes = [str(error) for error in result.errors] if result.errors else ["All validations passed"]
        state.next_action = "review"

        
    except Exception as exc:
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Verifier failed: {exc}"},
            )
        )
        state.next_action = "stop"

    return state
