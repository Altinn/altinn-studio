from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException, Request

from api.rate_limiting import RateLimiter, WINDOW_SECONDS


class FakeClock:
    """Controllable monotonic clock so window expiry is deterministic in tests."""

    def __init__(self, start: float = 1000.0):
        self.now = start

    def monotonic(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def clock():
    fake_clock = FakeClock()
    with patch("api.rate_limiting.time", fake_clock):
        yield fake_clock


def request_from(developer: str) -> Mock:
    request = Mock()
    request.headers = {"developer": developer}
    return request


def _developer_from_headers(request: Request) -> str:
    return request.headers["developer"]


def make_limiter(requests_per_minute: int) -> RateLimiter:
    return RateLimiter(requests_per_minute, group_key=_developer_from_headers)


async def call_n_times(limiter: RateLimiter, developer: str, count: int) -> None:
    for _ in range(count):
        await limiter(request_from(developer))


async def test_allows_requests_up_to_the_limit(clock):
    limiter = make_limiter(requests_per_minute=5)
    await call_n_times(limiter, "kari", 5)


async def test_rejects_the_request_that_exceeds_the_limit(clock):
    limiter = make_limiter(requests_per_minute=5)
    await call_n_times(limiter, "kari", 5)
    with pytest.raises(HTTPException) as exc_info:
        await limiter(request_from("kari"))

    assert exc_info.value.status_code == 429


async def test_rejection_includes_a_retry_after_header(clock):
    limiter = make_limiter(requests_per_minute=1)
    await limiter(request_from("kari"))
    with pytest.raises(HTTPException) as exc_info:
        await limiter(request_from("kari"))

    assert int(exc_info.value.headers["Retry-After"]) == WINDOW_SECONDS


async def test_keys_are_limited_independently(clock):
    limiter = make_limiter(requests_per_minute=2)
    await call_n_times(limiter, "kari", 2)
    await call_n_times(limiter, "ola", 2)


async def test_a_constant_string_key_makes_all_requests_share_one_bucket(clock):
    limiter = RateLimiter(requests_per_minute=2, group_key="all")
    await limiter(request_from("kari"))
    await limiter(request_from("ola"))
    with pytest.raises(HTTPException) as exc_info:
        await limiter(request_from("lise"))

    assert exc_info.value.status_code == 429


async def test_requests_are_allowed_again_after_the_window_passes(clock):
    limiter = make_limiter(requests_per_minute=2)
    await call_n_times(limiter, "kari", 2)
    clock.advance(WINDOW_SECONDS + 1)
    await call_n_times(limiter, "kari", 2)

