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


async def generate_final_summary(
    user_goal: str,
    step_plan: Optional[List[str]],
    changed_files: List[str],
    tests_passed: bool,
    verify_notes: List[str],
    decision: str,
    reasoning: str,
    session_id: str,
) -> str:
    """Generate a comprehensive summary of all changes made using the reviewer LLM."""

    from agents.services.llm import LLMClient

    client = LLMClient(role="reviewer")

    # Get all the context from the workflow
    plan_context = step_plan[0] if step_plan else "No plan"
    files_summary = "\n".join(f"• {file}" for file in changed_files) if changed_files else "No files changed"
    status = "✅ Successful" if decision == "commit" and tests_passed else "❌ Failed/Reverted"

    verification_notes = "\n".join(verify_notes) if verify_notes else "No issues found"

    prompt = f"""
You are the Altinity assistant summarizing the completed work for the user.

ORIGINAL REQUEST: {user_goal}

WHAT WAS IMPLEMENTED: {plan_context}

FILES CHANGED: {files_summary}

VERIFICATION STATUS: {"✅ Passed" if tests_passed else "❌ Failed"}
VERIFICATION NOTES: {verification_notes}

FINAL DECISION: {status}
REASONING: {reasoning}

Write a clear, concise summary for the user explaining what was accomplished. Focus on:
1. What the user asked for
2. What was actually implemented/changed
3. The outcome (success/failure)
4. Any important details about the changes

Keep it professional, helpful, and under 200 words. Use markdown formatting if helpful.
"""

    try:
        summary = await client.call_async(
            system_prompt="You are a helpful AI assistant summarizing technical work completed for users.",
            user_prompt=prompt
        )
        return summary.strip()
    except Exception as e:
        log.error(f"Failed to generate summary: {e}")
        # Fallback summary
        return f"""## Task Complete

I attempted to implement: **{user_goal}**

**Status:** {status}
**Files changed:** {len(changed_files)}
**Decision:** {decision.capitalize()}

{reasoning}"""


async def handle(state: AgentState) -> AgentState:
    """Handle the reviewer node execution.

    Args:
        state: Current agent state

    Returns:
        Updated agent state
    """
    log.info("👨‍⚖️ Reviewer node executing - starting workflow")
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

        # Generate comprehensive summary
        changed_files = state.changed_files or []
        log.info(f"📋 Final changed files for summary: {changed_files}")
        summary = await generate_final_summary(
            user_goal=state.user_goal,
            step_plan=state.step_plan,
            changed_files=changed_files,
            tests_passed=state.tests_passed,
            verify_notes=state.verify_notes or [],
            decision=result.get("decision", "unknown"),
            reasoning=result.get("reasoning", "No reasoning provided"),
            session_id=state.session_id,
        )

        # Send single comprehensive message to frontend
        log.info(f"📤 Sending assistant_message for session {state.session_id}")
        sink.send(
            AgentEvent(
                type="assistant_message",
                session_id=state.session_id,
                data={
                    "author": "assistant",
                    "content": summary,
                    "timestamp": state.session_start_time.isoformat() if hasattr(state, 'session_start_time') else None,
                    "filesChanged": changed_files,
                },
            )
        )
        log.info(f"✅ Assistant message sent successfully")

    except Exception as e:
        log.error(f"Reviewer workflow failed: {e}", exc_info=True)
        state.next_action = "stop"

        # Send error message in new format
        log.error(f"❌ Sending error assistant_message for session {state.session_id}: {str(e)}")
        sink.send(
            AgentEvent(
                type="assistant_message",
                session_id=state.session_id,
                data={
                    "author": "assistant",
                    "content": f"## Error\n\nAn error occurred during processing: {str(e)}",
                    "timestamp": state.session_start_time.isoformat() if hasattr(state, 'session_start_time') else None,
                    "filesChanged": [],
                },
            )
        )

    return state
