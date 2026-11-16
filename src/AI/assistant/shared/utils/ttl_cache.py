"""An in-process cache whose entries expire a fixed time after they are stored."""

from __future__ import annotations

import time


class TtlCache[V]:
    """Values by key, each kept for `ttl_seconds` after it was stored."""

    def __init__(self, ttl_seconds: float) -> None:
        self._ttl_seconds = ttl_seconds
        self._entries: dict[str, tuple[float, V]] = {}

    def get(self, key: str) -> V | None:
        """The value stored for `key`, or None when there is none or it has expired."""
        entry = self._entries.get(key)
        if entry is None:
            return None
        stored_at, value = entry
        if time.monotonic() - stored_at >= self._ttl_seconds:
            return None
        return value

    def put(self, key: str, value: V) -> None:
        self._entries[key] = (time.monotonic(), value)
