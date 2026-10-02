"""Intake node implementation using the intake workflow pipeline."""

from __future__ import annotations

from typing import Any

from agents.graph.state import AgentState
from agents.services.events import AgentEvent, sink
from agents.workflows.intake.pipeline import run_intake_pipeline


def _intake_failure_hint(exc: BaseException) -> str:
    """Derive a short, actionable hint from an intake-pipeline exception.

    Surfaces the most common operator-fixable causes (missing/wrong Azure
    deployment, auth) without exposing internals.  Falls back to a generic
    message when the cause is unclear.
    """
    msg = str(exc)
    if "DeploymentNotFound" in msg or "does not exist" in msg:
        return (
            "The configured LLM deployment was not found on Azure AI Foundry. "
            "Check LLM_MODEL_PLANNER vs the deployments provisioned in your "
            "Foundry workspace."
        )
    if "401" in msg or "Unauthorized" in msg or "invalid_api_key" in msg:
        return "LLM auth failed — check AZURE_API_KEY."
    if "timeout" in msg.lower() or "timed out" in msg.lower():
        return "LLM call timed out — the upstream may be overloaded; retry shortly."
    return "Intake failed before producing a plan. See server logs for the underlying error."


async def handle(state: AgentState) -> AgentState:
    """Generate an initial plan and repository context."""

    import time

    from shared.utils.logging_utils import get_logger

    log = get_logger(__name__)
    log.info(f"⏱️ [INTAKE NODE] Starting at {time.time()}")

    # The intake pipeline runs an LLM call to generate the initial plan.
    # That's the first multi-second blocking step the user waits on, so
    # emit a status right away — otherwise the UI sits silent until the
    # `plan_proposed` event lands.
    sink.send(
        AgentEvent(
            type="status",
            session_id=state.session_id,
            data={"message": "Analyserer forespørselen…", "phase": "thinking"},
        )
    )

    try:
        result: dict[str, Any] = run_intake_pipeline(
            state.repo_path,
            state.user_goal,
            attachments=state.attachments,
            conversation_history=state.conversation_history,
        )

        state.step_plan = [result["plan"]]

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
        error_type = type(exc).__name__
        log.error(f"Intake failed ({error_type}): {exc}", exc_info=True)
        hint = _intake_failure_hint(exc)
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={
                    "message": "Klarte ikke å analysere forespørselen.",
                    "step": "intake",
                    "node": "intake",
                    "error_type": error_type,
                    "hint": hint,
                },
            )
        )
        state.tests_passed = False
        state.verify_notes = (state.verify_notes or []) + [hint]
        state.next_action = "stop"

    return state
