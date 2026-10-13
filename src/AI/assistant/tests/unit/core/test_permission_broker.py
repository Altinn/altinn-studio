"""Tests for the PermissionBroker — the bridge between an escalatable
tool denial and the user's inline consent prompt.

Unlike the loop tests (which inject a fake requester), these exercise the
real broker, including construction of the actual `permission_request`
AgentEvent — a pydantic model whose `type` literal must accept it.
"""

import asyncio

import pytest

from agents.services.events.permissions import PermissionBroker


class _RecordingSink:
    def __init__(self):
        self.events = []
        self.cancelled = set()

    def send(self, event):
        self.events.append(event)

    def is_cancelled(self, session_id):
        return session_id in self.cancelled


@pytest.fixture
def sink(monkeypatch) -> _RecordingSink:
    recorder = _RecordingSink()
    monkeypatch.setattr("agents.services.events.permissions.sink", recorder)
    return recorder


async def test_request_emits_permission_request_event_and_resolves_grant(sink):
    broker = PermissionBroker()

    task = asyncio.create_task(broker.request("sess-1", "edit_file: App/ui/Side1.json"))
    await asyncio.sleep(0)

    assert len(sink.events) == 1
    event = sink.events[0]
    assert event.type == "permission_request"
    assert event.session_id == "sess-1"
    assert event.data["message"] == "edit_file: App/ui/Side1.json"

    assert broker.resolve("sess-1", event.data["request_id"], granted=True) is True
    assert await task is True


async def test_decline_resolves_false(sink):
    broker = PermissionBroker()

    task = asyncio.create_task(broker.request("sess-1", "write_file: App/models/model.xsd"))
    await asyncio.sleep(0)

    request_id = sink.events[0].data["request_id"]
    assert broker.resolve("sess-1", request_id, granted=False) is True
    assert await task is False


async def test_resolve_broadcasts_resolution_so_other_tabs_dismiss_the_prompt(sink):
    broker = PermissionBroker()

    task = asyncio.create_task(broker.request("sess-1", "edit_file: Side1.json"))
    await asyncio.sleep(0)

    request_id = sink.events[0].data["request_id"]
    broker.resolve("sess-1", request_id, granted=True)
    await task

    resolution = sink.events[-1]
    assert resolution.type == "permission_request"
    assert resolution.data == {"request_id": request_id, "resolved": True, "granted": True}


async def test_cancel_pending_declines_a_waiting_request(sink):
    """Cancelling the session must wake a run blocked on the prompt —
    otherwise it survives until the prompt timeout, and the next run's
    write attempt silently joins the stale single-flight prompt."""
    broker = PermissionBroker()

    task = asyncio.create_task(broker.request("sess-1", "edit_file: Side1.json"))
    await asyncio.sleep(0)

    broker.cancel_pending("sess-1")

    assert await task is False


async def test_request_for_cancelled_session_declines_without_prompting(sink):
    broker = PermissionBroker()
    sink.cancelled.add("sess-1")

    result = await broker.request("sess-1", "edit_file: Side1.json")

    assert result is False
    assert sink.events == []


async def test_stale_or_unknown_request_id_is_rejected(sink):
    broker = PermissionBroker()

    task = asyncio.create_task(broker.request("sess-1", "edit_file: App/ui/Side1.json"))
    await asyncio.sleep(0)

    assert broker.resolve("sess-1", "not-the-request-id", granted=True) is False
    assert broker.resolve("other-session", sink.events[0].data["request_id"], granted=True) is False

    broker.resolve("sess-1", sink.events[0].data["request_id"], granted=False)
    await task


async def test_concurrent_requests_share_one_prompt_and_one_answer(sink):
    broker = PermissionBroker()

    first = asyncio.create_task(broker.request("sess-1", "edit_file: a.json"))
    await asyncio.sleep(0)
    second = asyncio.create_task(broker.request("sess-1", "write_file: b.json"))
    await asyncio.sleep(0)

    assert len(sink.events) == 1  # single-flight: one prompt for the batch

    broker.resolve("sess-1", sink.events[0].data["request_id"], granted=True)
    assert await first is True
    assert await second is True
