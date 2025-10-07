"""Intake node implementation using the intake workflow pipeline."""

from __future__ import annotations

from typing import Any, Dict

from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from agents.workflows.intake.pipeline import run_intake_pipeline


async def handle(state: AgentState) -> AgentState:
    """Generate an initial plan and repository context."""

    try:
        result: Dict[str, Any] = run_intake_pipeline(state.repo_path, state.user_goal)

        state.step_plan = [result["plan"]]
        # Don't set repo_facts here - let scan node handle it
        # state.repo_facts = result.get("facts")

        context = result.get("context")
        if context is not None:
            state.general_plan = {
                "layout_pages": context.layout_pages,
                "model_files": context.model_files,
                "resource_files": context.resource_files,
                "available_locales": context.available_locales,
                "source_of_truth": context.source_of_truth,
            }

        sink.send(
            AgentEvent(
                type="plan_proposed",
                session_id=state.session_id,
                data={"plan": state.step_plan[0], "step": state.step_plan[0]},
            )
        )

        state.next_action = "scan"

    except Exception as exc:
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Intake failed: {exc}"},
            )
        )
        state.next_action = "stop"

    return state


def scan_repository(state: AgentState) -> AgentState:
    """Scan repository to gather facts if not already available."""

    try:
        # Use the same scanning logic as the MCP client for consistency
        import asyncio
        from agents.services.mcp import get_mcp_client
        from agents.services.repo import discover_repository_context
        
        async def _scan():
            mcp_client = get_mcp_client()
            context = discover_repository_context(state.repo_path)
            # Convert PlanContext to dict format for compatibility
            facts = {
                'layouts': context.layout_pages,
                'models': context.model_files,
                'resources': context.resource_files,
                'app_type': 'altinn',
                'available_locales': context.available_locales,
                'source_of_truth': context.source_of_truth
            }
            return facts
        
        facts = asyncio.run(_scan())
        state.repo_facts = facts
        state.next_action = "plan"

        # Count actual directories that exist
        from pathlib import Path
        repo_path = Path(state.repo_path)
        existing_dirs = sum(1 for dir_path in [
            repo_path / "App" / "ui" / "form" / "layouts",
            repo_path / "App" / "models", 
            repo_path / "App" / "config" / "texts"
        ] if dir_path.exists())

        sink.send(
            AgentEvent(
                type="repository_scanned",
                session_id=state.session_id,
                data={
                    "file_count": len(facts.get("layouts", [])) + len(facts.get("models", [])) + len(facts.get("resources", [])),
                    "directory_count": existing_dirs,  # Actually count existing Altinn directories
                },
            )
        )

    except Exception as exc:
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Repository scanning failed: {exc}"},
            )
        )
        state.next_action = "stop"

    return state
