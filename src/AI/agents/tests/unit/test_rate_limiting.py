from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException, Request

from agents.services import rate_limiting
from agents.services.rate_limiting import RateLimiter

WINDOW_SECONDS = rate_limiting.WINDOW_SECONDS


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
    with patch("agents.services.rate_limiting.time", fake_clock):
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
    await call_n_times(limiter, "alice", 5)  # should not raise


async def test_rejects_the_request_that_exceeds_the_limit(clock):
    limiter = make_limiter(requests_per_minute=5)
    await call_n_times(limiter, "alice", 5)
    with pytest.raises(HTTPException) as exc_info:
        await limiter(request_from("alice"))

    assert exc_info.value.status_code == 429


async def test_rejection_includes_a_retry_after_header(clock):
    limiter = make_limiter(requests_per_minute=1)
    await limiter(request_from("alice"))
    with pytest.raises(HTTPException) as exc_info:
        await limiter(request_from("alice"))

    assert int(exc_info.value.headers["Retry-After"]) == WINDOW_SECONDS


async def test_keys_are_limited_independently(clock):
    limiter = make_limiter(requests_per_minute=2)
    await call_n_times(limiter, "alice", 2)
    await call_n_times(limiter, "bob", 2)  # bob has his own budget, should not raise


async def test_a_constant_string_key_makes_all_requests_share_one_bucket(clock):
    limiter = RateLimiter(requests_per_minute=2, group_key="all")
    await limiter(request_from("alice"))
    await limiter(request_from("bob"))
    with pytest.raises(HTTPException) as exc_info:
        await limiter(request_from("carol"))

    assert exc_info.value.status_code == 429


async def test_requests_are_allowed_again_after_the_window_passes(clock):
    limiter = make_limiter(requests_per_minute=2)
    await call_n_times(limiter, "alice", 2)
    clock.advance(WINDOW_SECONDS + 1)
    await call_n_times(limiter, "alice", 2)  # window cleared, should not raise


async def test_rejected_requests_are_not_counted(clock):
    limiter = make_limiter(requests_per_minute=1)
    await limiter(request_from("alice"))  # t=0, only hit that counts
    clock.advance(30)
    with pytest.raises(HTTPException) as first_rejection:
        await limiter(request_from("alice"))
    clock.advance(20)
    with pytest.raises(HTTPException) as second_rejection:
        await limiter(request_from("alice"))

    # Retry-After counts down toward the single stored hit expiring at t=60,
    # proving the rejected calls at t=30 and t=50 were not recorded.
    assert int(first_rejection.value.headers["Retry-After"]) == 30
    assert int(second_rejection.value.headers["Retry-After"]) == 10
