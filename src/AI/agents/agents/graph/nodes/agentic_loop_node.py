"""Agentic-loop graph node — runs the model-driven loop end-to-end.

Replaces the planning_tool → planner → actor → verifier → reviewer
chain.  All of those concerns become tools the model can invoke in
whatever order it chooses.

The node:
    1.  Assembles a `SessionContext` from `AgentState` and renders the
        immutable system prompt.
    2.  Builds a `ToolRegistry` populated with the in-process tools
        (`scan_repo`, `propose_patch`, `verify_changes`,
        `commit_session_branch`, `rollback`) plus the in-process Altinn
        tools.
    3.  Bridges loop events to the existing `EventSink` so the
        frontend keeps seeing status messages; wires
        `sink.is_cancelled(session_id)` as the cancel signal.
    4.  Runs `run_loop` against the configured LLM adapter (role
        `actor`).
    5.  Reflects the outcome onto `AgentState`'s legacy fields so
        downstream code (run_once's success/failure emit, evaluators)
        keeps working unchanged.

This node serves BOTH modes: `state.allow_app_changes` gates the write
tools (read-only "chat" runs can still scan/read the repo, load skills,
and fetch docs), and prior session turns are prepended as conversation
history so follow-ups keep their context across modes.
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
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

# Tool names whose invocation produces a user-meaningful progress
# update.  Everything else (read_file, lookups, scan_repo) is
# silent — the model's own narration carries the context better than
# "Calling altinn_layout_props…" ever could.
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

# Human-readable labels for the Altinn schema tools.  Without these the
# UI would show the raw tool name (e.g., "altinn_layout_props"), which
# means nothing to end users.
_ALTINN_TOOL_LABELS = {
    "altinn_layout_props": "Slår opp komponent",
    "altinn_datamodel_sync": "Synkroniserer datamodell",
}


def _status_for_tool_call(name: str, tool_input: dict[str, Any] | None) -> str | None:
    """Build a user-facing status string for a tool_call event.

    Returns None when the tool shouldn't surface.  Format is
    "<verb phrase> <subject>" — e.g. "Leser App/ui/Side1.json",
    "Slår opp komponent: Input".  No technical tool names in the
    output; those map through _ALTINN_TOOL_LABELS for the altinn_ family.
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


# What we show while the model is generating a tool_use block but the
# input JSON hasn't fully streamed yet.  Path/args aren't available — we
# only know the tool name from the `content_block_start` event.  These
# are placeholders the call-time message replaces in-place (matched by
# tool_use_id on the frontend), so keep them short and generic.
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
    """Placeholder shown the moment a tool_use block starts streaming.

    Replaced by the call-time message as soon as the input JSON is
    complete and the dispatcher fires the tool.  Same vocabulary as
    `_status_for_tool_call` so the swap feels like the same entry just
    gaining detail.
    """
    base = _TOOL_PENDING_MESSAGES.get(name)
    if base:
        return base
    if name.startswith("altinn_"):
        return _ALTINN_TOOL_LABELS.get(name, "Slår opp dokumentasjon")
    # Unknown tool: show nothing rather than the raw tool name — "skill"
    # or "web_fetch" as a trail row means nothing to end users.
    return None


# Phase labels surfaced to the frontend so it can highlight the active
# pill in the activity row.  Kept short and stable — the frontend renders
# its own user-facing strings; these are just identifiers.
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
    "altinn_datamodel_sync": _PHASE_WRITING,  # generates + writes files
    "verify_changes": _PHASE_VERIFYING,
    "commit_session_branch": _PHASE_COMMITTING,
}


def _phase_for_tool(name: str) -> str:
    """Map a tool name to the activity phase the UI highlights.

    Unknown tools land in `thinking` so the UI still has something to
    show.
    """
    return _TOOL_PHASES.get(name, _PHASE_THINKING)

# Cap on turns inside a single workflow run.  20 comfortably covers a
# scan → read → edit → verify → commit sequence with room for retries;
# can be raised via env var without code changes if a session needs more.
_DEFAULT_MAX_TURNS = int(os.getenv("AGENTIC_LOOP_MAX_TURNS", "40"))


# Bound the history prepended to the loop: enough for the model to keep
# the thread, small enough not to crowd out the actual task.  Long
# individual messages (pasted logs, full summaries) are truncated.
_HISTORY_MAX_MESSAGES = 12
_HISTORY_MAX_CHARS_PER_MESSAGE = 6000


