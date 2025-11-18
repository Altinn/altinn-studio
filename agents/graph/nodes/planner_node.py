"""Planner node implementation leveraging MCP client for detailed plan creation."""

from __future__ import annotations

import mlflow
from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Create a detailed plan using repository facts, planning guidance, and MCP tooling."""
    
    import time
    log.info(f"⏱️ [PLANNER NODE] Starting at {time.time()}")
    log.info("🎯 Planner node executing")
    log.info(f"📥 Planner received state.planning_guidance: {'SET (%d chars)' % len(state.planning_guidance) if state.planning_guidance else 'NOT SET (None or empty)'}")
    try:
        from agents.services.mcp import get_mcp_client

        client = get_mcp_client()

        with mlflow.start_span(name="detailed_planning_phase") as planning_span:
            planning_span.set_attributes({
                "implementation_plan_length": len(state.implementation_plan) if state.implementation_plan else 0,
                "repo_facts_count": len(state.repo_facts.get("files", [])) if state.repo_facts else 0,
                "has_planning_guidance": bool(state.planning_guidance),
                "has_attachments": bool(state.attachments),
                "attachment_count": len(state.attachments) if state.attachments else 0,
            })
            planning_span.set_inputs({
                "implementation_plan": state.implementation_plan,
                "planning_guidance_length": len(state.planning_guidance) if state.planning_guidance else 0,
                "repo_facts_summary": {
                    "file_count": len(state.repo_facts.get("files", [])) if state.repo_facts else 0,
                    "directory_count": len(state.repo_facts.get("directories", [])) if state.repo_facts else 0,
                }
                if state.repo_facts
                else None,
            })

            # Build task context with planning guidance if available
            task_context = f"{state.user_goal}\n\nHIGH-LEVEL PLAN:\n{state.step_plan}"
            if state.planning_guidance:
                log.info(f"✅ Planner using planning guidance from planning_tool_node ({len(state.planning_guidance)} chars)")
                task_context += f"\n\nPLANNING GUIDANCE:\n{state.planning_guidance}"
            else:
                log.info("⚠️ No planning guidance in state - MCP client will call planning_tool")

            if state.attachments:
                log.info(f"📎 Planner passing {len(state.attachments)} attachment(s) to patch generation")
            
            patch_data = await client.create_patch_async(
                task_context=task_context,
                repository_path=state.repo_path,
                attachments=state.attachments,
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
