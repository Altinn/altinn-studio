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
        # A cancel may land between the tool being dispatched and this call.
        # Asking then would emit a prompt the sink suppresses (cancelled
        # session) while we block on an answer that can never come.
        if sink.is_cancelled(session_id):
            log.info("🔐 Permission request skipped for cancelled session %s", session_id)
            return False

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
            # Resolve the shared future so every waiter in the batch sees
            # the same declined outcome and a late answer can't flip it.
            if not pending.future.done():
                pending.future.set_result(False)
                self._emit_resolution(session_id, pending.request_id, granted=False)
            return False
        finally:
            async with self._lock:
                pending.waiters -= 1
                if pending.waiters <= 0:
                    self._pending.pop(session_id, None)

    def cancel_pending(self, session_id: str) -> None:
        """Decline the session's pending prompt (if any) on cancellation.

        Without this, a run blocked in `request()` survives its cancel for
        the full timeout — and because prompts are single-flight per
        session, the NEXT run's write attempt silently joins the stale
        prompt instead of asking the user, hanging it too.
        """
        pending = self._pending.get(session_id)
        if pending is not None and not pending.future.done():
            pending.future.set_result(False)
            log.info(
                "🔐 Pending permission request declined by cancellation for session %s",
                session_id,
            )

    def resolve(self, session_id: str, request_id: str, granted: bool) -> bool:
        """Deliver the user's answer.  Returns False for unknown/stale ids."""
        pending = self._pending.get(session_id)
        if pending is None or pending.request_id != request_id:
            return False
        if pending.future.done():
            # Already timed out (= declined) — reject the late answer.
            return False
        pending.future.set_result(granted)
        self._emit_resolution(session_id, request_id, granted)
        log.info(
            "🔐 Permission %s for session %s",
            "granted" if granted else "declined",
            session_id,
        )
        return True

    @staticmethod
    def _emit_resolution(session_id: str, request_id: str, granted: bool) -> None:
        """Broadcast that the prompt was answered (or timed out).

        Only the tab that answered knows the prompt is gone — every other
        tab showing the run would keep rendering it. Reuses the
        `permission_request` event type with `resolved: true` so no new
        AgentEvent type literal is needed.
        """
        sink.send(
            AgentEvent(
                type="permission_request",
                session_id=session_id,
                data={
                    "request_id": request_id,
                    "resolved": True,
                    "granted": granted,
                },
            )
        )


permission_broker = PermissionBroker()
