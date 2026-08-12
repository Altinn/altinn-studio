"""Registry for per-app background jobs.

`op_state` handles the two fleet-wide operations (fetch, scan): one at a time,
one global event stream. Upgrades are different — several apps can be upgraded
at once, each needs its own stream, and the result must survive the browser
being closed.

Same publish/subscribe idea as op_state, but keyed by job id: subscribers
replay the job's history on connect, so a late viewer sees the whole run.
Finished jobs stay in memory long enough for the UI to show the result; the
durable record lives in the `upgrade_runs` table.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from typing import Optional

# Finished jobs kept in memory. Beyond this the oldest are dropped — the
# database keeps the real history.
MAX_FINISHED = 200


class Job:
    def __init__(self, kind: str, app_id: str, label: str = "") -> None:
        self.id: str = uuid.uuid4().hex[:12]
        self.kind = kind
        self.app_id = app_id
        self.label = label or app_id
        self.history: list[dict] = []
        self.complete = False
        self.cancelled = False
        self.result: Optional[dict] = None
        self.created_at = time.time()
        self.finished_at = 0.0
        self.run_id: Optional[int] = None
        self._subscribers: list[asyncio.Queue] = []
        self._task: Optional[asyncio.Task] = None

    async def emit(self, event: dict) -> None:
        event.setdefault("app_id", self.app_id)
        event.setdefault("job_id", self.id)
        self.history.append(event)
        if len(self.history) > 5000:
            self.history = self.history[-5000:]
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.unsubscribe(q)

    async def finish(self, result: dict) -> None:
        self.result = result
        self.complete = True
        self.finished_at = time.time()
        # A terminal event so open streams can close cleanly instead of
        # waiting for a keep-alive that never means anything.
        await self.emit({"kind": "done", "message": result.get("summary", "Ferdig"),
                         "outcome": result.get("outcome")})

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=5000)
        for ev in self.history:
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                break
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    def set_task(self, task: asyncio.Task) -> None:
        self._task = task

    def cancel(self) -> bool:
        if self.complete or self._task is None:
            return False
        self.cancelled = True
        self._task.cancel()
        return True

    def status(self) -> dict:
        return {
            "job_id": self.id,
            "kind": self.kind,
            "app_id": self.app_id,
            "label": self.label,
            "running": not self.complete,
            "cancelled": self.cancelled,
            "created_at": self.created_at,
            "finished_at": self.finished_at or None,
            "events": len(self.history),
            "last_message": self.history[-1].get("message", "") if self.history else "",
            "outcome": (self.result or {}).get("outcome"),
            "run_id": self.run_id,
        }


class JobRegistry:
    """Holds live and recently finished jobs, and caps how many run at once.

    The semaphore matters: each upgrade shells out to studioctl and (later)
    dotnet, so an unbounded queue would happily start 600 subprocesses.
    """

    def __init__(self, concurrency: int = 3) -> None:
        self._jobs: dict[str, Job] = {}
        self._order: list[str] = []
        self._sem = asyncio.Semaphore(concurrency)
        self._concurrency = concurrency

    def set_concurrency(self, n: int) -> None:
        # Only affects jobs started after the change; running ones keep their slot.
        if n != self._concurrency:
            self._concurrency = n
            self._sem = asyncio.Semaphore(n)

    @property
    def slot(self) -> asyncio.Semaphore:
        return self._sem

    def create(self, kind: str, app_id: str, label: str = "") -> Job:
        job = Job(kind, app_id, label)
        self._jobs[job.id] = job
        self._order.append(job.id)
        self._prune()
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def active_for_app(self, app_id: str) -> Optional[Job]:
        """An app must never have two upgrades running at once — they would
        fight over the same working tree."""
        for jid in reversed(self._order):
            j = self._jobs.get(jid)
            if j and j.app_id == app_id and not j.complete:
                return j
        return None

    def list(self, limit: int = 50) -> list[dict]:
        out = [self._jobs[j].status() for j in reversed(self._order) if j in self._jobs]
        return out[:limit]

    def _prune(self) -> None:
        finished = [j for j in self._order
                    if j in self._jobs and self._jobs[j].complete]
        while len(finished) > MAX_FINISHED:
            drop = finished.pop(0)
            self._jobs.pop(drop, None)
            try:
                self._order.remove(drop)
            except ValueError:
                pass


registry = JobRegistry()
