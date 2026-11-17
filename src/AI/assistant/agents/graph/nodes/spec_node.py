"""Spec extraction node — parses attachments into a structured FormSpec."""

from __future__ import annotations

import contextvars

from agents.graph.state import AgentState
from agents.services.events import AgentEvent, sink
from agents.workflows.spec.pipeline import run_spec_pipeline
from shared.telemetry import ERROR_TYPE, error_type
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def _spec_status(form_spec) -> str:
    pages = form_spec.total_pages
    return f"Hentet ut feltliste: {form_spec.field_count()} felt på {pages} {'side' if pages == 1 else 'sider'}"


async def handle(state: AgentState) -> AgentState:
    """Extract a FormSpec from attachments if present."""
    if not state.attachments:
        state.next_action = "scan"
        return state

    # Spec extraction is a single 20-90s blocking LLM call against the
    # attached file(s).  Without an explicit status the UI sits on the
    # last-known message for the whole duration and looks frozen.
    attachment_count = len(state.attachments)
    pre_status = (
        "Leser vedlegg og henter ut feltlister…"
        if attachment_count == 1
        else f"Leser {attachment_count} vedlegg og henter ut feltlister…"
    )
    sink.send(
        AgentEvent(
            type="status",
            session_id=state.session_id,
            data={"message": pre_status, "phase": "reading"},
        )
    )

    try:
        import asyncio

        loop = asyncio.get_running_loop()
        ctx = contextvars.copy_context()
        form_spec = await loop.run_in_executor(
            None,
            lambda: ctx.run(
                run_spec_pipeline,
                user_goal=state.user_goal,
                attachments=state.attachments,
            ),
        )

        if form_spec:
            state.form_spec = form_spec
            sink.send(
                AgentEvent(
                    type="status",
                    session_id=state.session_id,
                    data={
                        "message": _spec_status(form_spec),
                        "spec_title": form_spec.title,
                        "spec_pages": form_spec.total_pages,
                        "spec_fields": form_spec.field_count(),
                    },
                )
            )
        else:
            log.warning("The spec extraction returned nothing, so the run continues without a spec")

        state.next_action = "scan"

    except Exception as exc:
        log.warning(
            "The spec extraction failed, so the run continues without a spec", extra={ERROR_TYPE: error_type(exc)}
        )
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": "Klarte ikke å hente ut feltlisten fra vedlegget."},
            )
        )
        # Non-fatal: continue without spec
        state.next_action = "scan"

    return state
