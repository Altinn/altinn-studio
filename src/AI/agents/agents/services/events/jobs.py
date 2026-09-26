import asyncio
import logging
import threading
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from .events import AgentEvent

log = logging.getLogger(__name__)

# Event types that only narrate an in-flight run. Once a session is cancelled
# these must not reach clients: the terminal "cancelled" error event has
# already been sent, and a trailing status/permission event would resurrect
# the workflow activity indicator in the frontend with nothing left to turn
# it off. Result-bearing events (assistant_message, error, done) still flow.
PROGRESS_EVENT_TYPES = frozenset({"status", "assistant_message_chunk", "permission_request", "plan_proposed"})


class _EventBuffer:
    """Thread-safe event buffer for a single developer with async notification."""

    def __init__(self):
        self.events: list[AgentEvent] = []
        self._lock = threading.Lock()
        self._notify: asyncio.Event | None = None
        self._main_loop: asyncio.AbstractEventLoop | None = None

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        self._main_loop = loop

    def append(self, event: AgentEvent):
        with self._lock:
            self.events.append(event)
        self._signal()

    def get_events_since(self, index: int) -> list[AgentEvent]:
        """Return events from *index* onward (thread-safe snapshot)."""
        with self._lock:
            return list(self.events[index:])

    def __len__(self):
        with self._lock:
            return len(self.events)

    # --- async notification ---------------------------------------------------

    def _signal(self):
        """Set the asyncio.Event so any waiter wakes up. Thread-safe."""
        if self._notify is not None and self._main_loop and not self._main_loop.is_closed():
            self._main_loop.call_soon_threadsafe(self._notify.set)

    async def wait_for_new(self, known_count: int, timeout: float = 30.0) -> bool:
        """Wait until the buffer has more than *known_count* events, or timeout.

        This is race-free: if events arrived between the caller's last read and
        this call, we return immediately without waiting.
        """
        with self._lock:
            # Fast path — events already available
            if len(self.events) > known_count:
                return True
            # Create/clear the event while holding the lock so that a
            # concurrent _signal() cannot set-then-lose the notification.
            if self._notify is None:
                self._notify = asyncio.Event()
            self._notify.clear()

        try:
            await asyncio.wait_for(self._notify.wait(), timeout=timeout)
            return True
        except TimeoutError:
            return False


