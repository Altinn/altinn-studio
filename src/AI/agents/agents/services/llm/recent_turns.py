"""Puts the last turns of a session before a gate message. A short follow-up,
such as "ja, fiks det", is clear only with these turns."""

import json
from collections.abc import Sequence
from typing import Any

from shared.utils.spotlight import defang_delimiter

CONTEXT_TURNS = 4
CONTEXT_CHARS_PER_TURN = 400
HISTORY_MAX_CHARS_PER_TURN = 6000
CONVERSATION_TAG = "recent_conversation"
_OMISSION_MARK = " … "
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
    """The last assistant turn has the same length limit as in the agent loop. This
    makes sure that the gate and the agent loop read the same offer."""
    turns = [_read_turn(entry) for entry in list(conversation or [])[-CONTEXT_TURNS:]]
    turns = [turn for turn in turns if turn["role"] and turn["content"]]
    answered_turn = _find_newest_assistant_turn(turns)
    for turn in turns:
        shorten = truncate_to_history_limit if turn is answered_turn else _shorten
        turn["content"] = shorten(turn["content"])
    return turns


def _find_newest_assistant_turn(turns: list[dict[str, str]]) -> dict[str, str] | None:
    return next((turn for turn in reversed(turns) if turn["role"] == "assistant"), None)


def _shorten(text: str) -> str:
    """A reply starts with what the assistant did and ends with an offer. A follow-up
    can be about the start or the end."""
    if len(text) <= CONTEXT_CHARS_PER_TURN:
        return text
    half = CONTEXT_CHARS_PER_TURN // 2
    return f"{text[:half]}{_OMISSION_MARK}{text[-half:]}"


def _read_turn(entry: Any) -> dict[str, str]:
    return {"role": _read_field(entry, "role"), "content": _read_field(entry, "content")}


def _read_field(entry: Any, name: str) -> str:
    value = entry.get(name) if isinstance(entry, dict) else getattr(entry, name, None)
    return value if isinstance(value, str) else ""
