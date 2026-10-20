"""Puts the last turns of a session before a gate message. A short follow-up,
such as "ja, fiks det", is clear only with these turns."""

import json
from collections.abc import Sequence
from typing import Any

from shared.utils.spotlight import defang_delimiter

CONTEXT_TURNS = 4
HISTORY_MAX_CHARS_PER_TURN = 6000
CONVERSATION_TAG = "recent_conversation"
_TRUNCATION_MARK = "\n…[truncated]"


def prepend_recent_turns(message: str, conversation: Sequence[Any] | None) -> str:
    turns = _select_recent_turns(conversation)
    if not turns:
        return message
    lines = "\n".join(json.dumps(turn, ensure_ascii=False) for turn in turns)
    quoted = defang_delimiter(lines, CONVERSATION_TAG)
    return f"<{CONVERSATION_TAG}>\n{quoted}\n</{CONVERSATION_TAG}>\n\n{message}"


def truncate_to_history_limit(text: str) -> str:
    if len(text) <= HISTORY_MAX_CHARS_PER_TURN:
        return text
    return text[:HISTORY_MAX_CHARS_PER_TURN] + _TRUNCATION_MARK


def _select_recent_turns(conversation: Sequence[Any] | None) -> list[dict[str, str]]:
    turns = [_read_turn(entry) for entry in list(conversation or [])[-CONTEXT_TURNS:]]
    return [turn for turn in turns if turn["role"] and turn["content"]]


def _read_turn(entry: Any) -> dict[str, str]:
    """Each turn has the same length limit as in the agent loop. This makes sure
    that the gate reads all of the text that the agent loop can act on."""
    content = truncate_to_history_limit(_read_field(entry, "content"))
    return {"role": _read_field(entry, "role"), "content": content}


def _read_field(entry: Any, name: str) -> str:
    value = entry.get(name) if isinstance(entry, dict) else getattr(entry, name, None)
    return value if isinstance(value, str) else ""
