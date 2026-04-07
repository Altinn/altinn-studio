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

    # Determine status based on decision (not tests_passed, since soft warnings don't block)
    if decision == "commit":
        status = "✅ Successful — changes committed"
    elif decision == "no_changes":
        status = "ℹ️ No Changes Needed"
    elif decision == "revert":
        status = "⚠️ Changes reverted due to validation errors"
    else:
        status = "❓ Unknown"

    # Separate hard errors from soft warnings in verification notes
    hard_notes = [n for n in verify_notes if not n.startswith("[soft warning]")]
    soft_notes = [n.replace("[soft warning] ", "") for n in verify_notes if n.startswith("[soft warning]")]

    if decision == "no_changes":
        verification_status = "⏭️ Skipped (no changes to verify)"
        verification_notes = "No verification needed - no changes were made"
    else:
        has_hard_issues = any(
            word in " ".join(hard_notes).lower()
            for word in ["error", "failed", "duplicate"]
        ) if hard_notes else False
        verification_status = "⚠️ Minor issues found" if has_hard_issues else "✅ Passed"
        verification_notes = "\n".join(hard_notes) if hard_notes else "No issues found"
        if soft_notes:
            verification_notes += "\n\nSoft warnings (non-blocking):\n" + "\n".join(f"• {n}" for n in soft_notes[:5])
            if len(soft_notes) > 5:
                verification_notes += f"\n• ... and {len(soft_notes) - 5} more"

    if decision == "revert":
        prompt = f"""
You are the Altinity assistant. The user asked you to make changes, but the changes had to be reverted due to validation errors.

ORIGINAL REQUEST: {user_goal}

WHAT WAS ATTEMPTED: {plan_context}

FILES THAT WERE CHANGED (now reverted): {files_summary}

VALIDATION ERRORS THAT CAUSED THE REVERT:
{verification_notes}

REASONING: {reasoning}

Write a short, helpful response (under 150 words). Structure it as:
1. One sentence: what you tried to do.
2. The specific validation error(s) that blocked it — be concrete, quote the error.
3. A brief suggestion for how the user could rephrase their request or what to check.

CRITICAL RULES:
- Be direct and specific about the error. Do NOT restate the plan as a checklist.
- Do NOT list "changes made" when they were all reverted — that is misleading.
- Do NOT promise future action — you are a one-shot agent.
- Do NOT use headings like "Summary" or "Outcome" or "Changes made".
- Keep it conversational and concise.
- Respond in the same language as the user's goal.
"""
    else:
        prompt = f"""
You are the Altinity assistant summarizing the completed work for the user.

ORIGINAL REQUEST: {user_goal}

WHAT WAS IMPLEMENTED: {plan_context}

FILES CHANGED: {files_summary}

VERIFICATION STATUS: {verification_status}
VERIFICATION NOTES: {verification_notes}

FINAL DECISION: {status}
REASONING: {reasoning}

Write a short, natural update for the user (under 150 words).
Be professional but conversational — like giving a teammate a quick status update.

Focus on:
1. What was actually changed (be specific about file names and what was added/modified)
2. Whether verification passed
3. Any soft warnings worth noting

CRITICAL RULES:
- NEVER promise future action — you are a one-shot agent.
- NEVER say the work "failed" if the decision was "commit" — the changes were committed.
- If there are soft warnings, mention them briefly but make clear they did NOT block the commit.
- If decision is "no_changes", explain why no changes were needed.
- Be honest about what was done and what the result is.
- Respond in the same language as the user's goal.

Style: direct, short sentences or bullets. No headings like "Summary".
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
    sink.send(AgentEvent(
        type="status",
        session_id=state.session_id,
        data={"message": "Reviewing and finalizing changes..."},
    ))

    # Check if workflow should stop
    if state.next_action == "stop":
        log.info("⏹️ Workflow stopping at reviewer - generating summary")
        changed_files = state.changed_files or []
        # Still generate a summary even when stopping early
        try:
            summary = await generate_final_summary(
                user_goal=state.user_goal,
                step_plan=state.step_plan,
                changed_files=changed_files,
                tests_passed=state.tests_passed,
                verify_notes=state.verify_notes or [],
                decision="no_changes" if not state.changed_files else "revert",
                reasoning="Workflow stopped early — no changes were needed" if not state.changed_files else "Workflow stopped early due to an error",
                session_id=state.session_id,
            )
            
            # Append degraded warning if MCP went down during this request
            if state.mcp_degraded:
                summary += (
                    "\n\n⚠️ **Merk:** MCP-serveren mistet tilkoblingen under behandlingen. "
                    "Resultatet kan være ufullstendig — kontroller endringene og prøv igjen om noe ikke ser riktig ut."
                )
                log.info("⚠️ Appended MCP-degraded warning to early summary")

            sink.send(
                AgentEvent(
                    type="assistant_message",
                    session_id=state.session_id,
                    data={
                        "author": "assistant",
                        "content": summary,
                        "filesChanged": changed_files,
                    },
                )
            )
            # Store in conversation history for follow-up context
            sink.add_to_conversation_history(state.session_id, "assistant", summary)
            log.info("✅ Early summary sent and stored in conversation history")
        except Exception as e:
            log.error(f"Failed to generate early summary: {e}")

        # Send done event so the frontend stops loading
        sink.send(
            AgentEvent(
                type="done",
                session_id=state.session_id,
                data={
                    "success": not bool(changed_files),
                    "changed_files": changed_files,
                },
            )
        )
        
        return state

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

        # Append degraded warning if MCP went down during this request
        if state.mcp_degraded:
            summary += (
                "\n\n⚠️ **Merk:** MCP-serveren mistet tilkoblingen under behandlingen. "
                "Resultatet kan være ufullstendig — kontroller endringene og prøv igjen om noe ikke ser riktig ut."
            )
            log.info("⚠️ Appended MCP-degraded warning to assistant message")

        # Send single comprehensive message to frontend
        log.info(f"📤 Sending assistant_message for session {state.session_id}")
        sink.send(
            AgentEvent(
                type="assistant_message",
                session_id=state.session_id,
                data={
                    "author": "assistant",
                    "content": summary,
                    "filesChanged": changed_files,
                },
            )
        )
        
        # Store assistant response in conversation history for follow-up context
        sink.add_to_conversation_history(state.session_id, "assistant", summary)
        log.info("✅ Assistant message sent and stored in conversation history")
        
        # Send completion event to signal frontend that workflow is done
        sink.send(
            AgentEvent(
                type="done",
                session_id=state.session_id,
                data={
                    "success": state.tests_passed if state.tests_passed is not None else True,
                    "changed_files": changed_files,
                },
            )
        )
        log.info(f"✅ Workflow complete - sent done event")

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
                    "filesChanged": [],
                },
            )
        )
        
        # Send done event even on error so frontend stops loading
        sink.send(
            AgentEvent(
                type="done",
                session_id=state.session_id,
                data={
                    "success": False,
                    "error": str(e),
                },
            )
        )

    return state
