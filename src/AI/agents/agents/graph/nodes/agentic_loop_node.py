"""Agentic-loop graph node: builds the prompt and tool registry, runs the loop,
bridges its events to the EventSink, and reflects the outcome onto AgentState.

`state.allow_app_changes` gates the write tools, so a read-only run can still
scan, read, load skills and fetch docs.
"""

from __future__ import annotations

import os
import re
import time
from typing import Any

from agents.core import (
    CommitSessionBranchTool,
    DatamodelSyncTool,
    DiscardFileChangesTool,
    EditFileTool,
    EventCallback,
    AssistantMessage,
    LayoutPropsTool,
    LoopContext,
    LoopResult,
    PreviewRenderCheckTool,
    ReadFileTool,
    ScanRepoTool,
    SessionContext,
    SkillTool,
    TerminationReason,
    TextBlock,
    Tool,
    ToolRegistry,
    UserMessage,
    VerifyChangesTool,
    WebFetchTool,
    WriteFileTool,
    build_adapter,
    build_system_prompt,
    discover_skills,
    format_skill_listing,
    run_loop,
)
from agents.graph.state import AgentState
from agents.services.events import AgentEvent, permission_broker, sink
from shared.utils.langfuse_utils import get_current_trace_id
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

_TOOL_STATUS_MESSAGES = {
    "scan_repo": "Skanner repo",
    "read_file": "Leser",
    "edit_file": "Endrer",
    "write_file": "Skriver",
    "discard_file_changes": "Tilbakestiller",
    "verify_changes": "Validerer endringer",
    "commit_session_branch": "Lagrer endringer",
    "skill": "Henter kunnskap om",
    "web_fetch": "Leser dokumentasjon",
}

_ALTINN_TOOL_LABELS = {
    "altinn_layout_props": "Slår opp komponent",
    "altinn_datamodel_sync": "Synkroniserer datamodell",
}


def _status_for_tool_call(name: str, tool_input: dict[str, Any] | None) -> str | None:
    """User-facing status for a tool_call, or None when the tool should not surface.

    Reads as "<verb> <subject>" with no technical tool names.
    """
    base = _TOOL_STATUS_MESSAGES.get(name)
    args = tool_input or {}
    if base:
        subject = args.get("path") or args.get("skill")
        if isinstance(subject, str) and subject:
            return f"{base} {subject}"
        return base
    if name.startswith("altinn_"):
        label = _ALTINN_TOOL_LABELS.get(name, "Slår opp dokumentasjon")
        subject = args.get("component_type") or args.get("schema_path")
        if isinstance(subject, str) and subject:
            return f"{label}: {subject}"
        return label
    return None


_TOOL_PENDING_MESSAGES = {
    "scan_repo": "Skanner repo",
    "read_file": "Leser fil",
    "edit_file": "Endrer fil",
    "write_file": "Skriver fil",
    "discard_file_changes": "Tilbakestiller fil",
    "verify_changes": "Validerer endringer",
    "commit_session_branch": "Lagrer endringer",
    "skill": "Henter kunnskap",
    "web_fetch": "Leser dokumentasjon",
}


def _status_for_tool_pending(name: str) -> str | None:
    """Placeholder shown while a tool_use block is still streaming, replaced by the
    call-time message once the input JSON completes.
    """
    base = _TOOL_PENDING_MESSAGES.get(name)
    if base:
        return base
    if name.startswith("altinn_"):
        return _ALTINN_TOOL_LABELS.get(name, "Slår opp dokumentasjon")
    return None


_PHASE_READING = "reading"
_PHASE_WRITING = "writing"
_PHASE_VERIFYING = "verifying"
_PHASE_COMMITTING = "committing"
_PHASE_THINKING = "thinking"

_TOOL_PHASES: dict[str, str] = {
    "scan_repo": _PHASE_READING,
    "read_file": _PHASE_READING,
    "skill": _PHASE_READING,
    "web_fetch": _PHASE_READING,
    "altinn_layout_props": _PHASE_READING,
    "edit_file": _PHASE_WRITING,
    "write_file": _PHASE_WRITING,
    "discard_file_changes": _PHASE_WRITING,
    "altinn_datamodel_sync": _PHASE_WRITING,
    "verify_changes": _PHASE_VERIFYING,
    "commit_session_branch": _PHASE_COMMITTING,
}


def _phase_for_tool(name: str) -> str:
    return _TOOL_PHASES.get(name, _PHASE_THINKING)

