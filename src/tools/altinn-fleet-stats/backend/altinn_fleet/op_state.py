"""Shared state for long-running fetch/scan operations.

Operations run as background asyncio tasks. SSE subscribers attach to a
publish/subscribe channel and replay history when they connect — so a browser
refresh doesn't kill the running operation, and the new tab picks up where
we left off.
"""
from __future__ import annotations

import asyncio
import time
from typing import Optional


class OperationState:
    def __init__(self) -> None:
        self.kind: Optional[str] = None
        self.history: list[dict] = []
        self.complete: bool = True
        self.started_at: float = 0.0
        self.finished_at: float = 0.0
        self._subscribers: list[asyncio.Queue] = []
        self._start_lock = asyncio.Lock()
        self._task: Optional[asyncio.Task] = None

    async def try_start(self, kind: str) -> bool:
        """Returns False if another operation is already running.

        Existing subscribers are preserved so SSE clients that connected
        before the operation started receive its events.
        """
        async with self._start_lock:
            if not self.complete:
                return False
            self.kind = kind
            self.history = []
            self.complete = False
            self.started_at = time.time()
            self.finished_at = 0.0
            return True

    async def emit(self, event: dict) -> None:
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
            try:
                self._subscribers.remove(q)
            except ValueError:
                pass

    async def finish(self) -> None:
        self.complete = True
        self.finished_at = time.time()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=5000)
        # Replay accumulated history so a late subscriber sees the full picture
        for ev in self.history:
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                break
        # Always add to subscribers so events from a *future* operation
        # also flow to this connection. Without this, opening the SSE
        # stream before clicking Re-analyser meant the subscription was
        # silently dropped and progress never showed up.
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    def status(self) -> dict:
        return {
            "running": not self.complete,
            "kind": self.kind,
            "history_size": len(self.history),
            "started_at": self.started_at or None,
            "finished_at": self.finished_at or None,
            "last_message": self.history[-1].get("message", "") if self.history else "",
        }

    def set_task(self, task: asyncio.Task) -> None:
        self._task = task


op_state = OperationState()
