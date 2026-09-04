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

No callbacks are used — the WebSocket handler *pulls* from the buffer.
Reconnection after a page reload simply replays all buffered events.
"""
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from agents.services.events import sink

logger = logging.getLogger(__name__)


async def _safe_send_json(ws: WebSocket, data: dict) -> bool:
    """Send JSON over *ws*. Returns False if the socket is gone."""
    try:
        if ws.client_state != WebSocketState.CONNECTED:
            return False
        await ws.send_json(data)
        return True
    except Exception:
        return False


async def _stream_developer_events(ws: WebSocket, developer: str):
    """Read all events for *developer* and push them over *ws*.

    Streams indefinitely — new workflow sessions for the same developer
    are automatically included because events fan out to the developer buffer.
    Only stops when the WebSocket disconnects.
    """
    cursor = sink.developer_event_count(developer)  # start from current tail (skip already-sent history)
    logger.info(f"🎬 _stream_developer_events started for developer {developer} (cursor={cursor})")

    while True:
        new_events = sink.get_developer_events_since(developer, cursor)
        if new_events:
            logger.info(
                f"📦 Found {len(new_events)} new events (cursor={cursor}) for developer {developer}"
            )

        for event in new_events:
            ok = await _safe_send_json(ws, event.model_dump())
            if not ok:
                logger.info(
                    f"🔌 WS closed while streaming event {event.type} "
                    f"session={event.session_id} developer={developer}"
                )
                return
            logger.info(
                f"✅ WS sent: type={event.type}, session={event.session_id}, developer={developer}"
            )
            cursor += 1

        try:
            logger.debug(f"⏳ Waiting for developer events (cursor={cursor}) developer={developer}")
            got_new = await sink.wait_for_developer_events(developer, known_count=cursor, timeout=30.0)
            if not got_new:
                logger.debug(f"⏰ Wait timed out (cursor={cursor}) developer={developer}, looping")
        except Exception as e:
            logger.warning(f"Wait error for developer {developer}: {e}")


async def _receive_initial_registration(ws: WebSocket):
    """Wait for the first ``session`` registration message.

    Returns ``(session_id, developer)`` tuple, or ``(None, None)`` on disconnect.
    """
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await _safe_send_json(ws, {
                    "type": "pong",
                    "timestamp": data.get("timestamp"),
                })
            elif msg_type == "session":
                return data.get("session_id"), data.get("developer")
    except (WebSocketDisconnect, Exception):
        return None, None


def register_websocket_routes(app: FastAPI):
    """Register WebSocket routes on the FastAPI app."""

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        developer = None
        stream_task = None

        try:
            await websocket.accept()
            logger.info("🔗 WebSocket connected")

            await _safe_send_json(websocket, {
                "type": "connection",
                "status": "connected",
                "message": "WebSocket connection established",
            })

            # --- Phase 1: wait for initial registration -----------------------
            session_id, developer = await _receive_initial_registration(websocket)
            if not developer:
                logger.info("🔌 WebSocket closed before developer registration")
                return

            sink.register_developer_session(developer, session_id or "")
            logger.info(f"📋 Developer registered: {developer}, initial session: {session_id}")
            await _safe_send_json(websocket, {
                "type": "session",
                "status": "registered",
                "session_id": session_id,
                "developer": developer,
            })

            # --- Phase 2: stream ALL developer events + keep reading ----------
            # The stream never restarts on new session registrations — it delivers
            # events for any session belonging to this developer.
            stream_task = asyncio.create_task(_stream_developer_events(websocket, developer))

            try:
                while True:
                    data = await websocket.receive_json()
                    msg_type = data.get("type")

                    if msg_type == "ping":
                        await _safe_send_json(websocket, {
                            "type": "pong",
                            "timestamp": data.get("timestamp"),
                        })
                    elif msg_type == "session":
                        new_session_id = data.get("session_id")
                        new_developer = data.get("developer") or developer
                        if new_session_id:
                            sink.register_developer_session(new_developer, new_session_id)
                            logger.info(
                                f"� Additional session registered: {new_session_id} "
                                f"-> developer {new_developer}"
                            )
                            await _safe_send_json(websocket, {
                                "type": "session",
                                "status": "registered",
                                "session_id": new_session_id,
                                "developer": new_developer,
                            })
            except (WebSocketDisconnect, Exception):
                pass

        except Exception as e:
            logger.error(f"WebSocket error: {e}")

        finally:
            if stream_task and not stream_task.done():
                stream_task.cancel()
                try:
                    await stream_task
                except (asyncio.CancelledError, Exception):
                    pass
            logger.info(f"🔌 WebSocket disconnected (developer={developer})")

    @app.get("/api/ws/status")
    async def get_websocket_status():
        """Get WebSocket connection status."""
        return {"status": "ok"}