_DEFAULT_MAX_TURNS = int(os.getenv("AGENTIC_LOOP_MAX_TURNS", "40"))


_HISTORY_MAX_MESSAGES = 12
_HISTORY_MAX_CHARS_PER_MESSAGE = 6000


def _history_messages(state: AgentState) -> list:
    """Prior session turns as loop messages, oldest first.

    Chat and workflow turns share one history, so "what did you just change?"
    works whichever mode produced the earlier exchange.
    """
    messages: list = []
    for entry in state.conversation_history[-_HISTORY_MAX_MESSAGES:]:
        content = (entry.content or "").strip()
        if not content:
            continue
        if len(content) > _HISTORY_MAX_CHARS_PER_MESSAGE:
            content = content[:_HISTORY_MAX_CHARS_PER_MESSAGE] + "\n…[truncated]"
        if entry.role == "assistant":
            messages.append(AssistantMessage(content=[TextBlock(text=content)]))
        else:
            messages.append(UserMessage(content=content))
    return messages


async def handle(state: AgentState) -> AgentState:
    log.info("🤖 Agentic loop node executing")

    session = SessionContext(
        session_id=state.session_id,
        repo_path=state.repo_path,
        user_goal=state.user_goal,
        allow_app_changes=state.allow_app_changes,
        form_spec_summary=state.form_spec.to_summary() if state.form_spec else None,
        developer=state.developer,
        org=state.org,
        repo_facts=state.repo_facts,
    )
    skills = discover_skills()
    system_prompt = build_system_prompt(
        session, skill_listing=format_skill_listing(skills)
    )

    registry = _build_registry(skills)
    log.info(
        "🧰 Loop registry has %d tools: %s",
        len(registry),
        ", ".join(registry.names()),
    )

    ctx = LoopContext(
        session_id=state.session_id,
        repo_path=state.repo_path,
        allow_app_changes=state.allow_app_changes,
        developer=state.developer,
        org=state.org,
        designer_api_key=state.designer_api_key,
        permission_requester=(
            None
            if state.allow_app_changes
            else lambda action: permission_broker.request(state.session_id, action)
        ),
    )
    ctx.extras["app_name"] = state.app_name

    adapter = build_adapter("actor")
    on_event = _make_event_bridge(state.session_id)

    user_message = _augment_goal_for_missing_spec(state)

    result = await run_loop(
        user_message=user_message,
        system_prompt=system_prompt,
        registry=registry,
        adapter=adapter,
        ctx=ctx,
        max_turns=_DEFAULT_MAX_TURNS,
        is_cancelled=lambda: sink.is_cancelled(state.session_id),
        on_event=on_event,
        history=_history_messages(state),
    )

    _apply_result_to_state(state, result, ctx)
    if state.allow_app_changes:
        await _maybe_auto_commit(state, result, ctx)
        result = await _repair_render_failures(
            state,
            result,
            ctx,
            registry=registry,
            adapter=adapter,
            system_prompt=system_prompt,
            on_event=on_event,
        )
    if result.reason is TerminationReason.CANCELLED:
        return state
    _emit_workflow_completion(state, result, ctx)
    return state


MAX_RENDER_REPAIR_ROUNDS = 1


async def _repair_render_failures(
    state: AgentState,
    result: LoopResult,
    ctx: LoopContext,
    *,
    registry,
    adapter,
    system_prompt: str,
    on_event,
) -> LoopResult:
    """Render-check the committed app and send failures back to the model.

    The prompt asks the model to run the check, but a skipped one looks exactly
    like a clean one. Bounded by MAX_RENDER_REPAIR_ROUNDS.
    """
    if result.reason is TerminationReason.CANCELLED:
        return result

    check = PreviewRenderCheckTool()
    args = check.input_schema.model_validate({})
    for attempt in range(MAX_RENDER_REPAIR_ROUNDS + 1):
        if not ctx.extras.get("session_committed"):
            return result
        try:
            outcome = await check.run(args, ctx)
        except Exception:
            log.exception("Render check raised for session %s", state.session_id)
            return result
        if outcome.metadata.get("unavailable") or not outcome.is_error:
            return result
        if sink.is_cancelled(state.session_id):
            return result
        if attempt == MAX_RENDER_REPAIR_ROUNDS:
            log.warning(
                "Render check still failing for session %s after %s repair round(s)",
                state.session_id,
                MAX_RENDER_REPAIR_ROUNDS,
            )
            state.tests_passed = False
            state.verify_notes = [
                f"A page still fails to render after {MAX_RENDER_REPAIR_ROUNDS} repair round(s)."
            ]
            return result

        log.info("Render check failed for session %s; asking the model to fix", state.session_id)
        ctx.extras["session_committed"] = False
        result = await run_loop(
            user_message=outcome.content,
            system_prompt=system_prompt,
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            max_turns=_DEFAULT_MAX_TURNS,
            is_cancelled=lambda: sink.is_cancelled(state.session_id),
            on_event=on_event,
            history=_history_messages(state),
        )
        _apply_result_to_state(state, result, ctx)
        await _maybe_auto_commit(state, result, ctx)
    return result


