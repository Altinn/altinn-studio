"""LangGraph runner for agent workflow"""
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes.intake_node import handle as intake_node
from .nodes.intake_node import scan_repository as scan_node
from .nodes.spec_node import handle as spec_node
from .nodes.planning_tool_node import handle as planning_tool_node
from .nodes.planner_node import handle as planner_node
from .nodes.actor_node import handle as actor_node
from .nodes.verifier_node import handle as verifier_node
from .nodes.reviewer_node import handle as reviewer_node
from agents.services.events import AgentEvent, EventSink, sink
from shared.utils.logging_utils import get_logger
import asyncio
import json


_active_tasks: set = set()


class WorkflowCancelled(Exception):
    """Raised when a workflow is cancelled by the user."""
    pass


def _check_cancelled(state: AgentState):
    """Raise WorkflowCancelled if the session has been cancelled."""
    if sink.is_cancelled(state.session_id):
        raise WorkflowCancelled(f"Session {state.session_id} was cancelled")


def _with_cancellation(fn):
    """Wrap an async node handler to check for cancellation before execution."""
    async def wrapper(state: AgentState) -> AgentState:
        _check_cancelled(state)
        return await fn(state)
    wrapper.__name__ = fn.__name__
    return wrapper

log = get_logger(__name__)

def should_continue_after_intake(state: AgentState) -> str:
    """Route from intake to spec (if attachments) or scan"""
    if state.next_action == "stop":
        return "stop"
    if state.attachments:
        return "spec"
    return "scan"

def should_continue_after_spec(state: AgentState) -> str:
    """Route from spec to scan or stop"""
    if state.next_action == "stop":
        return "stop"
    return "scan"

def should_continue_after_scan(state: AgentState) -> str:
    """Route from scan to planning_tool or stop"""
    import logging
    log = logging.getLogger(__name__)
    log.info(f"🔀 Routing after scan: next_action={state.next_action}, has_repo_facts={bool(state.repo_facts)}")
    
    # CRITICAL: Ignore next_action value - ALWAYS route to planning_tool after scan
    # The next_action="plan" is legacy behavior, we want to go through planning_tool first
    if state.next_action == "stop":
        log.info("🛑 Routing to STOP due to error")
        return "stop"
    
    log.info("➡️ Routing to planning_tool (forced route from scan)")
    return "planning_tool"

def should_continue_after_planning_tool(state: AgentState) -> str:
    """Route from planning_tool to planner or stop"""
    if state.next_action == "stop":
        return "stop"
    return "planner"

def should_continue_to_verifier(state: AgentState) -> str:
    """Decide whether to continue to verifier or stop"""
    if state.next_action == "stop":
        return "stop"
    return "verifier"

def should_continue_to_reviewer(state: AgentState) -> str:
    """Decide whether to continue to reviewer or stop"""
    if state.next_action == "stop":
        return "stop"
    return "reviewer"

def build_graph():
    """Build the LangGraph workflow: intake → repo_scan → planning_tool → general_planning → execution"""
    g = StateGraph(AgentState)
    
    # Add all nodes (wrapped with cancellation checks)
    g.add_node("intake", _with_cancellation(intake_node))
    g.add_node("spec", _with_cancellation(spec_node))
    g.add_node("scan", _with_cancellation(scan_node))
    g.add_node("planning_tool", _with_cancellation(planning_tool_node))
    g.add_node("planner", _with_cancellation(planner_node))
    g.add_node("actor", _with_cancellation(actor_node))
    g.add_node("verifier", _with_cancellation(verifier_node))
    g.add_node("reviewer", _with_cancellation(reviewer_node))
    
    # Set entry point
    g.set_entry_point("intake")
    
    # Define workflow: intake → [spec] → scan → planning_tool → planner → actor → verifier → reviewer
    g.add_conditional_edges("intake", should_continue_after_intake, {"spec": "spec", "scan": "scan", "stop": END})
    g.add_conditional_edges("spec", should_continue_after_spec, {"scan": "scan", "stop": END})
    g.add_conditional_edges("scan", should_continue_after_scan, {"planning_tool": "planning_tool", "stop": END})
    g.add_conditional_edges("planning_tool", should_continue_after_planning_tool, {"planner": "planner", "stop": END})
    g.add_edge("planner", "actor")
    
    # Conditional edges based on next_action
    g.add_conditional_edges("actor", should_continue_to_verifier, {"verifier": "verifier", "stop": END})
    g.add_conditional_edges("verifier", should_continue_to_reviewer, {"reviewer": "reviewer", "stop": END})
    g.add_edge("reviewer", END)
    
    return g.compile()

