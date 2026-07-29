"""Interactive permission escalation for read-only sessions.

When the model calls a write tool in a read-only session, the loop asks
the USER for permission instead of flatly denying: the broker emits a
`permission_request` event (rendered as an inline prompt in the chat),
then blocks until the frontend posts the user's answer back — or the
timeout hits, which counts as declined.

Single-flight per session: a batch of parallel write calls produces ONE
prompt, and every caller shares its outcome.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field

from shared.utils.logging_utils import get_logger

from .events import AgentEvent
from .jobs import sink

log = get_logger(__name__)

PERMISSION_TIMEOUT_SECONDS = 300


@dataclass
class _PendingRequest:
    request_id: str
    future: asyncio.Future
    waiters: int = 1


@dataclass
class PermissionBroker:
    _pending: dict[str, _PendingRequest] = field(default_factory=dict)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def request(self, session_id: str, action_description: str) -> bool:
        """Ask the user to allow changes for this session.

        Emits `permission_request` and awaits the answer.  Concurrent
        callers for the same session share one prompt and one answer.
        Timeout or transport failure resolves to False (declined).
        """
        async with self._lock:
            pending = self._pending.get(session_id)
            if pending is None:
                pending = _PendingRequest(
                    request_id=uuid.uuid4().hex,
                    future=asyncio.get_running_loop().create_future(),
                )
                self._pending[session_id] = pending
                sink.send(
                    AgentEvent(
                        type="permission_request",
                        session_id=session_id,
                        data={
                            "request_id": pending.request_id,
                            "message": action_description,
                        },
                    )
                )
                log.info(
                    "🔐 Permission requested for session %s (%s)",
                    session_id,
                    action_description,
                )
            else:
                pending.waiters += 1

        try:
            return await asyncio.wait_for(
                asyncio.shield(pending.future), timeout=PERMISSION_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            log.info("🔐 Permission request timed out for session %s", session_id)
            return False
        finally:
            async with self._lock:
                pending.waiters -= 1
                if pending.waiters <= 0:
                    self._pending.pop(session_id, None)

    def resolve(self, session_id: str, request_id: str, granted: bool) -> bool:
        """Deliver the user's answer.  Returns False for unknown/stale ids."""
        pending = self._pending.get(session_id)
        if pending is None or pending.request_id != request_id:
            return False
        if not pending.future.done():
            pending.future.set_result(granted)
        log.info(
            "🔐 Permission %s for session %s",
            "granted" if granted else "declined",
            session_id,
        )
        return True


permission_broker = PermissionBroker()
