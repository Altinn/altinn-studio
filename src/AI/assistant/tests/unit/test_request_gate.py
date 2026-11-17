"""The runner's half of the request gate: what each judgment does to the turn.

The decisions call is mocked throughout. These tests pin the contract: one gate
for chat and write runs, a failed gate stops the turn, and a chat question that
is not relevant gets its decline as a normal chat turn.
"""

import asyncio
import threading
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.graph.runner import (
    _DECLINE_MESSAGE,
    _GATE_UNAVAILABLE_MESSAGE,
    _UNSAFE_GOAL_MESSAGE,
    GoalRejected,
    WorkflowCancelled,
    _gate_goal,
)
from agents.graph.state import AgentState, ConversationMessage
from agents.services.events.events import AgentEvent
from agents.services.events.jobs import EventSink
from shared.models import AgentAttachment

from .decisions.judgments import judgment

PASSES = judgment()
NOT_RELEVANT = judgment(relevance=0.0)
UNSAFE = judgment(secrets=1.0)
FAILED = None
SUGGESTION = "Legg til et tekstfelt for e-post"


def _state(**overrides) -> AgentState:
    base: dict[str, Any] = {
        "session_id": "sess-1",
        "user_goal": "hjelp meg planlegge min japanreise",
        "repo_path": "/tmp/repo",
        "app_name": "test-app",
        "developer": "dev",
        "repo_owner": "ttd",
        "cost_org": "ttd",
    }
    base.update(overrides)
    return AgentState(**base)


def _real_event_sink() -> EventSink:
    """A real sink that delivers the events of the test session to its developer."""
    event_sink = EventSink()
    event_sink.register_developer_session("dev", "sess-1")
    return event_sink


def _delivered(event_sink: EventSink) -> list[AgentEvent]:
    return event_sink.get_developer_events_since("dev", 0)


def _mock_event_sink(cancelled: bool = False) -> MagicMock:
    sink = MagicMock()
    sink.is_cancelled.return_value = cancelled
    return sink


def _judged(result):
    return patch("agents.graph.runner.judge_request", new=AsyncMock(return_value=result))


class TestEachJudgment:
    @pytest.mark.parametrize("allow_app_changes", [True, False])
    async def test_a_request_that_passes_goes_on_to_the_graph(self, allow_app_changes):
        with _judged(PASSES):
            assert await _gate_goal(_state(allow_app_changes=allow_app_changes), event_sink=_mock_event_sink()) is None

    @pytest.mark.parametrize("allow_app_changes", [True, False])
    async def test_a_failed_gate_stops_chat_and_write_runs(self, allow_app_changes):
        with _judged(FAILED), pytest.raises(GoalRejected) as rejected:
            await _gate_goal(_state(allow_app_changes=allow_app_changes), event_sink=_mock_event_sink())

        assert rejected.value.message == _GATE_UNAVAILABLE_MESSAGE
        assert rejected.value.suggestions == []

    @pytest.mark.parametrize("allow_app_changes", [True, False])
    async def test_an_unsafe_request_is_rejected_in_chat_too(self, allow_app_changes):
        """A chat request reaches the loop too, so chat meets the same bar."""
        suggest = AsyncMock(return_value=[SUGGESTION])
        with (
            _judged(UNSAFE),
            patch("agents.graph.runner._suggest_goals", new=suggest),
            pytest.raises(GoalRejected) as rejected,
        ):
            await _gate_goal(_state(allow_app_changes=allow_app_changes), event_sink=_mock_event_sink())

        assert rejected.value.message == _UNSAFE_GOAL_MESSAGE
        assert rejected.value.suggestions == [SUGGESTION]
        assert suggest.await_args is not None
        assert suggest.await_args.args[1] == UNSAFE.reason

    async def test_a_rejection_does_not_leak_the_concern(self):
        with (
            _judged(UNSAFE),
            patch("agents.graph.runner._suggest_goals", new=AsyncMock(return_value=[])),
            pytest.raises(GoalRejected) as rejected,
        ):
            await _gate_goal(_state(allow_app_changes=True), event_sink=_mock_event_sink())

        assert str(UNSAFE.reason) not in rejected.value.message
        assert "secrets" not in rejected.value.message

    async def test_unsafe_wins_over_not_relevant(self):
        both = judgment(relevance=0.0, injection=1.0)
        with (
            _judged(both),
            patch("agents.graph.runner._suggest_goals", new=AsyncMock(return_value=[])),
            pytest.raises(GoalRejected) as rejected,
        ):
            await _gate_goal(_state(allow_app_changes=False), event_sink=_mock_event_sink())

        assert rejected.value.message == _UNSAFE_GOAL_MESSAGE

    async def test_write_mode_rejects_a_request_that_is_not_relevant(self):
        with _judged(NOT_RELEVANT), pytest.raises(GoalRejected) as rejected:
            await _gate_goal(_state(allow_app_changes=True), event_sink=_mock_event_sink())

        assert rejected.value.message == _DECLINE_MESSAGE
        assert rejected.value.suggestions == []

    async def test_chat_declines_as_a_normal_chat_turn(self):
        event_sink = _real_event_sink()
        with _judged(NOT_RELEVANT):
            decline = await _gate_goal(_state(allow_app_changes=False), event_sink=event_sink)

        assert decline == _DECLINE_MESSAGE
        sent = _delivered(event_sink)
        assert [event.type for event in sent] == ["assistant_message", "status"]
        assert sent[0].data["content"] == decline
        assert sent[1].data["done"] is True
        assert sent[1].data["success"] is True
        history = event_sink.get_conversation_history("sess-1")
        assert [entry["content"] for entry in history] == [decline]


