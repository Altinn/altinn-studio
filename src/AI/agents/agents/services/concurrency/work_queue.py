import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

from agents.services.events import AgentEvent, sink
from shared.utils.logging_utils import get_logger
from shared.config import get_config


_log = get_logger(__name__)
_semaphore: asyncio.Semaphore | None = None
_running_count: int = 0
_queued_count: int = 0


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(get_config().MAX_CONCURRENT_WORKFLOWS)
    return _semaphore


@asynccontextmanager
async def acquire_queue_slot(session_id: str) -> AsyncIterator[None]:
    """Queue workflows when more than the max amount of workflows are running simultaneously."""
    global _running_count, _queued_count
    from shared.config import get_config

    cap = get_config().MAX_CONCURRENT_WORKFLOWS
    semaphore = _get_semaphore()

    queued = semaphore.locked()
    if queued:
        _queued_count += 1
        _log.info(
            f"⏳ {session_id} queued — "
            f"{_running_count}/{cap} slots in use, "
            f"{_queued_count} in queue"
        )
        sink.send(AgentEvent(
            type="status",
            session_id=session_id,
            data={
                "message": f"Assistenten betjener andre brukere. Det er {_queued_count} brukere i køen.",
            },
        ))

    async with semaphore:
        if queued:
            _queued_count -= 1
        _running_count += 1
        try:
            _log.info(
                f"▶️ {session_id} started — "
                f"{_running_count}/{cap} tasks running concurrently"
            )
            yield
        finally:
            _running_count -= 1
            _log.info(
                f"⏹️ {session_id} finished — "
                f"{_running_count}/{cap} tasks still running"
            )