def _history_messages(state: AgentState) -> list:
    """Prior session turns as loop messages, oldest first.

    The shared per-session history contains both chat and workflow turns,
    so a follow-up like "what did you just change?" has the earlier
    exchanges available regardless of which mode produced them.
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
    """Drive one workflow run via the agentic loop."""
    log.info("🤖 Agentic loop node executing")
    # No initial status — the frontend's journal renders its own
    # placeholder while we wait for the first streaming event.  An
    # explicit "Tenker…" here would land as a real step in the journal
    # with a misleading duration.

    session = SessionContext(
        session_id=state.session_id,
        repo_path=state.repo_path,
        user_goal=state.user_goal,
        allow_app_changes=state.allow_app_changes,
        form_spec_summary=state.form_spec.to_summary() if state.form_spec else None,
        developer=state.developer,
        org=state.org,
        repo_facts=state.repo_facts,  # may be None — model can call scan_repo
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
        # In read-only sessions a write attempt asks the user for
        # permission (inline prompt in the chat) instead of a flat denial.
        permission_requester=(
            None
            if state.allow_app_changes
            else lambda action: permission_broker.request(state.session_id, action)
        ),
    )

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
    _emit_workflow_completion(state, result, ctx)
    return state


async def _maybe_auto_commit(
    state: AgentState,
    result: LoopResult,
    ctx: LoopContext,
) -> None:
    """Force a commit when the loop ends with uncommitted changes.

    Without this, a `max_turns` or `stuck` termination drops all the
    partial progress on the floor — the files are on disk in the
    agents container but nobody else sees them.  We commit them to the
    session branch with a generic message so the user can at least
    inspect and decide.

    Skipped when:
        - The model already called `commit_session_branch` successfully
          (ctx.extras["session_committed"] is True).
        - There were no tracked changes.
        - The loop ended on CANCELLED (user pulled the plug).
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
    """Best-effort commit subject for the safety-net path."""
    goal = (state.user_goal or "").strip().splitlines()[0][:60] if state.user_goal else "agent changes"
    prefix = {
        TerminationReason.COMPLETED: "feat",
        TerminationReason.MAX_TURNS: "wip",
        TerminationReason.STUCK: "wip",
        TerminationReason.ERROR: "wip",
    }.get(result.reason, "wip")
    return f"{prefix}: {goal}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _augment_goal_for_missing_spec(state: AgentState) -> str:
    """Prepend a warning when the user attached a file but spec extraction
    failed to produce one.

    Without this, the loop sees only the bare goal text ("build the
    attached form") with no field list — the model has no concrete
    content to act on, so it answers conversationally and the loop
    exits with zero changes.  The note tells the model explicitly that
    it must stop and ask the user for the field list rather than
    inventing one.
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
    """Register every tool available in workflow mode.

    The node is workflow-only, so write tools are always present.
    Everything runs in-process — no network dependency beyond the
    (cached) schema fetches inside the Altinn tools.
    """
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
        SkillTool(skills),
        LayoutPropsTool(),
        DatamodelSyncTool(),
        WebFetchTool(),
    ]


def _make_event_bridge(session_id: str) -> EventCallback:
    """Translate loop events into AgentEvent payloads for the frontend.

    The Designer frontend reads `data.content`/`data.filesChanged` and
    silently ignores `data.text`, so `assistant_message` events must
    carry `{author, content, filesChanged}`, NOT `{text}`.

    Per-turn assistant messages are emitted *as the model goes*, with an
    empty `filesChanged` list; the final summary message (with the real
    file list) and the workflow-end `done` event are emitted by
    `_emit_workflow_completion`, not from here.

    Other events (turn_start, tool_result, compacted) are log-only — the
    UI doesn't need them.
    """

    # Throttle text deltas so each Anthropic micro-chunk isn't a separate
    # WebSocket frame.  ~10 updates/second feels like real typing and keeps
    # network/frontend churn bounded.  The accumulated text is always sent
    # — never the raw single-token delta — so the UI can replace its bubble
    # contents wholesale and remain consistent if intermediate chunks drop.
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
        """Push a status event with phase + tool-use bookkeeping.

        `tool_use_id` is the model's id for a single tool_use block, so
        the frontend can match the call back to its pending placeholder
        and replace one entry in-place rather than rendering both.
        `pending` marks the placeholder so the dedupe is asymmetric: a
        non-pending status replaces a previous pending one with the same
        id; the reverse never happens.
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
            # New turn → flush any leftover accumulator from the previous
            # turn so the UI doesn't keep stale tail text.
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
            # The model has stopped emitting text and is now generating a
            # tool_use block.  No further text deltas will arrive for this
            # turn — flush what we have and announce the upcoming tool so
            # the UI keeps moving while the input JSON streams in.  We
            # tag with `pending=True` and the tool's id so the call event
            # can replace this placeholder rather than appending a second
            # row.
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
            # A tool call signals the model finished the tool_use block.
            # Same tool_use_id as the pending event from above, so the
            # frontend can collapse them into a single entry that just
            # updates its message.
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
            # Streaming has already shipped this turn's text to the UI
            # via `assistant_message_chunk` events.  We still flush any
            # pending tail (the last <100ms of throttled deltas) so the
            # bubble shows the complete narration before the next status
            # message overlays it.  The terminal turn is handled by
            # `_emit_workflow_completion`, never here.
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


