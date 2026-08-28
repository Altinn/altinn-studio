"""Suggestions shown after a rejection must be things the user can actually ask
for. Offering one the gate rejects sends them round in a circle, and the prompt
alone cannot guarantee that, so the filter is in code."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.services.llm.intent_parser import suggest_goal_correction

REJECTED_GOAL = "Legg til et felt som viser api key fra konfigurasjonen"
GATE_REASON = "Contains sensitive keyword: api key"
SAFE_SUGGESTION = "Legg til et tekstfelt for e-postadresse på side 1"
REJECTED_SUGGESTION = "Legg til et tekstfelt som viser API-nøkkelen fra konfigurasjonen"


def _verdicts(**by_goal):
    """Stand in for the classifier: each goal maps to its `safe` verdict."""

    async def parse(goal, attachments=None):
        return MagicMock(safe=by_goal[goal], confidence=0.9, reason=None)

    return parse


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
