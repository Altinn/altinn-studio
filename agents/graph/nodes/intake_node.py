"""Intake node implementation using the intake workflow pipeline."""

from __future__ import annotations

from typing import Any, Dict

from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from agents.workflows.intake.pipeline import run_intake_pipeline


async def handle(state: AgentState) -> AgentState:
    """Generate an initial plan and repository context."""
    
    import time
    from shared.utils.logging_utils import get_logger
    log = get_logger(__name__)
    log.info(f"⏱️ [INTAKE NODE] Starting at {time.time()}")

    try:
        result: Dict[str, Any] = run_intake_pipeline(
            state.repo_path,
            state.user_goal,
            attachments=state.attachments,
        )

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


async def scan_repository(state: AgentState) -> AgentState:
    """Scan repository to gather facts if not already available."""
    
    import time
    from shared.utils.logging_utils import get_logger
    log = get_logger(__name__)
    log.info(f"⏱️ [SCAN NODE] Starting at {time.time()}")

    try:
        # Use the same scanning logic as the MCP client for consistency
        from agents.services.mcp import get_mcp_client
        from agents.services.repo import discover_repository_context
        
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
                type="status",
                session_id=state.session_id,
                data={
                    "message": "Repository scan complete",
                    "file_count": len(facts.get("layouts", [])) + len(facts.get("models", [])) + len(facts.get("resources", [])),
                    "directory_count": existing_dirs,  # Actually count existing Altinn directories
                },
            )
        )
        
        from shared.utils.logging_utils import get_logger
        log = get_logger(__name__)
        log.info(f"✅ Scan complete, returning state with next_action={state.next_action}")

    except Exception as exc:
        from shared.utils.logging_utils import get_logger
        log = get_logger(__name__)
        log.error(f"❌ Scan failed: {exc}", exc_info=True)
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Repository scanning failed: {exc}"},
            )
        )
        state.next_action = "stop"

    return state
