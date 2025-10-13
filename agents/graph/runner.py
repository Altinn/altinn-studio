"""LangGraph runner for agent workflow"""
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes.intake_node import handle as intake_node
from .nodes.planner_node import handle as planner_node
from .nodes.actor_node import handle as actor_node
from .nodes.verifier_node import handle as verifier_node
from .nodes.reviewer_node import handle as reviewer_node
from agents.services.events import AgentEvent, EventSink, sink
import asyncio

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
    """Build the LangGraph workflow with LLM-powered nodes"""
    g = StateGraph(AgentState)
    g.add_node("intake", intake_node)
    g.add_node("planner", planner_node)
    g.add_node("actor", actor_node)
    g.add_node("verifier", verifier_node)
    g.add_node("reviewer", reviewer_node)
    g.set_entry_point("intake")
    g.add_edge("intake", "planner")
    g.add_edge("planner", "actor")
    
    # Conditional edges based on next_action
    g.add_conditional_edges("actor", should_continue_to_verifier, {"verifier": "verifier", "stop": END})
    g.add_conditional_edges("verifier", should_continue_to_reviewer, {"reviewer": "reviewer", "stop": END})
    g.add_edge("reviewer", END)
    
    return g.compile()

graph = build_graph()

import mlflow
from shared.utils.mlflow_utils import get_or_create_experiment

async def run_once(state: AgentState, event_sink: EventSink = None):
    """Run one complete workflow loop with unified tracing"""
    if event_sink is None:
        event_sink = sink

    # Set up MLflow experiment
    experiment_name = get_or_create_experiment()
    if experiment_name:
        mlflow.set_experiment(experiment_name)

    # Create single root trace for entire workflow
    with mlflow.start_span(name="altinity_agent_workflow", span_type="AGENT") as root_span:
        try:
            root_span.set_inputs({
                "user_goal": str(state.user_goal),
                "repo_path": str(state.repo_path),
                "session_id": str(state.session_id)
            })
        except Exception as e:
            print(f"MLflow root span input error: {e}")

        try:
            # Rebuild graph to ensure latest changes are used
            current_graph = build_graph()
            # Run the graph workflow asynchronously - all nested operations will be under this trace
            final_state = await current_graph.ainvoke(state)
            
            try:
                root_span.set_outputs({
                    "success": bool(final_state.get("tests_passed", False)),
                    "changed_files": len(final_state.get("changed_files", [])),
                    "next_action": str(final_state.get("next_action", ""))
                })
            except Exception as e:
                print(f"MLflow root span output error: {e}")
                
        except Exception as e:
            try:
                root_span.set_attribute("error", str(e))
            except:
                pass
            raise

        # Send completion event
        success = final_state.get("tests_passed", False)
        event_sink.send(AgentEvent(
            type="status",
            session_id=final_state.get("session_id", state.session_id),
            data={
                "done": True, 
                "success": success,
                "status": "completed" if success else "failed",
                "message": "Task completed successfully" if success else "Task completed with issues"
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