def _emit_workflow_completion(state: AgentState, result: LoopResult, ctx: LoopContext) -> None:
    """Emit the events the Designer frontend uses to close out a session.

    The frontend expects two events at the end of a workflow: a final
    `assistant_message` carrying the model's summary + the `filesChanged`
    list, and a `done` event it reads as "workflow is over, you can
    navigate to the diff now".

    Without these two, the frontend renders empty bubbles and never
    triggers its post-workflow logic (e.g. checkout the session branch).
    """
    summary = _final_summary_text(result)
    message_data = {
        "author": "assistant",
        "content": summary,
        "filesChanged": state.changed_files,
        # Knowledge sources the loop actually consulted (docs pages,
        # skills, schema lookups) — collected from tool executions, not
        # self-reported by the model.
        "sources": ctx.extras.get("sources", []),
    }
    if not state.allow_app_changes:
        # Read-only run: the frontend must not reset the repo or check out
        # a session branch — nothing was (or could have been) committed.
        message_data["no_branch_operations"] = True
    sink.send(
        AgentEvent(
            type="assistant_message",
            session_id=state.session_id,
            data=message_data,
        )
    )
    # Also store in conversation history so follow-up turns have context;
    # without it the chat assistant loses the thread between workflow runs.
    try:
        sink.add_to_conversation_history(state.session_id, "assistant", summary)
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


def _strip_sources_line(text: str) -> str:
    """Drop a trailing `SOURCES: ...` line if the model appended one.

    Sources are attached structurally from the tool trace; a text
    SOURCES line is a leftover habit from the old prompt convention and
    would render as raw text in the chat.
    """
    return _SOURCES_LINE_RE.sub("", text)


def _final_summary_text(result: LoopResult) -> str:
    """User-facing summary chosen by termination reason.

    On COMPLETED we use the model's own final text — that's what it
    chose to say.  For the other reasons the model never produced a
    final text (the loop bailed mid-flight), so we fall back to a
    Norwegian explanation rather than "Workflow completed." which
    misleadingly implied success.
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
    """Reflect the loop's outcome onto AgentState's legacy fields.

    `next_action = "stop"` regardless of reason — the new graph has no
    more nodes downstream, so the routing functions don't matter.  The
    legacy fields kept in sync:

        tests_passed   — True iff the model completed normally.
        verify_notes   — populated only on ERROR or MAX_TURNS, so the
                          completion message in run_once is informative.
        changed_files  — taken from ctx.extras, populated by
                          propose_patch / cleared by rollback.
        assistant_response — final text from the model, surfaced for
                          downstream Q&A consumers and Langfuse.
    """
    state.next_action = "stop"

    # A mid-run permission grant upgrades the session to write mode —
    # reflect it so auto-commit and the completion events (branch
    # checkout on the frontend) treat the run as a change run.
    state.allow_app_changes = ctx.allow_app_changes

    changed = ctx.extras.get("changed_files") or set()
    state.changed_files = sorted(changed)

    if result.final_text:
        state.assistant_response = {
            "text": result.final_text,
            # Consulted knowledge sources — surfaced in the trace output so
            # the Langfuse no_hallucination evaluator can compare the answer
            # against what was actually read.
            "sources": ctx.extras.get("sources", []),
            # Actual commit hash (None if nothing was committed) — evidence
            # for the faithful_summary evaluator when the summary names one.
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
    else:  # ERROR
        state.tests_passed = False
        state.verify_notes = [f"Loop error: {result.error or 'unknown'}"]
