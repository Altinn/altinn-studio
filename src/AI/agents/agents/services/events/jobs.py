from typing import Dict, List, Optional, Any
from .events import AgentEvent
import asyncio
import logging
import threading
from datetime import datetime, timezone

log = logging.getLogger(__name__)


class _SessionBuffer:
    """Thread-safe event buffer for a single session with async notification."""

    def __init__(self):
        self.events: List[AgentEvent] = []
        self._lock = threading.Lock()
        self._notify: Optional[asyncio.Event] = None
        self._main_loop: Optional[asyncio.AbstractEventLoop] = None

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        self._main_loop = loop

    def append(self, event: AgentEvent):
        with self._lock:
            self.events.append(event)
        self._signal()

    def get_events_since(self, index: int) -> List[AgentEvent]:
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
        except asyncio.TimeoutError:
            return False


class EventSink:
    """Central event bus.

    Design:
    - Every event is appended to a per-session buffer (thread-safe).
    - Every event is also appended to a per-developer buffer so that the
      WebSocket can stream all events for a developer regardless of which
      session is currently active.
    - WebSocket consumers read from the developer buffer at their own pace.
    - No callbacks, no stale references, full reconnection support.
    """

    def __init__(self):
        self._buffers: Dict[str, _SessionBuffer] = {}
        self._developer_buffers: Dict[str, _SessionBuffer] = {}
        self._buf_lock = threading.Lock()
        self._state_lock = threading.Lock()  # Protects _session_status, _cancelled, _conversation_history
        self._main_loop: Optional[asyncio.AbstractEventLoop] = None
        self._session_status: Dict[str, Dict[str, Any]] = {}
        self._conversation_history: Dict[str, List[Dict[str, Any]]] = {}
        self._cancelled: set = set()
        self._session_to_developer: Dict[str, str] = {}  # Maps session_id -> developer

    # --- lifecycle ------------------------------------------------------------

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the main event loop (called once at startup)."""
        self._main_loop = loop
        with self._buf_lock:
            for buf in self._buffers.values():
                buf.set_main_loop(loop)
            for buf in self._developer_buffers.values():
                buf.set_main_loop(loop)

    def register_developer_session(self, developer: str, session_id: str):
        """Associate a session with a developer so events fan out to the developer buffer."""
        with self._buf_lock:
            self._session_to_developer[session_id] = developer
            if developer not in self._developer_buffers:
                buf = _SessionBuffer()
                if self._main_loop:
                    buf.set_main_loop(self._main_loop)
                self._developer_buffers[developer] = buf
        log.info(f"🔗 Registered session {session_id} -> developer {developer}")

    # --- event publishing (called from any thread) ----------------------------

    def send(self, event: AgentEvent):
        """Append *event* to the session buffer and the developer buffer. Thread-safe."""
        log.info(f"📨 EventSink.send: type={event.type}, session={event.session_id}")

        # Update session status cache
        with self._state_lock:
            if event.type == "assistant_message":
                self._session_status.setdefault(event.session_id, {"status": "running"})
                self._session_status[event.session_id]["last_message"] = event.data
            elif event.type == "done":
                existing = self._session_status.get(event.session_id, {})
                self._session_status[event.session_id] = {
                    "status": "done",
                    "success": event.data.get("success", True),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "data": event.data,
                    "last_message": existing.get("last_message"),
                }

        buf = self._get_or_create_buffer(event.session_id)
        buf.append(event)

        # Also fan out to the developer-scoped buffer
        with self._buf_lock:
            developer = self._session_to_developer.get(event.session_id)
            dev_buf = self._developer_buffers.get(developer) if developer else None
        if dev_buf is not None:
            dev_buf.append(event)

    # --- event consumption (called from WebSocket handler) --------------------

    def get_events_since(self, session_id: str, index: int) -> List[AgentEvent]:
        """Return events for *session_id* from *index* onward."""
        buf = self._buffers.get(session_id)
        if buf is None:
            return []
        return buf.get_events_since(index)

    def event_count(self, session_id: str) -> int:
        """Return total number of buffered events for *session_id*."""
        buf = self._buffers.get(session_id)
        return len(buf) if buf else 0

    async def wait_for_events(self, session_id: str, known_count: int, timeout: float = 30.0) -> bool:
        """Block (async) until buffer has more than *known_count* events, or timeout."""
        buf = self._get_or_create_buffer(session_id)
        return await buf.wait_for_new(known_count, timeout)

    def get_developer_events_since(self, developer: str, index: int) -> List[AgentEvent]:
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

    # --- legacy subscribe (kept for backward compat, now a no-op) -------------

    def subscribe(self, session_id: str, cb):
        """No-op — kept so existing callers don't break.

        WebSocket delivery is now handled by the buffer-polling model.
        """
        pass

    # --- session status -------------------------------------------------------

    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get the completion status of a session."""
        with self._state_lock:
            return self._session_status.get(session_id)

    def mark_session_started(self, session_id: str):
        """Mark a session as started/running."""
        with self._state_lock:
            self._cancelled.discard(session_id)
            self._session_status[session_id] = {
                "status": "running",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        # Pre-create the buffer so events can be buffered immediately
        self._get_or_create_buffer(session_id)

    # --- cancellation ---------------------------------------------------------

    def cancel_session(self, session_id: str):
        """Cancel a running session. Sends a terminal event so the frontend stops loading."""
        log.info(f"🛑 Cancelling session {session_id}")
        with self._state_lock:
            self._cancelled.add(session_id)
            self._session_status[session_id] = {
                "status": "cancelled",
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
            }
        self.send(AgentEvent(
            type="error",
            session_id=session_id,
            data={
                "done": True,
                "success": False,
                "status": "cancelled",
                "message": "Workflow cancelled by user",
            },
        ))

    def is_cancelled(self, session_id: str) -> bool:
        """Check if a session has been cancelled."""
        with self._state_lock:
            return session_id in self._cancelled

    # --- conversation history -------------------------------------------------

    def add_to_conversation_history(
        self, session_id: str, role: str, content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
    ):
        """Add a message to the conversation history for a session."""
        with self._state_lock:
            if session_id not in self._conversation_history:
                self._conversation_history[session_id] = []
            message: Dict[str, Any] = {
                "role": role,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            if sources:
                message["sources"] = sources
            self._conversation_history[session_id].append(message)

    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get the conversation history for a session."""
        with self._state_lock:
            return list(self._conversation_history.get(session_id, []))

    def clear_conversation_history(self, session_id: str):
        """Clear the conversation history for a session."""
        with self._state_lock:
            self._conversation_history.pop(session_id, None)

    # --- internals ------------------------------------------------------------

    def _get_or_create_buffer(self, session_id: str) -> _SessionBuffer:
        with self._buf_lock:
            if session_id not in self._buffers:
                buf = _SessionBuffer()
                if self._main_loop:
                    buf.set_main_loop(self._main_loop)
                self._buffers[session_id] = buf
            return self._buffers[session_id]


sink = EventSink()