"""Planner node implementation leveraging MCP client for detailed plan creation."""

from __future__ import annotations

import mlflow
from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Create a detailed plan using repository facts and MCP tooling."""

    log.info("🎯 Planner node executing")
    try:
        from agents.services.mcp import get_mcp_client

        client = get_mcp_client()

        with mlflow.start_span(name="detailed_planning_phase") as planning_span:
            planning_span.set_attributes({
                "implementation_plan_length": len(state.implementation_plan) if state.implementation_plan else 0,
                "repo_facts_count": len(state.repo_facts.get("files", [])) if state.repo_facts else 0,
            })
            planning_span.set_inputs({
                "implementation_plan": state.implementation_plan,
                "repo_facts_summary": {
                    "file_count": len(state.repo_facts.get("files", [])) if state.repo_facts else 0,
                    "directory_count": len(state.repo_facts.get("directories", [])) if state.repo_facts else 0,
                }
                if state.repo_facts
                else None,
            })

            patch_data = await client.create_patch_async(
                task_context=f"{state.user_goal}\n\nHIGH-LEVEL PLAN:\n{state.step_plan}",
                repository_path=state.repo_path,
            )

            log.info(f"📋 Planner created patch_data with {len(patch_data.get('changes', []))} changes")
            state.patch_data = patch_data
            
            # Extract tool_results from workflow data if available
            workflow_data = patch_data.get("workflow")
            if workflow_data and isinstance(workflow_data, dict):
                if "tool_results" in workflow_data:
                    state.tool_results = workflow_data["tool_results"]
                    log.info(f"📊 Extracted {len(state.tool_results)} tool results from workflow")
                if "tool_plan" in workflow_data:
                    state.tool_plan = workflow_data["tool_plan"]
                if "implementation_plan" in workflow_data:
                    state.implementation_plan = workflow_data["implementation_plan"]
            
            state.next_action = "act"

            sink.send(
                AgentEvent(
                    type="plan_proposed",
                    session_id=state.session_id,
                    data={
                        "summary": patch_data.get("summary", "No summary available"),
                        "files": patch_data.get("files", []),
                    },
                )
            )

    except Exception as exc:
        log.error(f"Planner node failed: {exc}", exc_info=True)
        state.next_action = "stop"
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Planning failed: {exc}"},
            )
        )

    return state
