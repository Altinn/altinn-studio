"""Judges whether a request is safe and relevant, with one decisions call before the agent starts."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from shared.utils.logging_utils import get_logger
from shared.utils.recent_turns import prepend_recent_turns

from .client import decide, predicate
from .questions import CONCERNS, CONTEXT, RELEVANCE_QUESTION

log = get_logger(__name__)

# The answers are not deterministic, so each threshold keeps a margin from the gate datasets' borderline items.
RELEVANCE_THRESHOLD = 0.5
CONCERN_THRESHOLD = 0.2

# A refused or missing answer counts as holding: the concern is raised, and the request is relevant.
UNANSWERED = 1.0

RELEVANCE = "relevance"
QUESTIONS = [
    predicate(RELEVANCE, RELEVANCE_QUESTION),
    *(predicate(name, text) for name, text in CONCERNS.items()),
]


@dataclass(frozen=True)
class Judgment:
    """The probability of each answered question. The verdicts follow from these and the thresholds."""

    probabilities: dict[str, float]

    def probability(self, question: str) -> float:
        return self.probabilities.get(question, UNANSWERED)

    @property
    def relevant(self) -> bool:
        return self.probability(RELEVANCE) >= RELEVANCE_THRESHOLD

    @property
    def concern(self) -> str:
        """The concern most likely to hold."""
        return max(CONCERNS, key=self.probability)

    @property
    def safe(self) -> bool:
        return self.probability(self.concern) < CONCERN_THRESHOLD

    @property
    def reason(self) -> str | None:
        """The question behind the concern that makes the request unsafe."""
        return None if self.safe else CONCERNS[self.concern]


def build_request_message(
    goal: str, attachment_names: Sequence[str] = (), conversation: Sequence[Any] | None = None
) -> str:
    """What the decision model reads about the request."""
    message = f"Request: {goal}"
    if attachment_names:
        message += f"\n\nAttachment filenames (content not shown): {', '.join(attachment_names)}"
    return prepend_recent_turns(message, conversation)


async def judge_request(
    goal: str, attachment_names: Sequence[str] = (), conversation: Sequence[Any] | None = None
) -> Judgment | None:
    """Never raises: returns None when the call fails."""
    # Azure takes no top-level instructions, so the shared context goes in as a developer message.
    messages = [
        {"role": "developer", "content": CONTEXT},
        {"role": "user", "content": build_request_message(goal, attachment_names, conversation)},
    ]
    try:
        answers = await decide(messages, QUESTIONS, name="request_gate")
    except Exception as e:
        log.error(f"The request gate could not run: {e!r}")
        return None
    return judge(answers)


def judge(answers: dict[str, dict]) -> Judgment:
    return Judgment(
        {name: answer["probability"] for name, answer in answers.items() if answer.get("type") == "predicate"}
    )
