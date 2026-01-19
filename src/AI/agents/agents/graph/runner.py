"""LangGraph runner for agent workflow"""
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes.intake_node import handle as intake_node
from .nodes.intake_node import scan_repository as scan_node
from .nodes.planning_tool_node import handle as planning_tool_node
from .nodes.planner_node import handle as planner_node
from .nodes.actor_node import handle as actor_node
from .nodes.verifier_node import handle as verifier_node
from .nodes.reviewer_node import handle as reviewer_node
from agents.services.events import AgentEvent, EventSink, sink
import asyncio

def should_continue_after_intake(state: AgentState) -> str:
    """Route from intake to scan or stop"""
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
    
    # Add all nodes
    g.add_node("intake", intake_node)
    g.add_node("scan", scan_node)
    g.add_node("planning_tool", planning_tool_node)
    g.add_node("planner", planner_node)
    g.add_node("actor", actor_node)
    g.add_node("verifier", verifier_node)
    g.add_node("reviewer", reviewer_node)
    
    # Set entry point
    g.set_entry_point("intake")
    
    # Define workflow: intake → scan → planning_tool → planner → actor → verifier → reviewer
    g.add_conditional_edges("intake", should_continue_after_intake, {"scan": "scan", "stop": END})
    g.add_conditional_edges("scan", should_continue_after_scan, {"planning_tool": "planning_tool", "stop": END})
    g.add_conditional_edges("planning_tool", should_continue_after_planning_tool, {"planner": "planner", "stop": END})
    g.add_edge("planner", "actor")
    
    # Conditional edges based on next_action
    g.add_conditional_edges("actor", should_continue_to_verifier, {"verifier": "verifier", "stop": END})
    g.add_conditional_edges("verifier", should_continue_to_reviewer, {"reviewer": "reviewer", "stop": END})
    g.add_edge("reviewer", END)
    
    return g.compile()

graph = build_graph()

from langfuse import get_client
from shared.utils.langfuse_utils import init_langfuse, is_langfuse_enabled

async def run_once(state: AgentState, event_sink: EventSink = None):
    """Run one complete workflow loop with unified tracing"""
    if event_sink is None:
        event_sink = sink

    # Initialize Langfuse
    init_langfuse()
    langfuse = get_client() if is_langfuse_enabled() else None

    # Create single root trace for entire workflow
    if langfuse:
        with langfuse.start_as_current_span(
            name="altinity_agent_workflow",
            metadata={"span_type": "AGENT"},
            input={
                "user_goal": str(state.user_goal),
                "repo_path": str(state.repo_path),
                "session_id": str(state.session_id)
            }
        ) as root_span:
            try:
                # Rebuild graph to ensure latest changes are used
                current_graph = build_graph()
                # Run the graph workflow asynchronously - all nested operations will be under this trace
                final_state = await current_graph.ainvoke(state)
                
                root_span.update(output={
                    "success": bool(final_state.get("tests_passed", False)),
                    "changed_files": len(final_state.get("changed_files", [])),
                    "next_action": str(final_state.get("next_action", ""))
                })
                    
            except Exception as e:
                root_span.update(metadata={"error": str(e)})
                raise
    else:
        # Run without tracing if Langfuse is disabled
        current_graph = build_graph()
        final_state = await current_graph.ainvoke(state)

    # Send completion event
    success = final_state.get("tests_passed", False)
    completion_message = final_state.get("completion_message")

    # Determine status and message
    if completion_message:
        # Use custom completion message if set (e.g., "no changes")
        status = "no_changes"
        message = completion_message
    elif success:
        status = "completed"
        message = "Task completed successfully"
    else:
        notes = final_state.get("verify_notes") or []
        if not isinstance(notes, list):
            notes = [str(notes)]
        if notes:
            message = "Task failed: " + "; ".join(str(n) for n in notes)
        else:
            message = "Task completed with issues"
        status = "failed"

    event_sink.send(AgentEvent(
        type="status",
        session_id=final_state.get("session_id", state.session_id),
        data={
            "done": True,
            "success": success,
            "status": status,
            "message": message
        }
    ))

    return final_state


def run_in_background(state: AgentState, event_sink: EventSink = None):
    """Start workflow in background task"""
    if event_sink is None:
        event_sink = sink

    async def _run():
        await run_once(state, event_sink)

    # Create background task
    task = asyncio.create_task(_run())
    return task