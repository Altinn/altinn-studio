"""Tests for the scope gate: the classifier parsing and the runner wiring.

The classifier LLM call is mocked throughout — these tests pin the
contract: fail-open on classifier errors, write-mode rejection via
GoalRejected, and the read-only decline delivered as a normal chat turn.
"""

import asyncio
import threading
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.graph.runner import (
    _UNCLEAR_GOAL_MESSAGE,
    _UNSAFE_GOAL_MESSAGE,
    GoalRejected,
    WorkflowCancelled,
    _gate_goal,
    _validate_intent,
)
from agents.graph.state import AgentState
from agents.services.events.jobs import EventSink
from agents.services.llm.scope_checker import ScopeCheckResult, check_scope_async


def _state(**overrides) -> AgentState:
    base = dict(
        session_id="sess-1",
        user_goal="hjelp meg planlegge min japanreise",
        repo_path="/tmp/repo",
        app_name="test-app",
        developer="dev",
        org="ttd",
    )
    base.update(overrides)
    return AgentState(**base)


class TestCheckScopeAsync:
    async def test_parses_an_out_of_scope_verdict(self):
        client = MagicMock()
        client.call_async = AsyncMock(
            return_value='{"in_scope": false, "decline_message": "Jeg kan bare hjelpe med Altinn.", "reason": "travel"}'
        )
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("planlegg japanreisen min")

        assert result.in_scope is False
        assert result.decline_message == "Jeg kan bare hjelpe med Altinn."

    async def test_strips_markdown_fences_around_the_json(self):
        client = MagicMock()
        client.call_async = AsyncMock(
            return_value='```json\n{"in_scope": true, "decline_message": null, "reason": "layout"}\n```'
        )
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("legg til et tekstfelt")

        assert result.in_scope is True

    async def test_fails_open_when_the_classifier_call_fails(self):
        client = MagicMock()
        client.call_async = AsyncMock(side_effect=RuntimeError("LLM down"))
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("legg til et tekstfelt")

        assert result.in_scope is True

    async def test_fails_open_when_in_scope_is_not_a_boolean(self):
        client = MagicMock()
        client.call_async = AsyncMock(
            return_value='{"in_scope": "false", "decline_message": "Nei.", "reason": "travel"}'
        )
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("planlegg japanreisen min")

        assert result.in_scope is True

    async def test_fails_open_on_unparseable_output(self):
        client = MagicMock()
        client.call_async = AsyncMock(return_value="Sorry, I cannot classify that.")
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("legg til et tekstfelt")

        assert result.in_scope is True


def _sink(cancelled: bool = False) -> MagicMock:
    sink = MagicMock()
    sink.is_cancelled.return_value = cancelled
    return sink


