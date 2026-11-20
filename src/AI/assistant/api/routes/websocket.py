"""WebSocket routes for real-time communication.

Architecture
------------
The .NET Designer backend (AltinityProxyHub) opens a raw WebSocket to ``/ws``,
sends a ``{"type": "session", "session_id": "...", "developer": "..."}`` message,
and then listens for JSON frames that it forwards to the frontend via SignalR.

This module:
1. Accepts the WebSocket and waits for the ``session`` registration message.
2. Starts an **event-streaming loop** that reads from the per-**developer** event
   buffer in ``EventSink`` and sends each event as a JSON frame.
3. Concurrently listens for incoming messages (ping, more session registrations, etc.).

Key design: events are streamed by *developer*, not by *session*. This means
that after a page refresh (which creates a new connection-level session ID),
the WS still delivers all events for any workflow session belonging to that
developer. The session_id on each event lets the frontend route it correctly.

One WebSocket streams a developer's events: the last one that registered.
Designer runs several replicas, and the replica that handles a command registers
the session on its own WebSocket. Designer forwards each event to all the
developer's browser tabs, so a second streaming WebSocket would deliver each
event twice. The new WebSocket continues from where the previous one stopped,
and the previous one is closed.

No callbacks are used — the WebSocket handler *pulls* from the buffer.
"""

import asyncio
import contextlib
import logging
from dataclasses import dataclass

from fastapi import FastAPI, WebSocket
from starlette.websockets import WebSocketState

from agents.services.events import sink

logger = logging.getLogger(__name__)


@dataclass
class _DeveloperStream:
    """The WebSocket that streams a developer's events, and the index of the next event to send."""

    websocket: WebSocket
    cursor: int
    task: asyncio.Task[None] | None = None


_streams: dict[str, _DeveloperStream] = {}
# Two replicas can register a session for the same developer at the same time.
_takeover_locks: dict[str, asyncio.Lock] = {}


async def _safe_send_json(ws: WebSocket, data: dict) -> bool:
    """Send JSON over *ws*. Returns False if the socket is gone."""
    try:
        if ws.client_state != WebSocketState.CONNECTED:
            return False
        await ws.send_json(data)
        return True
    except Exception:
        return False


async def _stream_developer_events(stream: _DeveloperStream, developer: str):
    """Read all events for *developer* and push them over the stream's WebSocket.

    Streams indefinitely — new workflow sessions for the same developer
    are automatically included because events fan out to the developer buffer.
    Stops when the WebSocket disconnects or another WebSocket takes over.
    """
    ws = stream.websocket
    logger.info(f"🎬 _stream_developer_events started for developer {developer} (cursor={stream.cursor})")

    while True:
        new_events = sink.get_developer_events_since(developer, stream.cursor)
        if new_events:
            logger.info(f"📦 Found {len(new_events)} new events (cursor={stream.cursor}) for developer {developer}")

        for event in new_events:
            ok = await _safe_send_json(ws, event.model_dump())
            if not ok:
                logger.info(
                    f"🔌 WS closed while streaming event {event.type} session={event.session_id} developer={developer}"
                )
                return
            logger.info(f"✅ WS sent: type={event.type}, session={event.session_id}, developer={developer}")
            stream.cursor += 1

        try:
            logger.debug(f"⏳ Waiting for developer events (cursor={stream.cursor}) developer={developer}")
            got_new = await sink.wait_for_developer_events(developer, known_count=stream.cursor, timeout=30.0)
            if not got_new:
                logger.debug(f"⏰ Wait timed out (cursor={stream.cursor}) developer={developer}, looping")
        except Exception as e:
            logger.warning(f"Wait error for developer {developer}: {e}")