class TestWhatTheGateReads:
    async def test_the_goal_the_attachment_names_and_the_conversation(self):
        """A follow-up read alone is about whatever its own words name."""
        conversation = [ConversationMessage(role="assistant", content="Lagt til feltet på side 1.")]
        attachment = AgentAttachment(
            name="skjema.pdf", mime_type="application/pdf", size=1, path=Path("/tmp/skjema.pdf")
        )
        state = _state(user_goal="og på side 2?", attachments=[attachment], conversation_history=conversation)
        judge = AsyncMock(return_value=PASSES)

        with patch("agents.graph.runner.judge_request", new=judge):
            await _gate_goal(state, event_sink=_mock_event_sink())

        judge.assert_awaited_once_with("og på side 2?", ["skjema.pdf"], conversation)


class TestCancellation:
    async def test_cancelling_during_the_gate_stops_the_turn(self):
        event_sink = _mock_event_sink()
        started = asyncio.Event()
        release = asyncio.Event()

        async def slow_judge(*_args, **_kwargs):
            started.set()
            await release.wait()
            return NOT_RELEVANT

        async def cancel_once_started():
            await started.wait()
            event_sink.is_cancelled.return_value = True
            release.set()

        with patch("agents.graph.runner.judge_request", new=slow_judge), pytest.raises(WorkflowCancelled):
            await asyncio.gather(_gate_goal(_state(), event_sink=event_sink), cancel_once_started())

        assert started.is_set()
        event_sink.send.assert_not_called()
        event_sink.add_to_conversation_history.assert_not_called()

    async def test_a_cancelled_session_never_calls_the_gate(self):
        with (
            patch("agents.graph.runner.judge_request", new=AsyncMock()) as judge,
            pytest.raises(WorkflowCancelled),
        ):
            await _gate_goal(_state(), event_sink=_mock_event_sink(cancelled=True))

        judge.assert_not_awaited()

    async def test_a_cancel_landing_mid_delivery_cannot_split_the_decline(self):
        """The decline is all-or-nothing even if a cancel arrives while it is being written."""
        event_sink = _real_event_sink()
        cancelling = threading.Event()
        original_send = event_sink.send

        def send_and_let_the_cancel_race(event):
            if event.type == "assistant_message":
                cancel_thread.start()
                cancelling.wait(timeout=2)
            return original_send(event)

        cancel_thread = threading.Thread(target=lambda: (cancelling.set(), event_sink.cancel_session("sess-1")))
        event_sink.send = send_and_let_the_cancel_race

        with _judged(NOT_RELEVANT):
            decline = await _gate_goal(_state(allow_app_changes=False), event_sink=event_sink)
        cancel_thread.join(timeout=5)

        assert decline == _DECLINE_MESSAGE
        delivered = [event.type for event in _delivered(event_sink) if event.type in ("assistant_message", "status")]
        # Both halves, or neither. Never the message without its terminal status.
        assert delivered == ["assistant_message", "status"]

    async def test_a_decline_is_dropped_entirely_when_already_cancelled(self):
        event_sink = _real_event_sink()
        event_sink.cancel_session("sess-1")
        before = len(_delivered(event_sink))

        # The gate itself sees no cancel, so the decline reaches delivery and is dropped there.
        with (
            _judged(NOT_RELEVANT),
            patch("agents.graph.runner._raise_if_cancelled"),
            pytest.raises(WorkflowCancelled),
        ):
            await _gate_goal(_state(allow_app_changes=False), event_sink=event_sink)

        assert len(_delivered(event_sink)) == before
        assert event_sink.get_conversation_history("sess-1") == []