class EventSink:
    """Central event bus.

    Design:
    - Every event is appended to the buffer of the developer that owns the
      session (thread-safe). The WebSocket can then stream all events for a
      developer regardless of which session is currently active.
    - WebSocket consumers read from the developer buffer at their own pace.
    - No callbacks, no stale references, full reconnection support.
    """

    def __init__(self):
        self._developer_buffers: dict[str, _EventBuffer] = {}
        self._buf_lock = threading.Lock()
        # Reentrant so a caller can hold it across send()/add_to_conversation_history().
        self._state_lock = threading.RLock()  # Protects _session_status, _cancelled, _conversation_history
        self._main_loop: asyncio.AbstractEventLoop | None = None
        self._session_status: dict[str, dict[str, Any]] = {}
        self._conversation_history: dict[str, list[dict[str, Any]]] = {}
        self._cancelled: set = set()
        # Monotonic run-start timestamps, used to stamp elapsed_ms on status
        # events so every tab (including ones that adopt an in-flight run
        # mid-way) can show trail timers relative to the actual run start.
        self._session_started_monotonic: dict[str, float] = {}
        self._session_to_developer: dict[str, str] = {}  # Maps session_id -> developer

    # --- lifecycle ------------------------------------------------------------

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the main event loop (called once at startup)."""
        self._main_loop = loop
        with self._buf_lock:
            for buf in self._developer_buffers.values():
                buf.set_main_loop(loop)

    def get_session_developer(self, session_id: str) -> str | None:
        """Return the developer associated with *session_id*, or None."""
        with self._buf_lock:
            return self._session_to_developer.get(session_id)

    def register_developer_session(self, developer: str, session_id: str):
        """Associate a session with a developer so events fan out to the developer buffer."""
        with self._buf_lock:
            self._session_to_developer[session_id] = developer
            if developer not in self._developer_buffers:
                buf = _EventBuffer()
                if self._main_loop:
                    buf.set_main_loop(self._main_loop)
                self._developer_buffers[developer] = buf
        log.info(f"🔗 Registered session {session_id} -> developer {developer}")

    # --- event publishing (called from any thread) ----------------------------

    def send(self, event: AgentEvent):
        """Append *event* to the developer buffer of its session. Thread-safe."""
        log.info(f"📨 EventSink.send: type={event.type}, session={event.session_id}")

        # Update session status cache
        with self._state_lock:
            if event.type in PROGRESS_EVENT_TYPES and event.session_id in self._cancelled:
                log.info(f"🛑 Dropping {event.type} for cancelled session {event.session_id}")
                return
            if event.type == "status":
                started = self._session_started_monotonic.get(event.session_id)
                if started is not None:
                    event.data.setdefault("elapsed_ms", int((time.monotonic() - started) * 1000))
            if event.type == "assistant_message":
                event.data.setdefault("eventId", uuid.uuid4().hex)
                self._session_status.setdefault(event.session_id, {"status": "running"})
                self._session_status[event.session_id]["last_message"] = event.data
            elif event.type == "done":
                existing = self._session_status.get(event.session_id, {})
                self._session_status[event.session_id] = {
                    "status": "done",
                    "success": event.data.get("success", True),
                    "completed_at": datetime.now(UTC).isoformat(),
                    "data": event.data,
                    "last_message": existing.get("last_message"),
                }

            # A cancel landing after the check would order this event last.
            with self._buf_lock:
                developer = self._session_to_developer.get(event.session_id)
                dev_buf = self._developer_buffers.get(developer) if developer else None
            if dev_buf is not None:
                dev_buf.append(event)

    # --- event consumption (called from WebSocket handler) --------------------

    def get_developer_events_since(self, developer: str, index: int) -> list[AgentEvent]:
        """Return all events for *developer* from *index* onward."""
        with self._buf_lock:
            buf = self._developer_buffers.get(developer)
        if buf is None:
            return []
        return buf.get_events_since(index)

    def developer_event_count(self, developer: str) -> int:
        """Return total number of buffered events for *developer*."""
        with self._buf_lock:
            buf = self._developer_buffers.get(developer)
        return len(buf) if buf else 0

    async def wait_for_developer_events(self, developer: str, known_count: int, timeout: float = 30.0) -> bool:
        """Block (async) until developer buffer has more than *known_count* events, or timeout."""
        with self._buf_lock:
            buf = self._developer_buffers.get(developer)
        if buf is None:
            await asyncio.sleep(min(timeout, 1.0))
            return False
        return await buf.wait_for_new(known_count, timeout)

    # --- session status -------------------------------------------------------

    def get_session_status(self, session_id: str) -> dict[str, Any] | None:
        """Get the completion status of a session."""
        with self._state_lock:
            return self._session_status.get(session_id)

    def mark_session_started(self, session_id: str):
        """Mark a session as started/running."""
        with self._state_lock:
            self._cancelled.discard(session_id)
            self._session_started_monotonic[session_id] = time.monotonic()
            self._session_status[session_id] = {
                "status": "running",
                "started_at": datetime.now(UTC).isoformat(),
            }

    # --- cancellation ---------------------------------------------------------

    def cancel_session(self, session_id: str):
        """Cancel a running session. Sends a terminal event so the frontend stops loading."""
        log.info(f"🛑 Cancelling session {session_id}")
        with self._state_lock:
            self._cancelled.add(session_id)
            self._session_status[session_id] = {
                "status": "cancelled",
                "cancelled_at": datetime.now(UTC).isoformat(),
            }
        self.send(
            AgentEvent(
                type="error",
                session_id=session_id,
                data={
                    "done": True,
                    "success": False,
                    "status": "cancelled",
                    "message": "Workflow cancelled by user",
                },
            )
        )

    def deliver_unless_cancelled(
        self,
        session_id: str,
        events: list[AgentEvent],
        history: tuple | None = None,
    ) -> bool:
        """Deliver events and history as one unit, or nothing at all.

        Holding the state lock for the whole delivery stops a cancel landing
        between an assistant_message and its terminal status, which would
        leave the message delivered and the status dropped.
        """
        with self._state_lock:
            if session_id in self._cancelled:
                log.info(f"🛑 Skipping delivery for cancelled session {session_id}")
                return False
            for event in events:
                self.send(event)
            if history:
                try:
                    self.add_to_conversation_history(session_id, *history)
                except Exception:
                    log.warning("Could not store the message in conversation history", exc_info=True)
        return True

    def is_cancelled(self, session_id: str) -> bool:
        """Check if a session has been cancelled."""
        with self._state_lock:
            return session_id in self._cancelled

    # --- conversation history -------------------------------------------------

    def add_to_conversation_history(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: list[dict[str, Any]] | None = None,
    ):
        """Add a message to the conversation history for a session."""
        with self._state_lock:
            if session_id not in self._conversation_history:
                self._conversation_history[session_id] = []
            message: dict[str, Any] = {
                "role": role,
                "content": content,
                "timestamp": datetime.now(UTC).isoformat(),
            }
            if sources:
                message["sources"] = sources
            self._conversation_history[session_id].append(message)

    def get_conversation_history(self, session_id: str) -> list[dict[str, Any]]:
        """Get the conversation history for a session."""
        with self._state_lock:
            return list(self._conversation_history.get(session_id, []))


sink = EventSink()
