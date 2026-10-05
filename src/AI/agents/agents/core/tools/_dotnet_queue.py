"""One .NET job at a time in the pod.

The v9 upgrade and `dotnet build` each need several hundred MiB, and the pod has a memory limit of
1350Mi. A build of an app with an empty NuGet cache needs up to 450 MiB.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager


class DotnetJobQueue:
    """Runs one .NET job at a time and tells waiting users their place in the queue."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._jobs_in_progress = 0

    @asynccontextmanager
    async def turn(
        self,
        report_status: Callable[[str], None],
        *,
        waiting_status: str,
        running_status: str,
    ) -> AsyncIterator[None]:
        jobs_ahead = self._jobs_in_progress
        self._jobs_in_progress += 1
        try:
            if jobs_ahead:
                report_status(f"{waiting_status} ({jobs_ahead} foran)")
            async with self._lock:
                if jobs_ahead:
                    report_status(running_status)
                yield
        finally:
            self._jobs_in_progress -= 1


dotnet_job_queue = DotnetJobQueue()
