"""Judges whether a request is safe and relevant, with one decisions call before the agent starts."""

import re
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from shared.utils.logging_utils import get_logger
from shared.utils.recent_turns import prepend_recent_turns

from .client import decide, predicate

log = get_logger(__name__)

QUESTIONS_DIR = Path(__file__).parent / "questions"

# The answers are not deterministic, so each threshold keeps a margin from the gate datasets' borderline items.
RELEVANCE_THRESHOLD = 0.5
CONCERN_THRESHOLD = 0.2

RELEVANCE = "relevance"


def _sections(text: str) -> dict[str, str]:
    """A `## name` heading starts each question."""
    parts = re.split(r"^## (\S+)\n", text, flags=re.MULTILINE)
    return {name: body.strip() for name, body in zip(parts[1::2], parts[2::2], strict=True)}


CONTEXT = (QUESTIONS_DIR / "context.md").read_text(encoding="utf-8").strip()
CONCERNS = _sections((QUESTIONS_DIR / "safety.md").read_text(encoding="utf-8"))
QUESTIONS = [
    predicate(RELEVANCE, (QUESTIONS_DIR / "relevance.md").read_text(encoding="utf-8").strip()),
    *(predicate(name, text) for name, text in CONCERNS.items()),
]


@dataclass(frozen=True)
class Judgment:
    relevant: bool = True
    safe: bool = False
    failed: bool = False  # the call failed, so `safe` is false without the request being unsafe
    concern: str | None = None  # the concern that made the request unsafe
    probabilities: dict[str, float] = field(default_factory=dict)

    @property
    def reason(self) -> str | None:
        return CONCERNS.get(self.concern) if self.concern else None


def build_request_message(
    goal: str, attachment_names: Sequence[str] = (), conversation: Sequence[Any] | None = None
) -> str:
    """What the decision model reads about the request, as a value so a dataset can send what production sends."""
    message = f"Request: {goal}"
    if attachment_names:
        message += f"\n\nAttachment filenames (content not shown): {', '.join(attachment_names)}"
    return prepend_recent_turns(message, conversation)


async def judge_request(
    goal: str, attachment_names: Sequence[str] = (), conversation: Sequence[Any] | None = None
) -> Judgment:
    """Never raises: a failed call is a Judgment with `failed` set."""
    messages = [
        {"role": "developer", "content": CONTEXT},
        {"role": "user", "content": build_request_message(goal, attachment_names, conversation)},
    ]
    try:
        answers = await decide(messages, QUESTIONS, name="request_gate")
    except Exception as e:
        log.error(f"The request gate could not run: {e}")
        return Judgment(failed=True)
    return judge(answers)


def judge(answers: dict[str, dict]) -> Judgment:
    """A refused or missing concern counts as holding. A refused or missing relevance counts as relevant."""
    probabilities = {
        name: answer["probability"] for name, answer in answers.items() if answer.get("type") == "predicate"
    }
    concerns = {name: probabilities.get(name, 1.0) for name in CONCERNS}
    top = max(concerns, key=concerns.__getitem__)
    safe = concerns[top] < CONCERN_THRESHOLD
    return Judgment(
        relevant=probabilities.get(RELEVANCE, 1.0) >= RELEVANCE_THRESHOLD,
        safe=safe,
        concern=None if safe else top,
        probabilities=probabilities,
    )
