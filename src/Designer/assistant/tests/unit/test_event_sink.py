"""Tests for EventSink cancellation semantics.

After ``cancel_session`` the sink must drop progress-narration events
(status, chunks, permission requests) for that session: the terminal
"cancelled" error event has already been delivered, and a trailing status
would resurrect the workflow activity indicator in the frontend with
nothing left to turn it off. Result-bearing events still flow, and a new
run on the same session (``mark_session_started``) lifts the suppression.
"""

import threading

from agents.services.events.jobs import EventSink
from agents.services.events.events import AgentEvent

SESSION_ID = "session-1"
CANCEL_RACE_WINDOW_SECONDS = 0.5
CANCEL_COMPLETION_TIMEOUT_SECONDS = 5
DEVELOPER = "testUser"


def _event(event_type: str, **data) -> AgentEvent:
    return AgentEvent(type=event_type, session_id=SESSION_ID, data=data)


def _sink_with_session() -> EventSink:
    sink = EventSink()
    sink.register_developer_session(DEVELOPER, SESSION_ID)
    return sink


def _delivered_types(sink: EventSink) -> list[str]:
    return [event.type for event in sink.get_developer_events_since(DEVELOPER, 0)]


class TestCancelledSessionSuppression:
    def test_drops_progress_events_after_cancel(self):
        sink = _sink_with_session()

        sink.cancel_session(SESSION_ID)
        sink.send(_event("status", message="Skanner repo"))
        sink.send(_event("assistant_message_chunk", text="del"))
        sink.send(_event("permission_request", request_id="req-1"))

        # Only the terminal error event emitted by cancel_session remains.
        assert _delivered_types(sink) == ["error"]

    def test_result_events_still_flow_after_cancel(self):
        sink = _sink_with_session()

        sink.cancel_session(SESSION_ID)
        sink.send(_event("assistant_message", content="Svar"))
        sink.send(_event("done", success=True))

        assert _delivered_types(sink) == ["error", "assistant_message", "done"]

    def test_new_run_on_same_session_lifts_suppression(self):
        sink = _sink_with_session()
        sink.cancel_session(SESSION_ID)

        sink.mark_session_started(SESSION_ID)
        sink.send(_event("status", message="Tenker på oppgaven"))

        assert _delivered_types(sink) == ["error", "status"]

    def test_other_sessions_unaffected_by_cancel(self):
        sink = _sink_with_session()
        other_session = "session-2"
        sink.register_developer_session(DEVELOPER, other_session)

        sink.cancel_session(SESSION_ID)
        sink.send(AgentEvent(type="status", session_id=other_session, data={"message": "Jobber"}))

        assert _delivered_types(sink) == ["error", "status"]


class TestStatusElapsedStamping:
    def test_status_events_carry_elapsed_ms_for_started_sessions(self):
        sink = _sink_with_session()
        sink.mark_session_started(SESSION_ID)

        sink.send(_event("status", message="Skanner repo"))

        [event] = sink.get_developer_events_since(DEVELOPER, 0)
        assert event.data["elapsed_ms"] >= 0

    def test_status_events_without_started_session_are_not_stamped(self):
        sink = _sink_with_session()

        sink.send(_event("status", message="Skanner repo"))

        [event] = sink.get_developer_events_since(DEVELOPER, 0)
        assert "elapsed_ms" not in event.data

    def test_existing_elapsed_ms_is_not_overwritten(self):
        sink = _sink_with_session()
        sink.mark_session_started(SESSION_ID)

        sink.send(_event("status", message="Skanner repo", elapsed_ms=1234))

        [event] = sink.get_developer_events_since(DEVELOPER, 0)
        assert event.data["elapsed_ms"] == 1234


class TestAssistantMessageEventId:
    """Server-side persistence in Designer dedupes on this id."""

    def test_assistant_messages_are_stamped_with_an_event_id(self):
        sink = _sink_with_session()

        sink.send(_event("assistant_message", response="Ferdig"))

        [event] = sink.get_developer_events_since(DEVELOPER, 0)
        assert event.data["eventId"]

    def test_replayed_event_keeps_the_same_event_id(self):
        sink = _sink_with_session()
        sink.send(_event("assistant_message", response="Ferdig"))

        first = sink.get_developer_events_since(DEVELOPER, 0)[0].data["eventId"]
        replayed = sink.get_developer_events_since(DEVELOPER, 0)[0].data["eventId"]

        assert replayed == first

    def test_separate_messages_get_distinct_event_ids(self):
        sink = _sink_with_session()

        sink.send(_event("assistant_message", response="Første"))
        sink.send(_event("assistant_message", response="Andre"))

        first, second = sink.get_developer_events_since(DEVELOPER, 0)
        assert first.data["eventId"] != second.data["eventId"]

    def test_existing_event_id_is_not_overwritten(self):
        sink = _sink_with_session()

        sink.send(_event("assistant_message", response="Ferdig", eventId="supplied"))

        [event] = sink.get_developer_events_since(DEVELOPER, 0)
        assert event.data["eventId"] == "supplied"

    def test_other_event_types_are_not_stamped(self):
        sink = _sink_with_session()

        sink.send(_event("status", message="Skanner repo"))

        [event] = sink.get_developer_events_since(DEVELOPER, 0)
        assert "eventId" not in event.data


class TestCancelRacingDelivery:
    def test_a_progress_event_cannot_land_after_the_terminal_one(self):
        """A cancel arriving mid-send must not overtake the event being sent."""
        sink = _sink_with_session()
        cancel_thread: list[threading.Thread] = []
        original_get_buffer = sink._get_or_create_buffer

        def cancel_midway(session_id: str):
            buffer = original_get_buffer(session_id)
            if not cancel_thread:
                thread = threading.Thread(target=sink.cancel_session, args=(SESSION_ID,))
                cancel_thread.append(thread)
                thread.start()
                # Long enough for an unlocked delivery to lose the race.
                thread.join(timeout=CANCEL_RACE_WINDOW_SECONDS)
            return buffer

        sink._get_or_create_buffer = cancel_midway
        sink.send(_event("status", message="Skanner repo"))
        cancel_thread[0].join(timeout=CANCEL_COMPLETION_TIMEOUT_SECONDS)

        # The terminal error is last, so nothing restarts the activity indicator.
        assert _delivered_types(sink) == ["status", "error"]


class TestDeliverUnlessCancelled:
    def test_delivers_events_and_history_for_a_live_session(self):
        sink = _sink_with_session()

        delivered = sink.deliver_unless_cancelled(
            SESSION_ID, [_event("assistant_message", content="Svar")], ("assistant", "Svar")
        )

        assert delivered is True
        assert _delivered_types(sink) == ["assistant_message"]
        assert [m["content"] for m in sink.get_conversation_history(SESSION_ID)] == ["Svar"]

    def test_delivers_nothing_once_the_session_is_cancelled(self):
        sink = _sink_with_session()
        sink.cancel_session(SESSION_ID)

        delivered = sink.deliver_unless_cancelled(
            SESSION_ID, [_event("assistant_message", content="Svar")], ("assistant", "Svar")
        )

        assert delivered is False
        # Only cancel_session's own terminal event, and no orphaned history.
        assert _delivered_types(sink) == ["error"]
        assert sink.get_conversation_history(SESSION_ID) == []