graph = build_graph()

from langfuse import get_client, propagate_attributes
from shared.utils.langfuse_utils import init_langfuse, is_langfuse_enabled, get_langfuse_client
from agents.services.llm import parse_intent_async, suggest_goal_correction

import logging as _logging
_log = _logging.getLogger(__name__)

MINIMUM_INTENT_CONFIDENCE = 0.1


class GoalRejected(Exception):
    """Raised when the intent parser rejects the user's goal."""
    pass


async def _validate_intent(state: AgentState):
    """Parse intent and reject unsafe or unclear goals."""
    parsed = await parse_intent_async(state.user_goal, attachments=state.attachments)

    if not parsed.safe:
        _log.warning("Unsafe goal rejected for session %s: %s", state.session_id, parsed.reason)
        suggestions = suggest_goal_correction(state.user_goal)
        raise GoalRejected(
            f"Goal rejected: {parsed.reason}|{','.join(suggestions) if suggestions else ''}"
        )

    if parsed.confidence < MINIMUM_INTENT_CONFIDENCE:
        _log.warning("Low confidence goal rejected for session %s: %s", state.session_id, parsed.confidence)
        suggestions = suggest_goal_correction(state.user_goal)
        raise GoalRejected(
            f"Goal is too unclear or ambiguous|{','.join(suggestions) if suggestions else ''}"
        )

    _log.info(
        "Parsed intent for session %s: action=%s, component=%s, confidence=%s",
        state.session_id, parsed.action, parsed.component, parsed.confidence,
    )

async def _evaluate_intent_match(user_goal: str, final_state: dict, trace_id: str) -> None:
    try:
        from agents.services.evaluation.intent_judge import run_intent_judge
        step_plan = final_state.get("step_plan") or []
        await run_intent_judge(
            user_goal=user_goal,
            agent_plan=step_plan[0] if isinstance(step_plan, list) and step_plan else None,
            trace_id=trace_id,
        )
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("Evaluation pipeline error (intent_match)")


async def _evaluate_no_hallucination(user_goal: str, final_state: dict, trace_id: str) -> None:
    try:
        from agents.services.evaluation.hallucination_judge import run_hallucination_judge
        step_plan = final_state.get("step_plan") or []
        implementation_plan = final_state.get("implementation_plan")
        response_parts = []
        if isinstance(step_plan, list) and step_plan:
            response_parts.append("\n".join(str(step) for step in step_plan))
        if implementation_plan:
            response_parts.append(
                json.dumps(implementation_plan, ensure_ascii=False)
                if isinstance(implementation_plan, (dict, list))
                else str(implementation_plan)
            )
        agent_response = "\n\n".join(response_parts)
        sources = str(final_state.get("planning_guidance") or "")
        await run_hallucination_judge(
            user_goal=user_goal,
            agent_response=agent_response,
            sources=sources,
            trace_id=trace_id,
        )
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("Evaluation pipeline error (no_hallucination)")


