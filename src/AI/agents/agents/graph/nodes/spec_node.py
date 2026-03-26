"""Spec extraction node — parses attachments into a structured FormSpec."""

from __future__ import annotations

import contextvars
import time
from agents.graph.state import AgentState
from agents.services.events import AgentEvent, sink
from agents.workflows.spec.pipeline import run_spec_pipeline
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Extract a FormSpec from attachments if present."""
    log.info(f"⏱️ [SPEC NODE] Starting at {time.time()}")

    if not state.attachments:
        log.info("⏭️ No attachments — skipping spec extraction")
        state.next_action = "scan"
        return state

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
            log.info(
                f"✅ FormSpec stored: \"{form_spec.title}\" — "
                f"{form_spec.total_pages} pages, {form_spec.field_count()} fields"
            )
            sink.send(
                AgentEvent(
                    type="status",
                    session_id=state.session_id,
                    data={
                        "message": f"Extracted form spec: {form_spec.field_count()} fields across {form_spec.total_pages} pages",
                        "spec_title": form_spec.title,
                        "spec_pages": form_spec.total_pages,
                        "spec_fields": form_spec.field_count(),
                    },
                )
            )
        else:
            log.warning("⚠️ Spec extraction returned None — continuing without spec")

        state.next_action = "scan"

    except Exception as exc:
        log.error(f"Spec extraction failed: {exc}", exc_info=True)
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Spec extraction failed: {exc}"},
            )
        )
        # Non-fatal: continue without spec
        state.next_action = "scan"

    return state
