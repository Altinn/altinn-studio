from typing import Dict, Callable, List, Union, Awaitable, Optional, Any
from .events import AgentEvent
import asyncio
import threading
import concurrent.futures
from datetime import datetime

class EventSink:
    def __init__(self):
        self._subs: Dict[str, List[Callable[[AgentEvent], Union[None, Awaitable[None]]]]] = {}
        self._main_loop = None
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=1, thread_name_prefix="EventSink")
        # Track session completion status for reconnection scenarios
        self._session_status: Dict[str, Dict[str, Any]] = {}

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the main event loop for scheduling async callbacks"""
        self._main_loop = loop

    def subscribe(self, session_id: str, cb: Callable[[AgentEvent], Union[None, Awaitable[None]]]):
        self._subs.setdefault(session_id, []).append(cb)

    def send(self, event: AgentEvent):
        # Track assistant_message for reconnection scenarios
        if event.type == "assistant_message":
            if event.session_id not in self._session_status:
                self._session_status[event.session_id] = {"status": "running"}
            self._session_status[event.session_id]["last_message"] = event.data
        
        # Track completion status for "done" events
        if event.type == "done":
            existing = self._session_status.get(event.session_id, {})
            self._session_status[event.session_id] = {
                "status": "done",
                "success": event.data.get("success", True),
                "completed_at": datetime.utcnow().isoformat(),
                "data": event.data,
                "last_message": existing.get("last_message"),  # Preserve the assistant message
            }
        
        for cb in self._subs.get(event.session_id, []):
            try:
                result = cb(event)
                # If callback is async, schedule it properly
                if asyncio.iscoroutine(result):
                    try:
                        # Try to get the running loop
                        loop = asyncio.get_running_loop()
                        loop.create_task(result)
                    except RuntimeError:
                        # No running loop in this thread
                        if self._main_loop and not self._main_loop.is_closed():
                            # Schedule on the main loop from another thread
                            asyncio.run_coroutine_threadsafe(result, self._main_loop)
                        else:
                            # Silently drop the event - no way to deliver it
                            # This prevents the RuntimeWarning spam
                            pass
            except Exception as e:
                # Log errors but don't spam the console
                pass
    
    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get the completion status of a session. Returns None if session not found or still running."""
        return self._session_status.get(session_id)
    
    def mark_session_started(self, session_id: str):
        """Mark a session as started/running."""
        self._session_status[session_id] = {
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
        }

sink = EventSink()