async def _maybe_auto_commit(
    state: AgentState,
    result: LoopResult,
    ctx: LoopContext,
) -> None:
    """Commit uncommitted changes left behind by a max_turns or stuck exit, so
    partial progress is inspectable instead of stranded in the container.

    Skipped when the model already committed, nothing changed, or the run was
    cancelled.
    """
    if result.reason is TerminationReason.CANCELLED:
        return
    if ctx.extras.get("session_committed"):
        return
    if not state.changed_files:
        return

    commit_tool = CommitSessionBranchTool()
    msg = _auto_commit_message(state, result)
    args = commit_tool.input_schema.model_validate({"message": msg})
    try:
        outcome = await commit_tool.run(args, ctx)
    except Exception:
        log.exception("Auto-commit raised for session %s", state.session_id)
        return
    if outcome.is_error:
        log.warning(
            "Auto-commit declined for session %s: %s",
            state.session_id,
            outcome.content,
        )
        return
    log.info(
        "Auto-committed partial work for session %s (reason=%s)",
        state.session_id,
        result.reason.value,
    )


def _auto_commit_message(state: AgentState, result: LoopResult) -> str:
    goal = (state.user_goal or "").strip().splitlines()[0][:60] if state.user_goal else "agent changes"
    prefix = {
        TerminationReason.COMPLETED: "feat",
        TerminationReason.MAX_TURNS: "wip",
        TerminationReason.STUCK: "wip",
        TerminationReason.ERROR: "wip",
    }.get(result.reason, "wip")
    return f"{prefix}: {goal}"



def _augment_goal_for_missing_spec(state: AgentState) -> str:
    """Warn the model when an attachment produced no spec, so it asks for the field
    list instead of answering conversationally and changing nothing.
    """
    goal = state.user_goal or ""
    if state.form_spec is not None or not state.attachments:
        return goal
    log.warning(
        "Loop starting without a form_spec despite %d attachment(s); "
        "asking the model to stop and request the field list.",
        len(state.attachments),
    )
    notice = (
        "⚠️ Spec extraction did not produce a form spec for the attached "
        "file(s).  You do NOT have the field list.  Do not invent fields "
        "or guess what the document contains.  Send a final message "
        "asking the user to either re-attach the document or provide the "
        "fields directly.  Then stop."
    )
    return f"{notice}\n\n---\n\n{goal}"


def _build_registry(skills: list | None = None) -> ToolRegistry:
    """Register every tool available in workflow mode, all in-process."""
    registry = ToolRegistry()
    for tool in _internal_tools(skills or []):
        registry.register(tool)
    return registry


def _internal_tools(skills: list) -> list[Tool]:
    return [
        ScanRepoTool(),
        ReadFileTool(),
        EditFileTool(),
        WriteFileTool(),
        DiscardFileChangesTool(),
        VerifyChangesTool(),
        CommitSessionBranchTool(),
        PreviewRenderCheckTool(),
        SkillTool(skills),
        LayoutPropsTool(),
        DatamodelSyncTool(),
        WebFetchTool(),
    ]


