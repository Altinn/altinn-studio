"""Bounded-concurrency gate shared by workflow and chat paths."""
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

from agents.services.events import AgentEvent, sink
from shared.utils.logging_utils import get_logger

_log = get_logger(__name__)

# Lazily constructed so the config is read at first use (the loop must exist
# before asyncio.Semaphore is created).
_workflow_semaphore: asyncio.Semaphore | None = None
_running_workflow_count: int = 0
_queued_workflow_count: int = 0


def _get_workflow_semaphore() -> asyncio.Semaphore:
    global _workflow_semaphore
    if _workflow_semaphore is None:
        from shared.config import get_config
        _workflow_semaphore = asyncio.Semaphore(get_config().MAX_CONCURRENT_WORKFLOWS)
    return _workflow_semaphore


@asynccontextmanager
async def acquire_workflow_slot(session_id: str) -> AsyncIterator[None]:
    """Bounded-concurrency gate shared by workflow and chat paths.

    Emits the ▶️ / ⏳ / ⏹️ log lines so concurrency is observable.
    When the slot can't be granted immediately, sends a status event
    so the user sees their queue position.
    """
    global _running_workflow_count, _queued_workflow_count
    from shared.config import get_config

    cap = get_config().MAX_CONCURRENT_WORKFLOWS
    semaphore = _get_workflow_semaphore()

    queued = semaphore.locked()
    if queued:
        _queued_workflow_count += 1
        position_in_queue = _queued_workflow_count
        _log.info(
            f"⏳ {session_id} queued — "
            f"{_running_workflow_count}/{cap} slots in use, "
            f"position {position_in_queue} in queue"
        )
        sink.send(AgentEvent(
            type="status",
            session_id=session_id,
            data={
                "message": f"Assistenten er opptatt med andre brukere. Du er nummer {position_in_queue} i køen.",
            },
        ))

    async with semaphore:
        if queued:
            _queued_workflow_count -= 1
        _running_workflow_count += 1
        try:
            _log.info(
                f"▶️ {session_id} started — "
                f"{_running_workflow_count}/{cap} tasks running concurrently"
            )
            yield
        finally:
            _running_workflow_count -= 1
            _log.info(
                f"⏹️ {session_id} finished — "
                f"{_running_workflow_count}/{cap} tasks still running"
            )
