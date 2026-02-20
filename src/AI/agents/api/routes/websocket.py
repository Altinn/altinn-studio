"""WebSocket routes for real-time communication.

Architecture
------------
The .NET Designer backend (AltinityProxyHub) opens a raw WebSocket to ``/ws``,
sends a ``{"type": "session", "session_id": "..."}`` message, and then listens
for JSON frames that it forwards to the frontend via SignalR.

This module:
1. Accepts the WebSocket and waits for the ``session`` registration message.
2. Starts an **event-streaming loop** that reads from the per-session event
   buffer in ``EventSink`` and sends each event as a JSON frame.
3. Concurrently listens for incoming messages (ping, close, etc.).

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


async def _stream_events(ws: WebSocket, session_id: str):
    """Read events from the session buffer and push them over *ws*.

    Runs until the session emits a terminal event (``done`` / ``error``)
    or the WebSocket disconnects.
    """
    cursor = 0  # next event index to send
    logger.info(f"🎬 _stream_events started for session {session_id}")

    while True:
        # Grab any new events since our cursor
        new_events = sink.get_events_since(session_id, cursor)
        if new_events:
            logger.info(f"📦 Found {len(new_events)} new events (cursor={cursor}) for session {session_id}")

        for event in new_events:
            ok = await _safe_send_json(ws, event.model_dump())
            if not ok:
                logger.info(f"🔌 WS closed while streaming event {event.type} for session {session_id}")
                return
            logger.info(f"✅ WS sent: type={event.type}, session={session_id}")
            cursor += 1

            # Terminal events — stop streaming after sending
            if event.type in ("done", "error"):
                logger.info(f"🏁 Terminal event sent for session {session_id}, stopping stream")
                return

        # Wait for new events beyond our cursor (race-free)
        try:
            logger.debug(f"⏳ Waiting for events (cursor={cursor}) for session {session_id}")
            got_new = await sink.wait_for_events(session_id, known_count=cursor, timeout=30.0)
            if not got_new:
                logger.debug(f"⏰ Wait timed out (cursor={cursor}) for session {session_id}, looping")
        except Exception as e:
            logger.warning(f"Wait error for session {session_id}: {e}")


async def _receive_loop(ws: WebSocket):
    """Read incoming messages from the WebSocket.

    Returns the session_id once a ``session`` message arrives.
    After that, keeps reading (ping/pong, etc.) until disconnect.
    Yields ``None`` on disconnect.
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
                return data.get("session_id")
            # Ignore unknown message types
    except (WebSocketDisconnect, Exception):
        return None


def register_websocket_routes(app: FastAPI):
    """Register WebSocket routes on the FastAPI app."""

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        session_id = None
        stream_task = None

        try:
            await websocket.accept()
            logger.info("🔗 WebSocket connected")

            # Send welcome
            await _safe_send_json(websocket, {
                "type": "connection",
                "status": "connected",
                "message": "WebSocket connection established",
            })

            # --- Phase 1: wait for session registration -----------------------
            session_id = await _receive_loop(websocket)
            if not session_id:
                logger.info("🔌 WebSocket closed before session registration")
                return

            buffered = sink.event_count(session_id)
            logger.info(f"📋 Session registered: {session_id} (buffered events: {buffered})")
            await _safe_send_json(websocket, {
                "type": "session",
                "status": "registered",
                "session_id": session_id,
            })

            # --- Phase 2: stream events + keep reading incoming messages ------
            stream_task = asyncio.create_task(_stream_events(websocket, session_id))

            # Keep reading incoming messages (ping/pong) while streaming
            try:
                while True:
                    data = await websocket.receive_json()
                    msg_type = data.get("type")
                    if msg_type == "ping":
                        await _safe_send_json(websocket, {
                            "type": "pong",
                            "timestamp": data.get("timestamp"),
                        })
            except (WebSocketDisconnect, Exception):
                pass  # Client disconnected — clean up below

        except Exception as e:
            logger.error(f"WebSocket error: {e}")

        finally:
            # Cancel the streaming task if still running
            if stream_task and not stream_task.done():
                stream_task.cancel()
                try:
                    await stream_task
                except (asyncio.CancelledError, Exception):
                    pass
            logger.info(f"🔌 WebSocket disconnected (session={session_id})")

    @app.get("/api/ws/status")
    async def get_websocket_status():
        """Get WebSocket connection status."""
        return {"status": "ok"}
