"""Context-size management for the agentic loop.

Two mechanisms, ordered from cheapest to most aggressive:

1.  **Per-result cap** — every tool_result is truncated to a hard char
    limit when it lands in the message list.  Prevents one giant tool
    response (e.g. a full layout dump) from dominating the window.
2.  **History compaction** — when the cumulative message size crosses a
    threshold, the oldest tool_results are replaced with a single digest
    block so recent turns retain detail while older context becomes a
    summary.

A char-based heuristic is used in place of a real tokenizer.  This is
deliberate: it has no extra deps, is provider-agnostic, and is
conservative (chars > tokens for ASCII, so we compact earlier than
strictly necessary).  Swap in tiktoken or a per-provider counter only if
a measured problem appears.

Compaction is *transparent to the model* — it operates on a copy of the
message list passed to the next API call, never mutates the loop's
canonical history.
"""

from __future__ import annotations

from dataclasses import dataclass

from .messages import (
    AssistantMessage,
    ContentBlock,
    Message,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
)

# Conservative: ~3.5 chars per token for English/code mix.  Slight
# under-estimation of capacity is fine — it compacts a bit sooner.
_CHARS_PER_TOKEN = 4

# Default knobs.  Tune via CompactionConfig per LLMAdapter when the
# target model has a known context window.
DEFAULT_MAX_RESULT_CHARS = 24_000  # ~6k tokens per tool result
DEFAULT_COMPACT_THRESHOLD_CHARS = 480_000  # ~120k tokens before compacting
DEFAULT_KEEP_RECENT_MESSAGES = 6


@dataclass(frozen=True)
class CompactionConfig:
    max_result_chars: int = DEFAULT_MAX_RESULT_CHARS
    compact_threshold_chars: int = DEFAULT_COMPACT_THRESHOLD_CHARS
    keep_recent_messages: int = DEFAULT_KEEP_RECENT_MESSAGES


def estimate_tokens(chars: int) -> int:
    """Char-to-token heuristic. Conservative — overestimates char->token
    by rounding up, so we hit thresholds slightly early."""
    return (chars + _CHARS_PER_TOKEN - 1) // _CHARS_PER_TOKEN


def cap_tool_result(content: str, max_chars: int) -> str:
    """Truncate tool_result content to `max_chars`, with a marker so the
    model knows it was cut.  No-op when already under the cap."""
    if len(content) <= max_chars:
        return content
    head = content[:max_chars]
    omitted = len(content) - max_chars
    return f"{head}\n\n[…truncated {omitted} chars — call the tool again with a narrower query if you need more]"


def message_chars(message: Message) -> int:
    """Approximate the wire size of a single message in characters.

    Sums the text of every content block plus overhead per block.  Used
    to decide when to compact.
    """
    if isinstance(message, UserMessage):
        content = message.content
    else:
        content = message.content

    if isinstance(content, str):
        return len(content)

    total = 0
    for block in content:
        total += _block_chars(block)
    return total


def _block_chars(block: ContentBlock) -> int:
    if isinstance(block, TextBlock):
        return len(block.text)
    if isinstance(block, ToolUseBlock):
        # Name + a rough sizing of the input dict.
        return len(block.name) + len(str(block.input))
    if isinstance(block, ToolResultBlock):
        return len(block.content)
    return 0


def total_chars(messages: list[Message]) -> int:
    return sum(message_chars(m) for m in messages)


def compact_if_needed(
    messages: list[Message],
    config: CompactionConfig = CompactionConfig(),
) -> list[Message]:
    """Return a (possibly compacted) copy of `messages` for the next API call.

    When total size is under the threshold, returns the input unchanged
    (same references — no copy cost).  When over, replaces the oldest
    tool_use/tool_result pairs with a single textual digest while
    preserving the most recent N messages verbatim.

    The first message (initial user goal) is always preserved so the
    model never loses sight of why it started.
    """
    if total_chars(messages) < config.compact_threshold_chars:
        return messages

    if len(messages) <= config.keep_recent_messages + 1:
        # Nothing to compact — the entire history is "recent".  Cap is
        # the safety net here.
        return messages

    head = messages[0]  # original user goal
    tail = messages[-config.keep_recent_messages:]
    middle = messages[1:-config.keep_recent_messages]

    digest = _summarize_middle(middle)
    return [head, digest, *tail]


def _summarize_middle(middle: list[Message]) -> UserMessage:
    """Compact a slice of history into a single textual user message.

    The summary lists tool calls + result lengths so the model retains a
    sense of what was explored without the full payloads.  Final
    assistant text from any AssistantMessage is kept verbatim (it tends
    to contain the model's own running summary).
    """
    lines: list[str] = ["[compacted earlier context]"]

    for msg in middle:
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock) and block.text.strip():
                    lines.append(f"- assistant said: {block.text.strip()[:400]}")
                elif isinstance(block, ToolUseBlock):
                    lines.append(f"- called {block.name}({_compact_args(block.input)})")
        elif isinstance(msg, UserMessage) and isinstance(msg.content, list):
            for block in msg.content:
                if isinstance(block, ToolResultBlock):
                    status = "error" if block.is_error else "ok"
                    lines.append(
                        f"  -> result ({status}, {len(block.content)} chars): "
                        f"{block.content.strip()[:200]}"
                    )

    return UserMessage(content="\n".join(lines))


def _compact_args(args: dict) -> str:
    """Render tool args compactly for the digest — keys + truncated values."""
    parts = []
    for k, v in args.items():
        v_str = str(v)
        if len(v_str) > 60:
            v_str = v_str[:60] + "…"
        parts.append(f"{k}={v_str}")
    return ", ".join(parts)
