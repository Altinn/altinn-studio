import math
import time
from collections import defaultdict, deque
from collections.abc import Callable
from typing import NoReturn

from fastapi import HTTPException, Request

from shared.utils.logging_utils import get_logger

_log = get_logger(__name__)

WINDOW_SECONDS = 60


def _drop_expired_timestamps(hits: deque[float], now: float) -> None:
    cutoff = now - WINDOW_SECONDS
    while hits and hits[0] <= cutoff:
        hits.popleft()


def _reject(hits: deque[float], now: float, requests_per_minute: int) -> NoReturn:
    seconds_until_oldest_expires = WINDOW_SECONDS - (now - hits[0])
    retry_after_seconds = max(1, math.ceil(seconds_until_oldest_expires))
    # The group key can be a username, which the log records must not carry.
    _log.warning(f"Rate limit of {requests_per_minute} per minute exceeded; retry after {retry_after_seconds}s")
    raise HTTPException(
        status_code=429,
        detail=f"Rate limit exceeded. Try again in {retry_after_seconds} seconds.",
        headers={"Retry-After": str(retry_after_seconds)},
    )


class RateLimiter:
    """Sliding-window limit of `requests_per_minute` per `group_key`."""

    def __init__(
        self,
        requests_per_minute: int,
        group_key: str | Callable[[Request], str],
    ):
        self._requests_per_minute = requests_per_minute
        self._group_key_of = group_key if callable(group_key) else lambda _: group_key
        self._hits_per_group: dict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, request: Request) -> None:
        now = time.monotonic()
        group_key = self._group_key_of(request)

        hits = self._hits_per_group[group_key]
        _drop_expired_timestamps(hits, now)
        if len(hits) >= self._requests_per_minute:
            _reject(hits, now, self._requests_per_minute)

        hits.append(now)
