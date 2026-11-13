import asyncio
from collections.abc import AsyncIterator
from typing import Any, cast
from unittest.mock import patch

import pytest
from fastapi import WebSocket
from starlette.websockets import WebSocketState

from agents.services.events.events import AgentEvent
from agents.services.events.jobs import EventSink
from api.routes import websocket as websocket_routes

DEVELOPER = "testUser"
SESSION_ID = "session-1"


class FakeWebSocket:
    """Records what the stream sends. A send waits while ``paused`` is set."""

    def __init__(self):
        self.client_state = WebSocketState.CONNECTED
        self.sent: list[dict[str, Any]] = []
        self.closed = False
        self.paused: asyncio.Event | None = None

    async def send_json(self, data: dict[str, Any]):
        if self.paused is not None:
            await self.paused.wait()
        self.sent.append(data)

    async def close(self, code: int = 1000, reason: str | None = None):
        self.closed = True
        self.client_state = WebSocketState.DISCONNECTED


@pytest.fixture
async def sink() -> AsyncIterator[EventSink]:
    fresh_sink = EventSink()
    fresh_sink.set_main_loop(asyncio.get_running_loop())
    fresh_sink.register_developer_session(DEVELOPER, SESSION_ID)
    with (
        patch.object(websocket_routes, "sink", fresh_sink),
        patch.dict(websocket_routes._streams, clear=True),
        patch.dict(websocket_routes._takeover_locks, clear=True),
    ):
        yield fresh_sink
        for stream in list(websocket_routes._streams.values()):
            if stream.task is not None:
                stream.task.cancel()


def _send_status(sink: EventSink, message: str):
    sink.send(AgentEvent(type="status", session_id=SESSION_ID, data={"message": message}))


async def _take_over(websocket: FakeWebSocket) -> None:
    await websocket_routes._take_over_stream(cast(WebSocket, websocket), DEVELOPER)


async def _wait_until_sent(websocket: FakeWebSocket, count: int):
    for _ in range(100):
        if len(websocket.sent) >= count:
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"Expected {count} events, got {len(websocket.sent)}")


def _messages(websocket: FakeWebSocket) -> list[str]:
    return [event["data"]["message"] for event in websocket.sent]


async def test_a_new_websocket_takes_over_the_developers_events_and_closes_the_previous_one(sink: EventSink):
    """Designer forwards each event to all the developer's tabs, so two streaming WebSockets deliver it twice."""
    first, second = FakeWebSocket(), FakeWebSocket()
    await _take_over(first)
    _send_status(sink, "før")
    await _wait_until_sent(first, 1)

    await _take_over(second)
    _send_status(sink, "etter")
    await _wait_until_sent(second, 1)

    assert first.closed
    assert _messages(first) == ["før"]
    assert _messages(second) == ["etter"]


async def test_the_new_websocket_sends_the_events_that_the_previous_one_had_not_sent(sink: EventSink):
    first, second = FakeWebSocket(), FakeWebSocket()
    await _take_over(first)
    first.paused = asyncio.Event()
    _send_status(sink, "venter")
    await asyncio.sleep(0.05)

    await _take_over(second)
    await _wait_until_sent(second, 1)

    assert first.sent == []
    assert _messages(second) == ["venter"]


async def test_a_closed_websocket_leaves_the_stream_of_the_websocket_that_took_over(sink: EventSink):
    first, second = FakeWebSocket(), FakeWebSocket()
    first_stream = await websocket_routes._take_over_stream(cast(WebSocket, first), DEVELOPER)
    await _take_over(second)

    websocket_routes._release_stream(first_stream, DEVELOPER)

    assert websocket_routes._streams[DEVELOPER].websocket is second


async def test_one_websocket_streams_when_two_take_over_at_the_same_time(sink: EventSink):
    first, second, third = FakeWebSocket(), FakeWebSocket(), FakeWebSocket()
    await _take_over(first)

    await asyncio.gather(_take_over(second), _take_over(third))

    streaming = websocket_routes._streams[DEVELOPER].websocket
    assert first.closed
    assert [websocket.closed for websocket in (second, third)].count(False) == 1
    assert not cast(FakeWebSocket, streaming).closed
