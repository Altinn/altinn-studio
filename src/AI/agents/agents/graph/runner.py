"""LangGraph runner for agent workflow"""
import asyncio

from langgraph.graph import StateGraph, END
from opentelemetry import trace as otel_trace

from .state import AgentState
from .nodes.agentic_loop_node import handle as agentic_loop_node
from .nodes.intake_node import handle as intake_node
from .nodes.spec_node import handle as spec_node
from agents.services.events import AgentEvent, EventSink, sink
from shared.utils.logging_utils import get_logger


class WorkflowCancelled(Exception):
    """Raised when a workflow is cancelled by the user."""
    pass


def _check_cancelled(state: AgentState):
    """Raise WorkflowCancelled if the session has been cancelled."""
    if sink.is_cancelled(state.session_id):
        raise WorkflowCancelled(f"Session {state.session_id} was cancelled")


def _raise_if_cancelled(state: AgentState, event_sink: EventSink) -> None:
    if event_sink.is_cancelled(state.session_id):
        raise WorkflowCancelled(f"Session {state.session_id} was cancelled")


def _with_cancellation(fn):
    """Wrap an async node handler to check for cancellation before execution."""
    async def wrapper(state: AgentState) -> AgentState:
        _check_cancelled(state)
        return await fn(state)
    wrapper.__name__ = fn.__name__
    return wrapper

log = get_logger(__name__)


def _route_entry(state: AgentState) -> str:
    """Read-only runs skip intake: no change-plan to propose or validate.

    They still get spec extraction when attachments are present — a
    question about an uploaded PDF needs the extracted content just as
    much as a change request does.
    """
    if state.allow_app_changes:
        return "intake"
    if state.attachments:
        return "spec"
    return "agentic_loop"


def _route_after_intake(state: AgentState) -> str:
    """intake → spec (if attachments) → agentic_loop, or stop on error."""
    if state.next_action == "stop":
        return "stop"
    if state.attachments:
        return "spec"
    return "agentic_loop"


def _route_after_spec(state: AgentState) -> str:
    if state.next_action == "stop":
        return "stop"
    return "agentic_loop"


def build_graph():
    """Build the workflow graph: intake → [spec] → agentic_loop → END.

    Repo scan, planning, code generation, verification, and review all
    collapse into tools the model can invoke from inside the agentic
    loop. The intake and spec nodes still run up front to validate the
    request and extract any attached FormSpec.
    """
    g = StateGraph(AgentState)

    g.add_node("intake", _with_cancellation(intake_node))
    g.add_node("spec", _with_cancellation(spec_node))
    g.add_node("agentic_loop", _with_cancellation(agentic_loop_node))

    g.set_conditional_entry_point(
        _route_entry,
        {"intake": "intake", "spec": "spec", "agentic_loop": "agentic_loop"},
    )

    g.add_conditional_edges(
        "intake",
        _route_after_intake,
        {"spec": "spec", "agentic_loop": "agentic_loop", "stop": END},
    )
    g.add_conditional_edges(
        "spec",
        _route_after_spec,
        {"agentic_loop": "agentic_loop", "stop": END},
    )
    g.add_edge("agentic_loop", END)

    return g.compile()


graph = build_graph()

from langfuse import get_client, propagate_attributes
from shared.utils.langfuse_utils import (
    init_langfuse,
    is_langfuse_enabled,
    get_langfuse_client,
    get_current_trace_id,
    flush_langfuse,
)
from agents.services.llm import (
    MINIMUM_INTENT_CONFIDENCE,
    parse_intent_async,
    suggest_goal_correction,
    check_scope_async,
)

import logging as _logging
_log = _logging.getLogger(__name__)

_FALLBACK_DECLINE_MESSAGE = "Jeg kan bare hjelpe med utvikling av Altinn-apper."
_UNSAFE_GOAL_MESSAGE = (
    "Jeg kan dessverre ikke utføre denne forespørselen, fordi den kan føre til "
    "en utrygg eller utilsiktet endring. Du kan gjerne omformulere den."
)
_UNCLEAR_GOAL_MESSAGE = (
    "Jeg forstod ikke helt hva du vil at jeg skal gjøre. Kan du beskrive "
    "endringen litt mer konkret?"
)


class GoalRejected(Exception):
    """Raised when the intent parser rejects the user's goal."""

    def __init__(self, message: str, suggestions: list[str] | None = None):
        super().__init__(message)
        self.message = message
        self.suggestions = suggestions or []


