"""Tests for EventSink cancellation semantics.

After ``cancel_session`` the sink must drop progress-narration events
(status, chunks, permission requests) for that session: the terminal
"cancelled" error event has already been delivered, and a trailing status
would resurrect the workflow activity indicator in the frontend with
nothing left to turn it off. Result-bearing events still flow, and a new
run on the same session (``mark_session_started``) lifts the suppression.
"""

from agents.services.events.jobs import EventSink
from agents.services.events.events import AgentEvent

SESSION_ID = "session-1"
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
