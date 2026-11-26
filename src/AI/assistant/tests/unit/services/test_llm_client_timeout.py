"""A reply that stalls fails the call, instead of holding the session until the caller gives up."""

from __future__ import annotations

import socket
import time

import pytest
from openai import APITimeoutError

from agents.services.llm import llm_client


def test_a_stalled_reply_times_out(monkeypatch):
    # The kernel accepts the connection, and nothing ever answers
    with socket.create_server(("127.0.0.1", 0)) as server:
        port = server.getsockname()[1]
        monkeypatch.setattr(llm_client.config, "AZURE_API_KEY", "a-key")
        monkeypatch.setattr(llm_client.config, "AZURE_OPENAI_ENDPOINT", f"http://127.0.0.1:{port}")
        monkeypatch.setattr(llm_client, "OPENAI_TIMEOUT_SECONDS", 0.1)
        client = llm_client.LLMClient(role="planner", model="gpt-test")
        assert client.llm is not None

        started = time.monotonic()
        with pytest.raises(APITimeoutError):
            client.llm.invoke("hello")

    # Three tries and the backoff between them
    assert time.monotonic() - started < 10