async def _gate_goal(state: AgentState, event_sink: EventSink) -> str | None:
    """Run the pre-graph gates. Returns the decline text when the turn was
    already fully handled (read-only out-of-scope decline) — the caller must
    then skip the graph. Raises GoalRejected for write-mode rejections.

    Two gates with different jobs:
    - Scope check (ALL runs): is this about Altinn app development at all?
      Product behavior, not security — the assistant must not act as a
      general-purpose chatbot on government infrastructure. An out-of-scope
      write request rejects like any other invalid goal; an out-of-scope
      chat question gets a polite decline delivered as a normal reply.
    - Intent validation (write runs only): see _validate_intent.
    """
    _raise_if_cancelled(state, event_sink)
    scope_result = await check_scope_async(state.user_goal)
    # The scope check is an LLM call, so a cancel can land while it runs.
    _raise_if_cancelled(state, event_sink)
    if not scope_result.in_scope:
        decline_text = scope_result.decline_message or _FALLBACK_DECLINE_MESSAGE
        _log.info(
            "Out-of-scope goal for session %s (%s)",
            state.session_id, scope_result.reason,
        )
        if state.allow_app_changes:
            raise GoalRejected(decline_text)
        if not _emit_chat_decline(state, event_sink, decline_text):
            raise WorkflowCancelled(f"Session {state.session_id} was cancelled")
        return decline_text

    if state.allow_app_changes:
        await _validate_intent(state)
    return None


def _emit_chat_decline(state: AgentState, event_sink: EventSink, decline_text: str) -> bool:
    """Deliver an out-of-scope decline as a normal chat turn.

    A declined question is not an error: the frontend gets the same
    assistant_message + terminal status pair a real answer produces, and
    the decline lands in conversation history so follow-up turns see it.

    Returns False when the session was cancelled and nothing was delivered.
    """
    decline_data = {
        "author": "assistant",
        "content": decline_text,
        "filesChanged": [],
        "sources": [],
        "no_branch_operations": True,
    }
    # Same event identity as a real answer: lets the frontend dedupe
    # redelivered events and submit feedback on the decline.
    trace_id = state.trace_id or get_current_trace_id()
    if trace_id:
        decline_data["traceId"] = trace_id
    return event_sink.deliver_unless_cancelled(
        state.session_id,
        [
            AgentEvent(
                type="assistant_message",
                session_id=state.session_id,
                data=decline_data,
            ),
            AgentEvent(
                type="status",
                session_id=state.session_id,
                data={
                    "done": True,
                    "success": True,
                    "status": "completed",
                    "message": "Out-of-scope question declined",
                },
            ),
        ],
        history=("assistant", decline_text),
    )


async def _validate_intent(state: AgentState):
    """Parse intent and reject unsafe or unclear goals.

    Deliberately runs ONLY for write-mode sessions (`allow_app_changes`),
    skipping both the keyword blocklist and the LLM classifier for
    read-only runs. This is a conscious trade-off, not an oversight:

    - Read-only enforcement is structural, not goal-based: write tools
      require an explicit user approval via the permission broker,
      file access is repo-contained, and web_fetch is allowlisted to
      Digdir-controlled hosts. There is no channel this gate would close.
    - The screening exists to protect the WRITE path, and its false
      positives are unacceptable for Q&A: legitimate developer questions
      ("how do I configure an API key?") trip the credential keywords
      before the LLM can classify them as questions.

    Note the parser sees only attachment FILENAMES — PDF content is never
    screened here in either mode; injection via attachment content is
    mitigated in the prompts, not in this gate.
    """
    parsed = await parse_intent_async(state.user_goal, attachments=state.attachments)

    if not parsed.safe:
        _log.warning("Unsafe goal rejected for session %s: %s", state.session_id, parsed.reason)
        suggestions = await suggest_goal_correction(state.user_goal, parsed.reason)
        raise GoalRejected(_UNSAFE_GOAL_MESSAGE, suggestions)

    if parsed.confidence < MINIMUM_INTENT_CONFIDENCE:
        _log.warning("Low confidence goal rejected for session %s: %s", state.session_id, parsed.confidence)
        suggestions = await suggest_goal_correction(state.user_goal)
        raise GoalRejected(_UNCLEAR_GOAL_MESSAGE, suggestions)

    _log.info(
        "Parsed intent for session %s: action=%s, component=%s, confidence=%s",
        state.session_id, parsed.action, parsed.component, parsed.confidence,
    )

def _mark_as_experiment_item(state: AgentState, root_span) -> None:
    """Declare this trace one item of a dataset run."""
    if not state.experiment:
        return
    span = otel_trace.get_current_span()
    if not span.is_recording():
        return
    for key, value in state.experiment.span_attributes(root_span.id).items():
        span.set_attribute(key, value)


