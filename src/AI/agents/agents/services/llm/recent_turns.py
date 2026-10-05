"""The recent conversation that a gate reads to judge a follow-up.

A follow-up read alone is about whatever its own words name. "og hva med den
andre siden?" became out of scope that way, and "ja, fiks det" became too
unclear to start.
"""

from collections.abc import Sequence
from typing import Any

CONTEXT_TURNS = 4
CONTEXT_CHARS_PER_TURN = 400
_OMISSION_MARK = " … "


def prepend_recent_turns(message: str, conversation: Sequence[Any] | None) -> str:
    recent = _format_recent_turns(conversation)
    if not recent:
        return message
    return f"Recent conversation, oldest first, for judging a follow-up:\n{recent}\n\n{message}"


def _format_recent_turns(conversation: Sequence[Any] | None) -> str:
    lines = []
    for turn in list(conversation or [])[-CONTEXT_TURNS:]:
        role = _read_field(turn, "role")
        text = _read_field(turn, "content") or _read_field(turn, "text")
        if role and text:
            lines.append(f"{role}: {_shorten(text)}")
    return "\n".join(lines)


def _shorten(text: str) -> str:
    """A reply tells what it did first and what it offers last, and a follow-up can continue either part."""
    if len(text) <= CONTEXT_CHARS_PER_TURN:
        return text
    half = CONTEXT_CHARS_PER_TURN // 2
    return f"{text[:half]}{_OMISSION_MARK}{text[-half:]}"


def _read_field(turn: Any, name: str) -> str:
    value = turn.get(name) if isinstance(turn, dict) else getattr(turn, name, None)
    return value if isinstance(value, str) else ""
