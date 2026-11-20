"""Suggestions shown after a rejection must be things the user can actually ask
for. Offering one the gate rejects sends them round in a circle, and the prompt
alone cannot guarantee that, so the filter is in code."""

import threading
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from agents.graph.runner import _suggest_goals
from agents.graph.state import AgentState, ConversationMessage
from agents.services.decisions import Judgment

from .decisions.judgments import judgment

REJECTED_GOAL = "Legg til et felt som viser api key fra konfigurasjonen"
GATE_REASON = "The request asks the agent to reveal or extract secrets."
SAFE_SUGGESTION = "Legg til et tekstfelt for e-postadresse på side 1"
UNSAFE_SUGGESTION = "Legg til et tekstfelt som viser API-nøkkelen fra konfigurasjonen"
OFF_TOPIC_SUGGESTION = "Planlegg en tur til Japan"
TWO_CHOICES_OFFER = (
    "I can remove the address field, or I can make it optional and add a help text. Which do you prefer?"
)
CHOICE_SUGGESTION = "Remove the address field on page 2"


def _state(**overrides) -> AgentState:
    base: dict[str, Any] = {
        "session_id": "sess-1",
        "user_goal": REJECTED_GOAL,
        "repo_path": "/tmp/repo",
        "app_name": "test-app",
        "developer": "dev",
        "repo_owner": "ttd",
        "cost_org": "ttd",
    }
    base.update(overrides)
    return AgentState(**base)


def _judgments(**by_goal: Judgment | None):
    async def judge(goal, attachment_names=(), conversation=None):
        return by_goal[goal]

    return judge


def _suggesting(*suggestions: str):
    return patch("agents.graph.runner.suggest_goals_with_llm", return_value=list(suggestions))


class TestSuggestionFiltering:
    async def test_a_suggestion_the_gate_would_reject_is_dropped(self):
        judgments = {
            SAFE_SUGGESTION: judgment(),
            UNSAFE_SUGGESTION: judgment(secrets=1.0),
            OFF_TOPIC_SUGGESTION: judgment(relevance=0.0),
        }
        with (
            _suggesting(SAFE_SUGGESTION, UNSAFE_SUGGESTION, OFF_TOPIC_SUGGESTION),
            patch("agents.graph.runner.judge_request", new=_judgments(**judgments)),
        ):
            assert await _suggest_goals(_state(), GATE_REASON) == [SAFE_SUGGESTION]

    async def test_a_suggestion_the_gate_could_not_judge_is_not_offered(self):
        with (
            _suggesting(SAFE_SUGGESTION),
            patch("agents.graph.runner.judge_request", new=AsyncMock(return_value=None)),
        ):
            assert await _suggest_goals(_state(), GATE_REASON) == []


class TestSuggestionFailures:
    async def test_a_failing_generator_does_not_break_the_rejection(self):
        """It used to raise, which turned a clean rejection into a generic error."""
        with patch("agents.graph.runner.suggest_goals_with_llm", side_effect=RuntimeError("no llm")):
            assert await _suggest_goals(_state(), GATE_REASON) == []


class TestEventLoop:
    async def test_the_blocking_generator_runs_off_the_event_loop(self):
        """It does synchronous LLM I/O, and the workflow task shares its loop
        with cancellation handling."""
        threads: list[str] = []

        def blocking_generator(goal, reason=None, conversation=None):
            threads.append(threading.current_thread().name)
            return []

        with patch("agents.graph.runner.suggest_goals_with_llm", new=blocking_generator):
            await _suggest_goals(_state(), GATE_REASON)

        assert threads and threads[0] != threading.current_thread().name


class TestTheConversation:
    """After "go ahead" to an offer with two choices, a suggestion must select one
    choice. The model can do this only when it gets the offer."""

    async def test_the_suggestion_prompt_and_the_gate_both_get_the_conversation(self):
        conversation = [ConversationMessage(role="assistant", content=TWO_CHOICES_OFFER)]
        client = MagicMock()
        client.call_sync = MagicMock(return_value=CHOICE_SUGGESTION)
        judge = AsyncMock(return_value=judgment())
        with (
            patch("agents.services.llm.llm_client.get_llm_client", return_value=client),
            patch("agents.services.llm.llm_client.get_prompt_with_langfuse", return_value=("system", None)),
            patch("agents.graph.runner.judge_request", new=judge),
        ):
            kept = await _suggest_goals(_state(user_goal="go ahead", conversation_history=conversation), None)

        assert kept == [CHOICE_SUGGESTION]
        assert TWO_CHOICES_OFFER in str(client.call_sync.call_args.args)
        assert judge.await_args is not None
        assert judge.await_args.kwargs["conversation"] == conversation