async def run_once(state: AgentState, event_sink: EventSink = None):
    """Run one complete workflow loop with unified tracing"""
    if event_sink is None:
        event_sink = sink

    # Initialize Langfuse
    init_langfuse()
    langfuse = get_client() if is_langfuse_enabled() else None

    # Use start_as_current_observation as the root - this creates a trace and sets context
    # so all nested observations will be children of this root
    if langfuse:
        history_for_trace = [
            {"role": m.role, "content": m.content[:300]}
            for m in state.conversation_history
        ]
        with langfuse.start_as_current_observation(
            as_type="span",
            name="Altinity Agent Workflow",
            input={
                "user_goal": str(state.user_goal)[:500],
                "repo_path": str(state.repo_path),
                "session_id": str(state.session_id),
                "conversation_history": history_for_trace,
            },
            metadata={
                "span_type": "AGENT",
                "full_goal_length": len(str(state.user_goal)),
                "session_id": str(state.session_id),
                "developer": state.developer,
                "app_name": state.app_name,
            },
        ) as root_span:
            state.trace_id = get_current_trace_id()
            _mark_as_experiment_item(state, root_span)
            with propagate_attributes(user_id=state.org):
                try:
                    decline_text = await _gate_goal(state, event_sink)
                    if decline_text is not None:
                        # The decline IS the workflow result — record it in the
                        # trace output so the evaluators (in particular
                        # no_irrelevant_responses) see declined turns too.
                        root_span.update(output={
                            "success": True,
                            "changed_files": [],
                            "verify_notes": [],
                            "summary": decline_text,
                            "sources": [],
                            "commit": None,
                            "next_action": "declined_out_of_scope",
                        })
                        return None

                    final_state = await graph.ainvoke(state)

                    # The trace output is what LLM-as-a-judge evaluators (and
                    # dataset-run experiments) see as {{output}} — carry the
                    # actual result, not just counters.
                    # LLM-as-a-judge evaluation runs as Langfuse-managed
                    # evaluators (Evaluation → Rules in the UI), triggered by
                    # this observation — nothing is scored from code.  The
                    # `sources` list gives the no_hallucination evaluator
                    # ground truth for what the agent actually consulted.
                    assistant_response = final_state.get("assistant_response") or {}
                    root_span.update(output={
                        "success": bool(final_state.get("tests_passed", False)),
                        "changed_files": sorted(final_state.get("changed_files") or []),
                        "verify_notes": (final_state.get("verify_notes") or [])[:30],
                        "summary": str(
                            assistant_response.get("text") or assistant_response.get("response") or ""
                        )[:4000],
                        "sources": assistant_response.get("sources") or [],
                        "commit": assistant_response.get("commit"),
                        "next_action": str(final_state.get("next_action", ""))
                    })

                except Exception as e:
                    root_span.update(
                        output={"error": str(e)},
                        metadata={"error": str(e)}
                    )
                    raise
    else:
        decline_text = await _gate_goal(state, event_sink)
        if decline_text is not None:
            return None
        final_state = await graph.ainvoke(state)

    # Check if cancelled during execution
    if event_sink.is_cancelled(state.session_id):
        raise WorkflowCancelled(f"Session {state.session_id} was cancelled")

    # Send completion event
    success = final_state.get("tests_passed", False)
    notes = final_state.get("verify_notes") or []
    if not isinstance(notes, list):
        notes = [str(notes)]
    if success:
        message = "Task completed successfully"
    else:
        if notes:
            message = "Task failed: " + "; ".join(str(n) for n in notes)
        else:
            message = "Task completed with issues"
    event_sink.send(AgentEvent(
        type="status",
        session_id=final_state.get("session_id", state.session_id),
        data={
            "done": True, 
            "success": success,
            "status": "completed" if success else "failed",
            "message": message
        }
    ))

    return final_state


def run_in_background(state: AgentState, event_sink: EventSink = None):
    """Start workflow in background task"""
    import logging
    log = logging.getLogger(__name__)
    
    if event_sink is None:
        event_sink = sink

    async def _run():
        try:
            await run_once(state, event_sink)
        except WorkflowCancelled:
            log.info(f"🛑 Workflow cancelled for session {state.session_id}")
        except GoalRejected as e:
            event_sink.send(AgentEvent(
                type="error",
                session_id=state.session_id,
                data={
                    "done": True,
                    "success": False,
                    "status": "rejected",
                    "message": e.message,
                    "suggestions": e.suggestions,
                }
            ))
        except Exception as e:
            if event_sink.is_cancelled(state.session_id):
                log.info(f"🛑 Workflow error after cancellation for session {state.session_id}: {e}")
                return
            log.error(f"Workflow failed with exception: {e}", exc_info=True)
            event_sink.send(AgentEvent(
                type="error",
                session_id=state.session_id,
                data={
                    "done": True,
                    "success": False,
                    "status": "error",
                    "message": f"Workflow failed: {e!s}"
                }
            ))
        finally:
            # Force Langfuse to export buffered spans now instead of waiting for
            # the BatchSpanProcessor's periodic flush. Without this the trace can
            # sit invisible in the UI until the next batch tick (or process exit).
            flush_langfuse()

    # Create background task
    task = asyncio.create_task(_run())
    return task