async def run_once(state: AgentState, event_sink: EventSink = None):
    """Run one complete workflow loop with unified tracing"""
    if event_sink is None:
        event_sink = sink

    # Initialize Langfuse
    init_langfuse()
    langfuse = get_client() if is_langfuse_enabled() else None

    # Use start_as_current_observation as the root - this creates a trace and sets context
    # so all nested observations will be children of this root
    if langfuse:
        with langfuse.start_as_current_observation(
            as_type="span",
            name="Altinity Agent Workflow",
            input={
                "user_goal": str(state.user_goal)[:500],
                "repo_path": str(state.repo_path),
                "session_id": str(state.session_id)
            },
            metadata={
                "span_type": "AGENT",
                "full_goal_length": len(str(state.user_goal)),
                "session_id": str(state.session_id),
                "developer": state.developer,
            },
        ) as root_span:
            with propagate_attributes(user_id=state.org):
                try:
                    await _validate_intent(state)

                    current_graph = build_graph()
                    final_state = await current_graph.ainvoke(state)

                    root_span.update(output={
                        "success": bool(final_state.get("tests_passed", False)),
                        "changed_files": len(final_state.get("changed_files", [])),
                        "next_action": str(final_state.get("next_action", ""))
                    })

                    # LLM-as-a-judge evaluations — run after workflow, failures must not affect the main flow
                    for coro in (
                        _evaluate_intent_match(state.user_goal, final_state, root_span.trace_id),
                        _evaluate_no_hallucination(state.user_goal, final_state, root_span.trace_id),
                    ):
                        task = asyncio.create_task(coro)
                        _active_tasks.add(task)
                        task.add_done_callback(_active_tasks.discard)

                except Exception as e:
                    root_span.update(
                        output={"error": str(e)},
                        metadata={"error": str(e)}
                    )
                    raise
    else:
        await _validate_intent(state)
        current_graph = build_graph()
        final_state = await current_graph.ainvoke(state)

    # Check if cancelled during execution
    if event_sink.is_cancelled(state.session_id):
        raise WorkflowCancelled(f"Session {state.session_id} was cancelled")

    # Send completion event
    success = final_state.get("tests_passed", False)
    notes = final_state.get("verify_notes") or []
    if not isinstance(notes, list):
        notes = [str(notes)]
    if success:
        message = "Task completed successfully"
    else:
        if notes:
            message = "Task failed: " + "; ".join(str(n) for n in notes)
        else:
            message = "Task completed with issues"
    event_sink.send(AgentEvent(
        type="status",
        session_id=final_state.get("session_id", state.session_id),
        data={
            "done": True, 
            "success": success,
            "status": "completed" if success else "failed",
            "message": message
        }
    ))

    return final_state


def run_in_background(state: AgentState, event_sink: EventSink = None):
    """Start workflow in background task"""
    import logging
    log = logging.getLogger(__name__)
    
    if event_sink is None:
        event_sink = sink

    async def _run():
        try:
            await run_once(state, event_sink)
        except WorkflowCancelled:
            log.info(f"🛑 Workflow cancelled for session {state.session_id}")
        except GoalRejected as e:
            msg = str(e)
            parts = msg.split("|", 1)
            reason = parts[0]
            suggestions = parts[1].split(",") if len(parts) > 1 and parts[1] else []
            event_sink.send(AgentEvent(
                type="error",
                session_id=state.session_id,
                data={
                    "done": True,
                    "success": False,
                    "status": "rejected",
                    "message": reason,
                    "suggestions": suggestions,
                }
            ))
        except Exception as e:
            if event_sink.is_cancelled(state.session_id):
                log.info(f"🛑 Workflow error after cancellation for session {state.session_id}: {e}")
                return
            log.error(f"Workflow failed with exception: {e}", exc_info=True)
            event_sink.send(AgentEvent(
                type="error",
                session_id=state.session_id,
                data={
                    "done": True,
                    "success": False,
                    "status": "error",
                    "message": f"Workflow failed: {e!s}"
                }
            ))

    # Create background task
    task = asyncio.create_task(_run())
    return task

