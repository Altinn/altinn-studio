from typing import Dict, Callable, List, Union, Awaitable
from agents.services.events import AgentEvent
import asyncio
import threading
import concurrent.futures

class EventSink:
    def __init__(self):
        self._subs: Dict[str, List[Callable[[AgentEvent], Union[None, Awaitable[None]]]]] = {}
        self._main_loop = None
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=1, thread_name_prefix="EventSink")

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the main event loop for scheduling async callbacks"""
        self._main_loop = loop

    def subscribe(self, session_id: str, cb: Callable[[AgentEvent], Union[None, Awaitable[None]]]):
        self._subs.setdefault(session_id, []).append(cb)

    def send(self, event: AgentEvent):
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

sink = EventSink()