"""Message and content-block types for the agentic loop.

Provider-neutral shape modeled on Anthropic's tool-use protocol because it
maps cleanly to the loop's needs (one assistant turn can contain text *and*
multiple tool calls).  The LLM adapter translates to/from each provider's
on-the-wire format.

A turn in the loop looks like:
    1.  UserMessage(text)                       — initial user input
    2.  AssistantMessage([text?, tool_use*])    — model response
    3.  UserMessage([tool_result*])             — synthetic, results fed back
    4.  AssistantMessage(...)                   — next model response
    ...
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Union


@dataclass(frozen=True)
class TextBlock:
    """Plain text emitted by the user or the model."""

    text: str
    type: Literal["text"] = "text"


@dataclass(frozen=True)
class ToolUseBlock:
    """A tool call the model wants to execute.

    `id` is the model-generated identifier; the matching `ToolResultBlock`
    must reference the same id so the model can correlate result to call.
    """

    id: str
    name: str
    input: dict[str, Any]
    type: Literal["tool_use"] = "tool_use"


@dataclass(frozen=True)
class ToolResultBlock:
    """Result of a tool call, fed back to the model on the next turn."""

    tool_use_id: str
    content: str
    is_error: bool = False
    type: Literal["tool_result"] = "tool_result"


ContentBlock = Union[TextBlock, ToolUseBlock, ToolResultBlock]


@dataclass
class UserMessage:
    """A user-role message.

    Carries either plain text (initial user input) or a list of
    `ToolResultBlock`s (synthetic message the loop appends after executing
    tool calls).  The Anthropic protocol uses the user role for both.
    """

    content: Union[str, list[ContentBlock]]
    role: Literal["user"] = "user"


@dataclass
class AssistantMessage:
    """An assistant-role message produced by the model.

    `content` is always a list of blocks so the same shape covers
    text-only, tool-use-only, and mixed responses.  `stop_reason` mirrors
    the provider's termination signal (e.g. "end_turn", "tool_use",
    "max_tokens") and is used by the loop to decide whether to continue.
    """

    content: list[ContentBlock]
    stop_reason: str | None = None
    usage: dict[str, int] = field(default_factory=dict)
    role: Literal["assistant"] = "assistant"


Message = Union[UserMessage, AssistantMessage]


def extract_text(message: AssistantMessage) -> str:
    """Concatenate all text blocks in an assistant message.

    Returns an empty string if the message has no text content (e.g. it
    only contains tool_use blocks).
    """
    parts = [b.text for b in message.content if isinstance(b, TextBlock)]
    return "\n".join(parts).strip()


def extract_tool_uses(message: AssistantMessage) -> list[ToolUseBlock]:
    """Return the tool_use blocks from an assistant message, in order."""
    return [b for b in message.content if isinstance(b, ToolUseBlock)]
