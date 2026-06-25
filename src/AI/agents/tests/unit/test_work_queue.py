import asyncio
from contextlib import contextmanager
from unittest.mock import Mock, patch

import pytest

from agents.services.concurrency import work_queue
from agents.services.concurrency.work_queue import acquire_queue_slot


@pytest.fixture(autouse=True)
def reset_module_state():
    """Reset the module-level globals so tests don't leak state into each other."""
    work_queue._semaphore = None
    work_queue._running_count = 0
    work_queue._queued_count = 0
    yield
    work_queue._semaphore = None
    work_queue._running_count = 0
    work_queue._queued_count = 0


@contextmanager
def configured_cap(max_concurrent_workflows: int):
    """Patch the config so the semaphore is sized to *max_concurrent_workflows*."""
    mock_config = Mock()
    mock_config.MAX_CONCURRENT_WORKFLOWS = max_concurrent_workflows
    with patch(
        "agents.services.concurrency.work_queue.get_config",
        return_value=mock_config,
    ), patch("shared.config.get_config", return_value=mock_config):
        yield


@pytest.fixture
def mock_sink():
    with patch("agents.services.concurrency.work_queue.sink") as sink:
        yield sink


def status_messages(mock_sink) -> list[str]:
    """Extract the human-readable message from each status event sent to the sink."""
    return [
        call.args[0].data["message"]
        for call in mock_sink.send.call_args_list
        if call.args[0].type == "status"
    ]


async def _hold_slot(session_id: str, acquired: asyncio.Event, release: asyncio.Event):
    """Acquire a slot, signal *acquired*, then hold it until *release* is set."""
    async with acquire_queue_slot(session_id):
        acquired.set()
        await release.wait()


class TestSlotAvailable:
    """When a slot is free the workflow runs immediately without notifying the user."""

    async def test_no_status_event_sent_when_not_queued(self, mock_sink):
        with configured_cap(1):
            async with acquire_queue_slot("session-a"):
                pass
        mock_sink.send.assert_not_called()

    async def test_running_count_tracks_active_workflow(self, mock_sink):
        with configured_cap(1):
            async with acquire_queue_slot("session-a"):
                assert work_queue._running_count == 1
            assert work_queue._running_count == 0

    async def test_concurrent_workflows_within_cap_both_run(self, mock_sink):
        with configured_cap(2):
            acquired = asyncio.Event()
            release = asyncio.Event()
            holder = asyncio.create_task(_hold_slot("session-a", acquired, release))
            await acquired.wait()

            async with acquire_queue_slot("session-b"):
                assert work_queue._running_count == 2

            release.set()
            await holder

        # Second workflow ran while the first held a slot - nothing was queued
        assert status_messages(mock_sink) == []


class TestQueuing:
    """When the cap is reached, further workflows queue and the user is notified."""

    async def test_queued_count_tracks_waiting_request(self, mock_sink):
        with configured_cap(1):
            acquired = asyncio.Event()
            release = asyncio.Event()
            holder = asyncio.create_task(_hold_slot("session-a", acquired, release))
            await acquired.wait()

            queued = asyncio.create_task(_hold_slot("session-b", asyncio.Event(), release))
            await asyncio.sleep(0)  # let session-b reach the queued branch

            assert work_queue._queued_count == 1

            release.set()
            await asyncio.gather(holder, queued)

        assert work_queue._queued_count == 0

    async def test_queue_message_reflects_number_of_waiting_users(self, mock_sink):
        with configured_cap(1):
            acquired = asyncio.Event()
            release = asyncio.Event()
            holder = asyncio.create_task(_hold_slot("session-a", acquired, release))
            await acquired.wait()

            first_queued = asyncio.create_task(_hold_slot("session-b", asyncio.Event(), release))
            await asyncio.sleep(0)
            second_queued = asyncio.create_task(_hold_slot("session-c", asyncio.Event(), release))
            await asyncio.sleep(0)

            assert status_messages(mock_sink) == [
                "Assistenten betjener andre brukere. Det er 1 brukere i køen.",
                "Assistenten betjener andre brukere. Det er 2 brukere i køen.",
            ]

            release.set()
            await asyncio.gather(holder, first_queued, second_queued)

    async def test_queued_request_proceeds_after_slot_released(self, mock_sink):
        with configured_cap(1):
            acquired = asyncio.Event()
            release_holder = asyncio.Event()
            holder = asyncio.create_task(_hold_slot("session-a", acquired, release_holder))
            await acquired.wait()

            queued_acquired = asyncio.Event()
            release_queued = asyncio.Event()
            queued = asyncio.create_task(
                _hold_slot("session-b", queued_acquired, release_queued)
            )
            await asyncio.sleep(0)
            assert not queued_acquired.is_set()  # still waiting for the slot

            release_holder.set()
            await asyncio.wait_for(queued_acquired.wait(), timeout=1.0)

            release_queued.set()
            await asyncio.gather(holder, queued)


class TestSlotRelease:
    """The slot must always be released, so a failed workflow doesn't leak capacity."""

    async def test_running_count_decremented_when_body_raises(self, mock_sink):
        with configured_cap(1):
            with pytest.raises(ValueError):
                async with acquire_queue_slot("session-a"):
                    raise ValueError("workflow failed")
        assert work_queue._running_count == 0

    async def test_slot_reusable_after_body_raises(self, mock_sink):
        with configured_cap(1):
            with pytest.raises(ValueError):
                async with acquire_queue_slot("session-a"):
                    raise ValueError("workflow failed")

            # A previously exhausted cap should be free again - no queuing
            async with acquire_queue_slot("session-b"):
                pass
        assert status_messages(mock_sink) == []


class TestSemaphore:
    def test_semaphore_is_created_once(self):
        with configured_cap(5):
            first = work_queue._get_semaphore()
            second = work_queue._get_semaphore()
        assert first is second