async def _take_over_stream(ws: WebSocket, developer: str) -> _DeveloperStream:
    """Make *ws* the WebSocket that streams *developer*'s events.

    The new stream starts where the previous one stopped, so no event is lost.
    Without a previous stream, it starts at the current tail.
    """
    async with _takeover_locks.setdefault(developer, asyncio.Lock()):
        previous = _streams.get(developer)
        if previous is not None and previous.task is not None:
            previous.task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await previous.task

        cursor = previous.cursor if previous is not None else sink.developer_event_count(developer)
        stream = _DeveloperStream(websocket=ws, cursor=cursor)
        stream.task = asyncio.create_task(_stream_developer_events(stream, developer))
        _streams[developer] = stream

        if previous is not None and previous.websocket is not ws:
            logger.info(f"🔁 Another WebSocket streams the events of developer {developer}; closing the previous one")
            with contextlib.suppress(Exception):
                await previous.websocket.close(code=1000, reason="Another connection receives the events")
        return stream


def _release_stream(stream: _DeveloperStream | None, developer: str | None):
    """Forget *stream*, unless another WebSocket has taken over."""
    if stream is None or developer is None:
        return
    if _streams.get(developer) is stream:
        del _streams[developer]


async def _receive_initial_registration(ws: WebSocket):
    """Wait for the first ``session`` registration message.

    Returns ``(session_id, developer)`` tuple, or ``(None, None)`` on disconnect.
    """
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await _safe_send_json(
                    ws,
                    {
                        "type": "pong",
                        "timestamp": data.get("timestamp"),
                    },
                )
            elif msg_type == "session":
                return data.get("session_id"), data.get("developer")
    except Exception:
        return None, None


def register_websocket_routes(app: FastAPI):
    """Register WebSocket routes on the FastAPI app."""

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        developer = None
        stream = None

        try:
            await websocket.accept()
            logger.info("🔗 WebSocket connected")

            await _safe_send_json(
                websocket,
                {
                    "type": "connection",
                    "status": "connected",
                    "message": "WebSocket connection established",
                },
            )

            # --- Phase 1: wait for initial registration -----------------------
            session_id, developer = await _receive_initial_registration(websocket)
            if not developer:
                logger.info("🔌 WebSocket closed before developer registration")
                return

            sink.register_developer_session(developer, session_id or "")
            logger.info(f"📋 Developer registered: {developer}, initial session: {session_id}")

            # --- Phase 2: stream ALL developer events + keep reading ----------
            # The stream never restarts on new session registrations — it delivers
            # events for any session belonging to this developer.
            stream = await _take_over_stream(websocket, developer)
            # Designer sends the command after this answer, so the events of the
            # command come after the stream has started.
            await _safe_send_json(
                websocket,
                {
                    "type": "session",
                    "status": "registered",
                    "session_id": session_id,
                    "developer": developer,
                },
            )

            try:
                while True:
                    data = await websocket.receive_json()
                    msg_type = data.get("type")

                    if msg_type == "ping":
                        await _safe_send_json(
                            websocket,
                            {
                                "type": "pong",
                                "timestamp": data.get("timestamp"),
                            },
                        )
                    elif msg_type == "session":
                        new_session_id = data.get("session_id")
                        new_developer = data.get("developer") or developer
                        if new_session_id:
                            sink.register_developer_session(new_developer, new_session_id)
                            logger.info(
                                f"� Additional session registered: {new_session_id} -> developer {new_developer}"
                            )
                            await _safe_send_json(
                                websocket,
                                {
                                    "type": "session",
                                    "status": "registered",
                                    "session_id": new_session_id,
                                    "developer": new_developer,
                                },
                            )
            except Exception:
                pass

        except Exception as e:
            logger.error(f"WebSocket error: {e}")

        finally:
            _release_stream(stream, developer)
            if stream is not None and stream.task is not None and not stream.task.done():
                stream.task.cancel()
                with contextlib.suppress(asyncio.CancelledError, Exception):
                    await stream.task
            logger.info(f"🔌 WebSocket disconnected (developer={developer})")

    @app.get("/api/ws/status")
    async def get_websocket_status():
        """Get WebSocket connection status."""
        return {"status": "ok"}