def _make_event_bridge(session_id: str) -> EventCallback:
    """Translate loop events into AgentEvent payloads for the frontend.

    The frontend reads `data.content`/`data.filesChanged` and ignores
    `data.text`. Per-turn messages go out as the model streams; the final
    summary and `done` come from `_emit_workflow_completion`.
    """

    _MIN_DELTA_INTERVAL_S = 0.10
    delta_state: dict[str, Any] = {
        "last_emit": 0.0,
        "pending_text": "",
        "turn": 0,
        "phase": _PHASE_THINKING,
    }

    def _flush_pending_delta() -> None:
        text = delta_state["pending_text"]
        if not text:
            return
        sink.send(
            AgentEvent(
                type="assistant_message_chunk",
                session_id=session_id,
                data={
                    "text": text,
                    "turn": delta_state["turn"],
                    "phase": delta_state["phase"],
                },
            )
        )
        delta_state["last_emit"] = time.monotonic()

    def _send_phase_status(
        message: str,
        phase: str,
        *,
        tool_use_id: str | None = None,
        pending: bool = False,
    ) -> None:
        """Push a status event with phase and tool-use bookkeeping.

    `tool_use_id` lets the frontend replace a pending placeholder in place
    rather than rendering both. The dedupe is asymmetric: a non-pending status
    replaces a pending one, never the reverse.
    """
        delta_state["phase"] = phase
        data: dict[str, Any] = {"message": message, "phase": phase}
        if tool_use_id:
            data["tool_use_id"] = tool_use_id
        if pending:
            data["pending"] = True
        sink.send(
            AgentEvent(
                type="status",
                session_id=session_id,
                data=data,
            )
        )

    def on_event(event: str, payload: dict[str, Any]) -> None:
        if event == "text_delta":
            turn = payload.get("turn", 0)
            if turn != delta_state["turn"]:
                delta_state["turn"] = turn
                delta_state["pending_text"] = ""
            delta_state["pending_text"] = payload.get("accumulated") or ""
            delta_state["phase"] = _PHASE_THINKING
            now = time.monotonic()
            if now - delta_state["last_emit"] >= _MIN_DELTA_INTERVAL_S:
                _flush_pending_delta()
            return
        if event == "tool_use_pending":
            _flush_pending_delta()
            delta_state["pending_text"] = ""
            name = payload.get("name") or ""
            tool_use_id = payload.get("tool_use_id") or ""
            msg = _status_for_tool_pending(name)
            if msg:
                _send_phase_status(
                    msg,
                    _phase_for_tool(name),
                    tool_use_id=tool_use_id,
                    pending=True,
                )
            return
        if event == "tool_call":
            _flush_pending_delta()
            delta_state["pending_text"] = ""
            name = payload.get("name", "")
            tool_use_id = payload.get("id") or ""
            msg = _status_for_tool_call(name, payload.get("input"))
            if msg:
                _send_phase_status(
                    msg,
                    _phase_for_tool(name),
                    tool_use_id=tool_use_id,
                )
        elif event == "assistant_message":
            _flush_pending_delta()
            delta_state["pending_text"] = ""
        elif event == "terminated":
            _flush_pending_delta()
            log.info(
                "🛑 Loop terminated for session %s: reason=%s",
                session_id,
                payload.get("reason"),
            )
        elif event == "compacted":
            log.info(
                "📦 Loop compacted history for session %s: %d → %d",
                session_id,
                payload.get("from", 0),
                payload.get("to", 0),
            )

    return on_event


def _turn_carried_attachment_content(state: AgentState) -> bool:
    """Whether anything the user supplied could have carried an instruction."""
    return bool(state.attachments) or state.form_spec is not None


def _emit_workflow_completion(state: AgentState, result: LoopResult, ctx: LoopContext) -> None:
    """Emit the final `assistant_message` and `done` the frontend needs to close
    out a session; without both it renders empty bubbles and never runs its
    post-workflow logic, such as checking out the session branch.
    """
    summary, security_notice = _extract_security_notice(_final_summary_text(result))
    message_data = {
        "author": "assistant",
        "content": summary,
        "filesChanged": state.changed_files,
        "sources": ctx.extras.get("sources", []),
    }
    if security_notice:
        log.warning(
            "Prompt injection reported by the model for session %s: %s",
            state.session_id,
            security_notice,
        )
        # The alert tells the user a document they uploaded carried the
        # instruction, so it must not fire when there was no document.
        if _turn_carried_attachment_content(state):
            # Only the flag crosses into Designer; attacker-influenced prose is
            # never rendered to the user.
            message_data["attachmentInstructionFlagged"] = True
        else:
            log.warning(
                "Ignoring the report for session %s: the turn had no attachment content",
                state.session_id,
            )
    if not state.allow_app_changes:
        message_data["no_branch_operations"] = True
    trace_id = state.trace_id or get_current_trace_id()
    if trace_id:
        message_data["traceId"] = trace_id
    sink.send(
        AgentEvent(
            type="assistant_message",
            session_id=state.session_id,
            data=message_data,
        )
    )
    try:
        # A fixed marker, never the notice itself: replaying attacker text as
        # assistant history would reintroduce it undelimited on the next turn.
        history_text = (
            f"{summary}\n\n[{SECURITY_NOTICE_HISTORY_MARKER}]" if security_notice else summary
        )
        sink.add_to_conversation_history(state.session_id, "assistant", history_text)
    except Exception:
        log.exception("Failed to store assistant message in conversation history")

    sink.send(
        AgentEvent(
            type="done",
            session_id=state.session_id,
            data={
                "success": bool(state.tests_passed),
                "changed_files": state.changed_files,
            },
        )
    )


