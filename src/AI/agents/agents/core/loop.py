"""The agentic turn loop.

A single async function `run_loop` drives a conversation to termination.
It is the *only* place that decides what happens next — every other
piece of the core (tool registry, adapter, compaction) is a passive
service it composes.

Control flow:

    1.  Append user goal.
    2.  Optionally compact the message list for size.
    3.  Send to LLM, append the assistant response.
    4.  If response has no tool_use blocks → COMPLETED.
    5.  Otherwise validate + dispatch the tools:
            - concurrency-safe tools run in a parallel batch;
            - the first unsafe tool in the response acts as a barrier
              (runs after safe ones, blocks the rest of that batch).
    6.  Append a synthetic user message holding all tool_result blocks.
    7.  Goto 2.  Bail on max_turns / cancellation / unrecoverable error.

The loop never raises on tool failures: validation errors, permission
denials, and even unhandled exceptions in `tool.run` become
`ToolResultBlock(is_error=True)` so the model sees and can adapt to
them.  Only adapter-level failures (network, auth) propagate.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from shared.utils.langfuse_utils import trace_span
from shared.utils.logging_utils import get_logger

from .compaction import CompactionConfig, cap_tool_result, compact_if_needed
from .llm_adapter import LLMAdapter
from .messages import (
    AssistantMessage,
    Message,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    extract_text,
    extract_tool_uses,
)
from .registry import ToolArgsInvalidError, ToolNotFoundError, ToolRegistry
from .tool import LoopContext, ToolResult

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


class TerminationReason(str, Enum):
    COMPLETED = "completed"
    MAX_TURNS = "max_turns"
    CANCELLED = "cancelled"
    ERROR = "error"
    STUCK = "stuck"


# A tool_use is considered a "repeat" when the same tool name is called
# with the same input.  If we see the same signature this many times
# within the recent window, terminate the loop rather than letting it
# burn turns on the identical failure.
_STUCK_REPEAT_LIMIT = 3
_STUCK_WINDOW = 5

# How many back-to-back max_tokens truncations we tolerate before giving
# up.  The first one gets a recovery prompt (smaller batches); if the
# model still can't fit its output twice more, the budget is the problem.
_MAX_CONSECUTIVE_TRUNCATIONS = 2

_TRUNCATION_RECOVERY_PROMPT = (
    "Your previous response was cut off at the output-token limit, and the "
    "tool call you were emitting was lost — nothing from that response was "
    "executed.  Continue the task, but split the work into smaller steps: "
    "emit FEWER tool calls per turn (e.g. one or two `write_file` calls at "
    "a time) so each response fits.  Re-check which files already exist "
    "before rewriting them."
)

_TRUNCATION_PARTIAL_NOTICE = (
    "NOTE: your response was cut off at the output-token limit.  The tool "
    "results above are for the calls that arrived intact; the final tool "
    "call you were emitting was lost and did NOT execute.  Verify what is "
    "missing and re-issue only that work, in smaller batches."
)

# With this many turns left, inject a wrap-up notice so the model stops
# exploring and lands what it has.  A max_turns termination throws away
# the final message and leaves the work uncommitted (modulo the
# auto-commit safety net) — far worse than a slightly less polished
# result.
_WRAPUP_WARNING_TURNS = 4

_WRAPUP_NOTICE = (
    "NOTE: only {turns_remaining} turns remain in this session's budget.  "
    "Stop exploring and reading documentation.  Next turn: batch ALL "
    "remaining `write_file`/`edit_file` calls at once.  Then "
    "`verify_changes`, then `commit_session_branch`, then the final "
    "message.  An unfinished-but-committed subset beats running out of "
    "turns with nothing landed."
)

# Hard cap on the size of a concurrency-safe batch.  Even when the model
# fires 20 reads in one turn, we never run more than this many in
# parallel — protects shared resources (filesystem, network)
# and bounds the spike a single turn can put on the host.  Tunable via
# `ALTINITY_MAX_TOOL_USE_CONCURRENCY` to make tuning a config change
# rather than a code change.
_DEFAULT_MAX_TOOL_USE_CONCURRENCY = 10


def _max_tool_use_concurrency() -> int:
    raw = os.getenv("ALTINITY_MAX_TOOL_USE_CONCURRENCY")
    if not raw:
        return _DEFAULT_MAX_TOOL_USE_CONCURRENCY
    try:
        value = int(raw)
    except ValueError:
        log.warning(
            "ALTINITY_MAX_TOOL_USE_CONCURRENCY=%r is not an integer — falling back to %d",
            raw,
            _DEFAULT_MAX_TOOL_USE_CONCURRENCY,
        )
        return _DEFAULT_MAX_TOOL_USE_CONCURRENCY
    if value < 1:
        log.warning(
            "ALTINITY_MAX_TOOL_USE_CONCURRENCY=%d is below 1 — clamping to 1",
            value,
        )
        return 1
    return value


@dataclass
class LoopResult:
    """Outcome of `run_loop`.

    `messages` is the full, uncompacted conversation history — useful
    for tracing, post-hoc evaluation, and resuming.  `final_text` is the
    last assistant text (only populated on COMPLETED).  `error` carries
    the exception string when termination is ERROR.
    """

    reason: TerminationReason
    messages: list[Message]
    final_text: str | None = None
    error: str | None = None
    turns: int = 0
    usage: dict[str, int] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Events (optional observability hook)
# ---------------------------------------------------------------------------


EventCallback = Callable[[str, dict[str, Any]], Awaitable[None] | None]
"""Signature `(event_type, payload) -> None|Awaitable[None]`.

