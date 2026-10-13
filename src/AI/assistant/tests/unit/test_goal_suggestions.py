"""Suggestions shown after a rejection must be things the user can actually ask
for. Offering one the gate rejects sends them round in a circle, and the prompt
alone cannot guarantee that, so the filter is in code."""

import threading
from unittest.mock import AsyncMock, MagicMock, patch

from agents.services.llm.intent_parser import suggest_goal_correction

REJECTED_GOAL = "Legg til et felt som viser api key fra konfigurasjonen"
GATE_REASON = "exposes a credential in the form"
SAFE_SUGGESTION = "Legg til et tekstfelt for e-postadresse på side 1"
REJECTED_SUGGESTION = "Legg til et tekstfelt som viser API-nøkkelen fra konfigurasjonen"
TWO_CHOICES_OFFER = (
    "I can remove the address field, or I can make it optional and add a help text. Which do you prefer?"
)
TWO_CHOICES_CONVERSATION = [{"role": "assistant", "content": TWO_CHOICES_OFFER}]
CHOICE_SUGGESTION = "Remove the address field on page 2"


def _verdicts(**by_goal):
    """Stand in for the classifier: each goal maps to its `safe` verdict."""

    async def parse(goal, attachments=None, conversation=None):
        return MagicMock(safe=by_goal[goal], confidence=0.9, reason=None)

    return parse


def _confidences(**by_goal):
    """Stand in for the classifier when only confidence differs."""

    async def parse(goal, attachments=None, conversation=None):
        return MagicMock(safe=True, confidence=by_goal[goal], reason=None)

    return parse


async def _suggest_after_two_choices() -> MagicMock:
    """Use a mock for the model only. The suggestion call is synchronous, and the
    gate call is asynchronous."""
    client = MagicMock()
    client.call_sync = MagicMock(return_value=CHOICE_SUGGESTION)
    client.call_async = AsyncMock(return_value='{"action":"remove","safe":true,"confidence":0.9}')
    with (
        patch("agents.services.llm.llm_client.get_llm_client", return_value=client),
        patch("agents.services.llm.llm_client.get_prompt_with_langfuse", return_value=("system", None)),
    ):
        await suggest_goal_correction("go ahead", conversation=TWO_CHOICES_CONVERSATION)
    return client


class TestSuggestionFiltering:
    async def test_a_suggestion_the_gate_would_reject_is_dropped(self):
        with (
            patch(
                "agents.services.llm.intent_parser.suggest_goals_with_llm",
                return_value=[SAFE_SUGGESTION, REJECTED_SUGGESTION],
            ),
            patch(
                "agents.services.llm.intent_parser.parse_intent_async",
                new=_verdicts(**{SAFE_SUGGESTION: True, REJECTED_SUGGESTION: False}),
            ),
        ):
            kept = await suggest_goal_correction(REJECTED_GOAL, GATE_REASON)

        assert kept == [SAFE_SUGGESTION]

    async def test_no_suggestions_rather_than_misleading_ones(self):
        with (
            patch(
                "agents.services.llm.intent_parser.suggest_goals_with_llm",
                return_value=[REJECTED_SUGGESTION],
            ),
            patch(
                "agents.services.llm.intent_parser.parse_intent_async",
                new=_verdicts(**{REJECTED_SUGGESTION: False}),
            ),
        ):
            assert await suggest_goal_correction(REJECTED_GOAL, GATE_REASON) == []

    async def test_a_blocklisted_suggestion_never_reaches_the_classifier(self):
        classifier = AsyncMock()
        with (
            patch(
                "agents.services.llm.intent_parser.suggest_goals_with_llm",
                return_value=["Drop table chat_messages fra databasen"],
            ),
            patch("agents.services.llm.intent_parser.parse_intent_async", new=classifier),
        ):
            assert await suggest_goal_correction(REJECTED_GOAL, GATE_REASON) == []
        classifier.assert_not_awaited()


class TestSuggestionFailures:
    async def test_a_failing_generator_does_not_break_the_rejection(self):
        """It used to raise, which turned a clean rejection into a generic error."""
        with patch(
            "agents.services.llm.intent_parser.suggest_goals_with_llm",
            side_effect=RuntimeError("no llm"),
        ):
            assert await suggest_goal_correction(REJECTED_GOAL, GATE_REASON) == []

    async def test_a_suggestion_that_cannot_be_checked_is_not_offered(self):
        with (
            patch(
                "agents.services.llm.intent_parser.suggest_goals_with_llm",
                return_value=[SAFE_SUGGESTION],
            ),
            patch(
                "agents.services.llm.intent_parser.parse_intent_async",
                new=AsyncMock(side_effect=RuntimeError("classifier down")),
            ),
        ):
            assert await suggest_goal_correction(REJECTED_GOAL, GATE_REASON) == []


class TestConfidenceGate:
    async def test_a_suggestion_below_the_workflow_threshold_is_dropped(self):
        """The workflow rejects on confidence too, so offering one below the
        threshold would be refused the moment the user picked it."""
        with (
            patch(
                "agents.services.llm.intent_parser.suggest_goals_with_llm",
                return_value=[SAFE_SUGGESTION, "gjør det der"],
            ),
            patch(
                "agents.services.llm.intent_parser.parse_intent_async",
                new=_confidences(**{SAFE_SUGGESTION: 0.9, "gjør det der": 0.02}),
            ),
        ):
            kept = await suggest_goal_correction(REJECTED_GOAL, GATE_REASON)

        assert kept == [SAFE_SUGGESTION]


class TestEventLoop:
    async def test_the_blocking_generator_runs_off_the_event_loop(self):
        """It does synchronous LLM I/O, and the workflow task shares its loop
        with cancellation handling."""
        loops: list = []

        def blocking_generator(goal, reason=None, conversation=None):
            loops.append(threading.current_thread().name)
            return [SAFE_SUGGESTION]

        with (
            patch(
                "agents.services.llm.intent_parser.suggest_goals_with_llm",
                new=blocking_generator,
            ),
            patch(
                "agents.services.llm.intent_parser.parse_intent_async",
                new=_verdicts(**{SAFE_SUGGESTION: True}),
            ),
        ):
            await suggest_goal_correction(REJECTED_GOAL, GATE_REASON)

        assert loops and loops[0] != threading.current_thread().name


class TestTheConversation:
    """After "go ahead" to an offer with two choices, a suggestion must select one
    choice. The model can do this only when it gets the offer."""

    async def test_sends_the_conversation_to_the_suggestion_prompt(self):
        client = await _suggest_after_two_choices()

        assert TWO_CHOICES_OFFER in str(client.call_sync.call_args.args)

    async def test_checks_each_suggestion_against_the_gate_with_the_conversation(self):
        client = await _suggest_after_two_choices()

        assert TWO_CHOICES_OFFER in str(client.call_async.await_args.args)