_SOURCES_LINE_RE = re.compile(r"\n+SOURCES:[^\n]*\s*$", re.IGNORECASE)

_SECURITY_NOTICE_RE = re.compile(
    r"^[ \t]*(?:[*_`>\-]*\s*)?SECURITY_NOTICE[*_`]*\s*:\s*(.+?)[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)

MAX_SECURITY_NOTICE_LENGTH = 500
SECURITY_NOTICE_HISTORY_MARKER = (
    "Et vedlegg forsøkte å gi instruksjoner til assistenten. Instruksjonene ble ikke fulgt."
)


def _extract_security_notice(text: str) -> tuple[str, str | None]:
    """Split a SECURITY_NOTICE line off the summary; it renders as an alert.

    Only the first is kept: repeats are more likely quoted from the document
    than a second report.
    """
    matches = _SECURITY_NOTICE_RE.findall(text)
    if not matches:
        return text, None
    notice = " ".join(matches[0].split())[:MAX_SECURITY_NOTICE_LENGTH]
    cleaned = _SECURITY_NOTICE_RE.sub("", text)
    return cleaned.strip(), notice or None


def _strip_sources_line(text: str) -> str:
    """Drop a trailing `SOURCES:` line: sources are attached structurally from the
    tool trace, so the model's text version would render as raw chat text.
    """
    return _SOURCES_LINE_RE.sub("", text)


def _final_summary_text(result: LoopResult) -> str:
    """User-facing summary chosen by termination reason.

    Only COMPLETED has the model's own final text; the others bailed mid-flight
    and fall back to a Norwegian explanation rather than implying success.
    """
    if result.reason is TerminationReason.COMPLETED:
        return _strip_sources_line(result.final_text or "Ferdig.").strip()
    if result.reason is TerminationReason.MAX_TURNS:
        return (
            f"Jeg fikk ikke fullført oppgaven innenfor {result.turns} steg.  "
            "Eventuelle endringer som ble gjort, er commitet til sesjons-grenen.  "
            "Prøv å bryte ned forespørselen i mindre deler — for eksempel én "
            "endring av gangen — eller del mer kontekst om hva som skal endres."
        )
    if result.reason is TerminationReason.STUCK:
        return (
            "Jeg sto fast og gjorde det samme om og om igjen.  Eventuelle "
            "endringer som ble gjort er commitet til sesjons-grenen.  "
            "Prøv å formulere forespørselen tydeligere, eller del den opp i "
            "mindre konkrete steg."
        )
    if result.reason is TerminationReason.CANCELLED:
        return "Forespørselen ble avbrutt."
    if result.reason is TerminationReason.ERROR:
        return f"Det oppstod en feil under behandlingen: {result.error or 'ukjent årsak'}."
    return "Ferdig."


def _apply_result_to_state(
    state: AgentState,
    result: LoopResult,
    ctx: LoopContext,
) -> None:
    state.next_action = "stop"

    state.allow_app_changes = ctx.allow_app_changes

    changed = ctx.extras.get("changed_files") or set()
    state.changed_files = sorted(changed)

    if result.final_text:
        state.assistant_response = {
            "text": result.final_text,
            "sources": ctx.extras.get("sources", []),
            "commit": ctx.extras.get("commit"),
        }

    if result.reason is TerminationReason.COMPLETED:
        state.tests_passed = True
        state.verify_notes = []
    elif result.reason is TerminationReason.MAX_TURNS:
        state.tests_passed = False
        state.verify_notes = [
            f"Loop hit max_turns ({_DEFAULT_MAX_TURNS}) without completing."
        ]
    elif result.reason is TerminationReason.STUCK:
        state.tests_passed = False
        state.verify_notes = [
            f"Loop terminated for repeating itself: {result.error or 'see logs'}"
        ]
    elif result.reason is TerminationReason.CANCELLED:
        state.tests_passed = False
        state.verify_notes = ["Workflow cancelled."]
    else:
        state.tests_passed = False
        state.verify_notes = [f"Loop error: {result.error or 'unknown'}"]