Event types: `turn_start`, `assistant_message`, `tool_call`, `tool_result`,
`compacted`, `terminated`.  The node bridges these to the WebSocket event
sink without coupling the core to it.
"""


async def _emit(callback: EventCallback | None, event: str, payload: dict[str, Any]) -> None:
    if callback is None:
        return
    try:
        result = callback(event, payload)
        if asyncio.iscoroutine(result):
            await result
    except Exception:
        # Never let a misbehaving listener break the loop.
        log.exception("event callback raised for %s", event)


# ---------------------------------------------------------------------------
# Core loop
# ---------------------------------------------------------------------------


async def run_loop(
    *,
    user_message: str,
    system_prompt: str,
    registry: ToolRegistry,
    adapter: LLMAdapter,
    ctx: LoopContext,
    max_turns: int = 20,
    compaction: CompactionConfig | None = None,
    is_cancelled: Callable[[], bool] | None = None,
    on_event: EventCallback | None = None,
    history: list[Message] | None = None,
) -> LoopResult:
    """Drive a conversation to termination.

    `is_cancelled` is polled at the top of every turn so external
    cancellation (e.g. the existing session cancel flag) takes effect
    without forcing the adapter to abort an in-flight call.

    `history` carries prior conversation turns (alternating user/assistant
    messages from earlier runs in the same session) so follow-up requests
    have context.  It is prepended verbatim before `user_message`.
    """
    compaction = compaction or CompactionConfig()
    messages: list[Message] = [*(history or []), UserMessage(content=user_message)]
    total_usage = {"input_tokens": 0, "output_tokens": 0}
    # Sliding window of per-turn tool signatures, used to detect when
    # the model is calling the same tool with the same input over and
    # over without making progress (the thrash pattern we hit on
    # compound tasks).
    recent_tool_signatures: deque[list[str]] = deque(maxlen=_STUCK_WINDOW)
    # Consecutive turns cut off at the max_tokens budget.  One truncation
    # is recoverable (we prompt the model to continue in smaller batches);
    # repeated truncation means the budget genuinely can't fit the task.
    consecutive_truncations = 0

    for turn in range(1, max_turns + 1):
        if is_cancelled and is_cancelled():
            await _emit(on_event, "terminated", {"reason": "cancelled", "turn": turn})
            return LoopResult(
                reason=TerminationReason.CANCELLED,
                messages=messages,
                turns=turn - 1,
                usage=total_usage,
            )

        await _emit(on_event, "turn_start", {"turn": turn, "messages": len(messages)})

        messages_for_call = compact_if_needed(messages, compaction)
        if messages_for_call is not messages:
            await _emit(
                on_event,
                "compacted",
                {"turn": turn, "from": len(messages), "to": len(messages_for_call)},
            )

        # Bridge streaming text deltas + tool_use block starts into the
        # loop's event sink so the UI can render the model's response as
        # it generates instead of waiting for the full turn.  The sink
        # (bridge in `agentic_loop_node`) is sync and best-effort — we
        # drop any awaitable it returns and swallow exceptions.
        def _on_text_delta(delta: str, accumulated: str) -> None:
            if on_event is None or not delta:
                return
            try:
                on_event(
                    "text_delta",
                    {"turn": turn, "delta": delta, "accumulated": accumulated},
                )
            except Exception:  # noqa: BLE001
                log.debug("text_delta sink raised", exc_info=True)

        def _on_tool_use_start(name: str, tool_use_id: str) -> None:
            if on_event is None or not name:
                return
            try:
                on_event(
                    "tool_use_pending",
                    {"turn": turn, "name": name, "tool_use_id": tool_use_id},
                )
            except Exception:  # noqa: BLE001
                log.debug("tool_use_pending sink raised", exc_info=True)

        try:
            response = await adapter.chat(
                messages=messages_for_call,
                system_prompt=system_prompt,
                tool_schemas=registry.to_schema(),
                on_text_delta=_on_text_delta,
                on_tool_use_start=_on_tool_use_start,
            )
        except Exception as exc:  # adapter failure — propagate as ERROR
            log.exception("LLM adapter call failed on turn %d", turn)
            await _emit(on_event, "terminated", {"reason": "error", "turn": turn, "error": str(exc)})
            return LoopResult(
                reason=TerminationReason.ERROR,
                messages=messages,
                error=str(exc),
                turns=turn,
                usage=total_usage,
            )

        messages.append(response)
        _accumulate_usage(total_usage, response.usage)
        await _emit(
            on_event,
            "assistant_message",
            {"turn": turn, "stop_reason": response.stop_reason, "text": extract_text(response)},
        )

        if is_cancelled and is_cancelled():
            await _emit(on_event, "terminated", {"reason": "cancelled", "turn": turn})
            return LoopResult(
                reason=TerminationReason.CANCELLED,
                messages=messages,
                turns=turn,
                usage=total_usage,
            )

        # A turn cut off at the max_tokens budget must NEVER read as a
        # normal completion: the adapter drops the truncated (malformed)
        # trailing tool_use block, so a giant batched-writes turn can come
        # back as innocent-looking text with zero tool calls.  Observed in
        # production: "completed" with zero files changed.
        truncated = response.stop_reason == "max_tokens"
        if truncated:
            consecutive_truncations += 1
            if consecutive_truncations > _MAX_CONSECUTIVE_TRUNCATIONS:
                await _emit(
                    on_event,
                    "terminated",
                    {"reason": "error", "turn": turn, "error": "output budget exceeded repeatedly"},
                )
                return LoopResult(
                    reason=TerminationReason.ERROR,
                    messages=messages,
                    turns=turn,
                    usage=total_usage,
                    error=(
                        f"Model output hit the max_tokens budget {consecutive_truncations} "
                        "turns in a row — the task's per-turn output doesn't fit. "
                        "Raise ANTHROPIC_MAX_TOKENS or split the goal."
                    ),
                )
        else:
            consecutive_truncations = 0

        tool_uses = extract_tool_uses(response)
        if not tool_uses:
            if truncated:
                # No usable tool calls survived the cut.  Tell the model
                # what happened and let it retry in smaller pieces.
                log.warning(
                    "Turn %d truncated at max_tokens with no usable tool calls — prompting recovery",
                    turn,
                )
                messages.append(UserMessage(content=_TRUNCATION_RECOVERY_PROMPT))
                continue
            final = extract_text(response)
            await _emit(on_event, "terminated", {"reason": "completed", "turn": turn})
            return LoopResult(
                reason=TerminationReason.COMPLETED,
                messages=messages,
                final_text=final,
                turns=turn,
                usage=total_usage,
            )

        # Anti-thrash: if the model has fired the same (name, input)
        # signature several turns in a row, calling the same tools
        # again won't help.  Bail with a clear reason so the agentic
        # node can surface a useful message + auto-commit any partial
        # progress.
        recent_tool_signatures.append([_tool_signature(tu) for tu in tool_uses])
        stuck_sig = _detect_stuck(recent_tool_signatures)
        if stuck_sig is not None:
            log.warning(
                "Loop stuck on signature %s — terminating early (turn %d)",
                stuck_sig,
                turn,
            )
            await _emit(
                on_event,
                "terminated",
                {"reason": "stuck", "turn": turn, "signature": stuck_sig},
            )
            return LoopResult(
                reason=TerminationReason.STUCK,
                messages=messages,
                turns=turn,
                usage=total_usage,
                error=f"Repeated {_STUCK_REPEAT_LIMIT}× call to {stuck_sig} without progress.",
            )

        result_blocks = await _dispatch_tools(
            tool_uses=tool_uses,
            registry=registry,
            ctx=ctx,
            max_result_chars=compaction.max_result_chars,
            on_event=on_event,
        )
        blocks: list[Any] = list(result_blocks)
        if truncated:
            # The completed tool calls above are valid, but the LAST
            # tool_use the model was emitting got cut and dropped —
            # surface that so the model re-checks what's missing instead
            # of assuming the whole batch landed.
            blocks.append(TextBlock(text=_TRUNCATION_PARTIAL_NOTICE))
        turns_remaining = max_turns - turn
        if turns_remaining == _WRAPUP_WARNING_TURNS:
            blocks.append(
                TextBlock(text=_WRAPUP_NOTICE.format(turns_remaining=turns_remaining))
            )
        messages.append(UserMessage(content=blocks))

    await _emit(on_event, "terminated", {"reason": "max_turns", "turn": max_turns})
    return LoopResult(
        reason=TerminationReason.MAX_TURNS,
        messages=messages,
        turns=max_turns,
        usage=total_usage,
    )


def _accumulate_usage(acc: dict[str, int], delta: dict[str, int]) -> None:
    for key, value in delta.items():
        acc[key] = acc.get(key, 0) + int(value)


def _tool_signature(tool_use: ToolUseBlock) -> str:
    """Stable fingerprint of (name, input).

    Used by the anti-thrash check.  We hash the serialized input so a
    long argument blob doesn't bloat the recent-signatures buffer, and
    we sort keys so semantically-identical inputs in different field
    orders collapse to the same signature.
    """
    try:
        payload = json.dumps(tool_use.input, sort_keys=True, default=str)
    except Exception:  # noqa: BLE001
        payload = repr(tool_use.input)
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:12]
    return f"{tool_use.name}#{digest}"


def _detect_stuck(window: deque[list[str]]) -> str | None:
    """Return the offending signature when any signature appears
    `_STUCK_REPEAT_LIMIT` times across the last `_STUCK_WINDOW` turns,
    else None."""
    if len(window) < _STUCK_REPEAT_LIMIT:
        return None
    counts: dict[str, int] = {}
    for turn_sigs in window:
        for sig in turn_sigs:
            counts[sig] = counts.get(sig, 0) + 1
            if counts[sig] >= _STUCK_REPEAT_LIMIT:
                return sig
    return None


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------


async def _dispatch_tools(
    *,
    tool_uses: list[ToolUseBlock],
    registry: ToolRegistry,
    ctx: LoopContext,
    max_result_chars: int,
    on_event: EventCallback | None,
) -> list[ToolResultBlock]:
    """Run all tool_use blocks from one assistant turn.

    Concurrency rules:
        - Contiguous concurrency-safe tools run as one parallel batch,
          gated by a semaphore so we never exceed
          `ALTINITY_MAX_TOOL_USE_CONCURRENCY` simultaneous calls.
        - The first unsafe tool acts as a serialization boundary: it
          runs after any pending safe batch and on its own.
        - Subsequent safe tools after an unsafe one form a new batch
          that runs after it.

    Safety is evaluated per-call via `concurrency_safe_for(args)`, so a
    tool can classify itself based on its input (e.g. a shell tool
    marking `ls` safe but `rm` not).  Tools whose args fail to validate
    fall back to the class-level attribute — they're going to error
    anyway, and we don't want a validation failure to also crash
    dispatch.
    """
    results: dict[str, ToolResultBlock] = {}
    batch: list[ToolUseBlock] = []
    semaphore = asyncio.Semaphore(_max_tool_use_concurrency())

    async def run_with_cap(tu: ToolUseBlock) -> ToolResultBlock:
        async with semaphore:
            return await _run_one(tu, registry, ctx, max_result_chars, on_event)

    async def flush_batch() -> None:
        if not batch:
            return
        gathered = await asyncio.gather(*(run_with_cap(tu) for tu in batch))
        for tu, block in zip(batch, gathered):
            results[tu.id] = block
        batch.clear()

    for tool_use in tool_uses:
        safe = _is_concurrency_safe(registry, tool_use)

        if safe:
            batch.append(tool_use)
        else:
            await flush_batch()
            block = await _run_one(tool_use, registry, ctx, max_result_chars, on_event)
            results[tool_use.id] = block

    await flush_batch()

    # Return in the original submission order.
    return [results[tu.id] for tu in tool_uses]


def _is_concurrency_safe(registry: ToolRegistry, tool_use: ToolUseBlock) -> bool:
    """Classify a tool_use for the dispatcher.

    The model may have produced args that don't validate — in that case
    we can't call the input-aware predicate, so we fall back to the
    class-level attribute.  An unknown tool name takes the safe-batch
    path because its error result is cheap and order-independent.
    """
    try:
        tool = registry.get(tool_use.name)
    except ToolNotFoundError:
        return True
    try:
        args = tool.input_schema.model_validate(tool_use.input)
    except Exception:  # noqa: BLE001 — validation will surface in _execute_tool
        return tool.is_concurrency_safe
    return tool.concurrency_safe_for(args)


async def _run_one(
    tool_use: ToolUseBlock,
    registry: ToolRegistry,
    ctx: LoopContext,
    max_result_chars: int,
    on_event: EventCallback | None,
) -> ToolResultBlock:
    """Validate, permission-check, and execute one tool call.

    All failures collapse to a `ToolResultBlock(is_error=True)` so the
    model can recover.  Unexpected exceptions are logged but not
    re-raised — the loop is meant to keep going.

    Each call is wrapped in a Langfuse span so traces show what the
    model asked for and what each tool returned.
    """
    await _emit(on_event, "tool_call", {"id": tool_use.id, "name": tool_use.name, "input": tool_use.input})

    with trace_span(
        f"tool_{tool_use.name}",
        metadata={"span_type": "TOOL", "tool_name": tool_use.name},
    ) as span:
        try:
            span.update(input={"args": tool_use.input})
        except Exception:  # noqa: BLE001
            pass

        block = await _execute_tool(
            tool_use=tool_use,
            registry=registry,
            ctx=ctx,
            max_result_chars=max_result_chars,
            on_event=on_event,
        )

        try:
            span.update(
                output={
                    "content": block.content[:2000],
                    "is_error": block.is_error,
                    "content_chars": len(block.content),
                },
                level="ERROR" if block.is_error else "DEFAULT",
            )
        except Exception:  # noqa: BLE001
            pass

        return block


async def _execute_tool(
    *,
    tool_use: ToolUseBlock,
    registry: ToolRegistry,
    ctx: LoopContext,
    max_result_chars: int,
    on_event: EventCallback | None,
) -> ToolResultBlock:
    """Resolve, permission-check, and run one tool.  Pure logic — the
    Langfuse instrumentation lives in `_run_one`."""
    try:
        prepared = registry.prepare_call(tool_use.name, tool_use.input)
    except ToolNotFoundError:
        return _error_block(
            tool_use.id,
            f"Unknown tool: {tool_use.name!r}. Available: {', '.join(registry.names())}",
            on_event,
        )
    except ToolArgsInvalidError as exc:
        return _error_block(tool_use.id, str(exc), on_event)

    try:
        permission = await prepared.tool.check_permission(prepared.args, ctx)
    except Exception as exc:
        log.exception("permission check raised for %s", tool_use.name)
        return _error_block(tool_use.id, f"Permission check failed: {exc}", on_event)

    if not permission.allowed and permission.escalatable and ctx.permission_requester:
        # The user can lift this denial interactively (read-only session).
        # Ask once — concurrent tool calls in the same batch share the
        # broker's single in-flight request, and a previous decline is
        # remembered so the model isn't allowed to nag.
        if ctx.extras.get("permission_declined_by_user"):
            return _error_block(
                tool_use.id,
                f"Tool {tool_use.name!r} denied: the user already declined to enable "
                "changes this session. Do not retry write tools — summarize what you "
                "would have changed and finish.",
                on_event,
            )
        try:
            granted = await ctx.permission_requester(
                f"{tool_use.name}: {_describe_tool_use(tool_use)}"
            )
        except Exception:
            log.exception("permission escalation failed for %s", tool_use.name)
            granted = False
        if granted:
            ctx.allow_app_changes = True
            permission = await prepared.tool.check_permission(prepared.args, ctx)
        else:
            ctx.extras["permission_declined_by_user"] = True
            return _error_block(
                tool_use.id,
                f"Tool {tool_use.name!r} denied: the user declined to enable changes "
                "for this session (or didn't respond). Do not retry write tools — "
                "summarize what you would have changed and finish.",
                on_event,
            )

    if not permission.allowed:
        return _error_block(
            tool_use.id,
            f"Tool {tool_use.name!r} denied: {permission.reason}",
            on_event,
        )

    try:
        result: ToolResult = await prepared.tool.run(prepared.args, ctx)
    except Exception as exc:
        log.exception("tool %s raised", tool_use.name)
        return _error_block(tool_use.id, f"Tool execution error: {exc}", on_event)

    if not result.is_error:
        _collect_source(ctx, result)

    content = cap_tool_result(result.content, max_result_chars)
    block = ToolResultBlock(
        tool_use_id=tool_use.id,
        content=content,
        is_error=result.is_error,
    )
    await _emit(
        on_event,
        "tool_result",
        {"id": tool_use.id, "name": tool_use.name, "is_error": result.is_error, "chars": len(content)},
    )
    return block


def _collect_source(ctx: LoopContext, result: ToolResult) -> None:
    """Record a consulted knowledge source declared by the tool.

    Knowledge tools (web_fetch, skill, schema lookups) put a
    `{"title", "url"?, "kind"}` dict under `metadata["source"]`.  The
    collected list is ground truth — an entry exists iff the tool
    actually ran successfully — and is attached to the final assistant
    message so the UI can show sources without trusting the model to
    self-report them.
    """
    source = result.metadata.get("source")
    if not isinstance(source, dict) or not source.get("title"):
        return
    sources: list[dict] = ctx.extras.setdefault("sources", [])
    key = (source.get("title"), source.get("url"))
    if any((s.get("title"), s.get("url")) == key for s in sources):
        return
    sources.append(source)


def _describe_tool_use(tool_use: ToolUseBlock) -> str:
    """Compact human-readable description of what a tool call would do,
    for the user-facing permission prompt."""
    args = tool_use.input or {}
    path = args.get("path")
    if path:
        return str(path)
    message = args.get("message")
    if message:
        return str(message)[:120]
    return "endringer i appen"


def _error_block(tool_use_id: str, message: str, on_event: EventCallback | None) -> ToolResultBlock:
    block = ToolResultBlock(tool_use_id=tool_use_id, content=message, is_error=True)
    # Fire-and-forget event since this is on a sync code path.
    if on_event is not None:
        try:
            maybe_coro = on_event("tool_result", {"id": tool_use_id, "is_error": True, "chars": len(message)})
            if asyncio.iscoroutine(maybe_coro):
                # Schedule but do not await — caller is already inside the loop.
                asyncio.create_task(maybe_coro)
        except Exception:
            log.exception("event callback raised in _error_block")
    return block