class TestGateGoal:
    def _out_of_scope(self):
        return ScopeCheckResult(
            in_scope=False,
            decline_message="Jeg kan bare hjelpe med Altinn-apputvikling.",
            reason="travel planning",
        )

    async def test_write_mode_rejects_out_of_scope_goals(self):
        state = _state(allow_app_changes=True)
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            with pytest.raises(GoalRejected, match="Altinn-apputvikling"):
                await _gate_goal(state, event_sink=_sink())

    async def test_write_mode_keeps_the_decline_text_intact(self):
        """Suggestions travel as their own field, so punctuation in the decline
        no longer has to survive a packed string."""
        state = _state(allow_app_changes=True)
        piped = ScopeCheckResult(
            in_scope=False,
            decline_message="Jeg kan bare hjelpe med Altinn | ikke reiseplanlegging.",
            reason="travel planning",
        )
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=piped),
        ):
            with pytest.raises(GoalRejected) as excinfo:
                await _gate_goal(state, event_sink=_sink())

        assert excinfo.value.message == piped.decline_message
        assert excinfo.value.suggestions == []


    async def test_read_only_declines_as_a_normal_chat_turn(self):
        state = _state(allow_app_changes=False)
        event_sink = EventSink()
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            decline = await _gate_goal(state, event_sink=event_sink)

        assert decline == "Jeg kan bare hjelpe med Altinn-apputvikling."
        sent = event_sink.get_events_since("sess-1", 0)
        assert [event.type for event in sent] == ["assistant_message", "status"]
        assert sent[0].data["content"] == decline
        assert sent[0].data["no_branch_operations"] is True
        assert sent[1].data["done"] is True
        assert sent[1].data["success"] is True
        history = event_sink.get_conversation_history("sess-1")
        assert [entry["content"] for entry in history] == [decline]

    async def test_in_scope_write_mode_runs_intent_validation(self):
        state = _state(allow_app_changes=True, user_goal="legg til et tekstfelt")
        in_scope = ScopeCheckResult(in_scope=True, reason="layout")
        with (
            patch(
                "agents.graph.runner.check_scope_async",
                new=AsyncMock(return_value=in_scope),
            ),
            patch(
                "agents.graph.runner._validate_intent", new=AsyncMock()
            ) as validate_intent,
        ):
            decline = await _gate_goal(state, event_sink=_sink())

        assert decline is None
        validate_intent.assert_awaited_once_with(state)

    async def test_in_scope_read_only_skips_intent_validation(self):
        state = _state(allow_app_changes=False, user_goal="hvordan fungerer uttrykk?")
        in_scope = ScopeCheckResult(in_scope=True, reason="Altinn concept question")
        with (
            patch(
                "agents.graph.runner.check_scope_async",
                new=AsyncMock(return_value=in_scope),
            ),
            patch(
                "agents.graph.runner._validate_intent", new=AsyncMock()
            ) as validate_intent,
        ):
            decline = await _gate_goal(state, event_sink=_sink())

        assert decline is None
        validate_intent.assert_not_awaited()

    async def test_cancelling_during_the_scope_check_stops_the_turn(self):
        state = _state(allow_app_changes=False)
        event_sink = _sink()
        started = asyncio.Event()
        release = asyncio.Event()

        async def slow_scope_check(_goal):
            started.set()
            await release.wait()
            return self._out_of_scope()

        async def cancel_once_started():
            await started.wait()
            event_sink.is_cancelled.return_value = True
            release.set()

        with patch("agents.graph.runner.check_scope_async", new=slow_scope_check):
            with pytest.raises(WorkflowCancelled):
                await asyncio.gather(
                    _gate_goal(state, event_sink=event_sink), cancel_once_started()
                )

        assert started.is_set()
        event_sink.send.assert_not_called()
        event_sink.add_to_conversation_history.assert_not_called()

    async def test_a_cancelled_session_never_calls_the_scope_check(self):
        state = _state(allow_app_changes=False)
        with patch(
            "agents.graph.runner.check_scope_async", new=AsyncMock()
        ) as check_scope:
            with pytest.raises(WorkflowCancelled):
                await _gate_goal(state, event_sink=_sink(cancelled=True))

        check_scope.assert_not_awaited()

    async def test_a_cancel_landing_mid_delivery_cannot_split_the_decline(self):
        """The decline is all-or-nothing even if a cancel arrives while it is
        being written."""
        state = _state(allow_app_changes=False)
        event_sink = EventSink()
        cancelling = threading.Event()
        original_send = event_sink.send

        def send_and_let_the_cancel_race(event):
            if event.type == "assistant_message":
                cancel_thread.start()
                cancelling.wait(timeout=2)
            return original_send(event)

        cancel_thread = threading.Thread(
            target=lambda: (cancelling.set(), event_sink.cancel_session("sess-1"))
        )
        event_sink.send = send_and_let_the_cancel_race

        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            decline = await _gate_goal(state, event_sink=event_sink)
        cancel_thread.join(timeout=5)

        assert decline == "Jeg kan bare hjelpe med Altinn-apputvikling."
        delivered = [
            event.type
            for event in event_sink.get_events_since("sess-1", 0)
            if event.type in ("assistant_message", "status")
        ]
        # Both halves, or neither. Never the message without its terminal status.
        assert delivered == ["assistant_message", "status"]

    async def test_a_decline_is_dropped_entirely_when_already_cancelled(self):
        state = _state(allow_app_changes=False)
        event_sink = EventSink()
        event_sink.cancel_session("sess-1")
        before = len(event_sink.get_events_since("sess-1", 0))

        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            with pytest.raises(WorkflowCancelled):
                await _gate_goal(state, event_sink=event_sink)

        after = event_sink.get_events_since("sess-1", 0)
        assert len(after) == before
        assert event_sink.get_conversation_history("sess-1") == []


REJECTION_SUGGESTION = "Prøv A"
UNSAFE_GATE_REASON = "targets a database"


class TestValidateIntentRejectionCopy:
    """The user-facing half of a rejection: Norwegian, and free of the gate's
    own reasoning, which names the rule that was tripped."""

    async def _reject(self, parsed) -> GoalRejected:
        with (
            patch("agents.graph.runner.parse_intent_async", AsyncMock(return_value=parsed)),
            patch(
                "agents.graph.runner.suggest_goal_correction",
                return_value=[REJECTION_SUGGESTION],
            ),
        ):
            with pytest.raises(GoalRejected) as excinfo:
                await _validate_intent(_state(allow_app_changes=True))
        return excinfo.value

    async def test_an_unsafe_goal_does_not_leak_the_gate_reason(self):
        parsed = MagicMock(safe=False, confidence=0.9, reason=UNSAFE_GATE_REASON)

        rejection = await self._reject(parsed)

        assert rejection.message == _UNSAFE_GOAL_MESSAGE
        assert rejection.suggestions == [REJECTION_SUGGESTION]
        assert UNSAFE_GATE_REASON not in rejection.message

    async def test_an_unclear_goal_is_reported_in_norwegian(self):
        parsed = MagicMock(safe=True, confidence=0.0, reason="unclear")

        rejection = await self._reject(parsed)

        assert rejection.message == _UNCLEAR_GOAL_MESSAGE
        assert rejection.suggestions == [REJECTION_SUGGESTION]
