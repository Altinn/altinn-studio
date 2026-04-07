"""Tests for MCP client state management.

Covers: down, indexing, up-then-down during requests, reconnection behaviour.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, Mock, patch, MagicMock

from agents.services.mcp.mcp_client import (
    MCPClient,
    INITIAL_RETRY_DELAY_SECONDS,
    RECONNECT_MAX_RETRIES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_client(url: str = "http://localhost:8070") -> MCPClient:
    return MCPClient(server_url=url)


# ---------------------------------------------------------------------------
# MCP server completely down
# ---------------------------------------------------------------------------

class TestMCPDown:
    """When the MCP server is unreachable from the start."""

    @pytest.mark.asyncio
    async def test_connect_sets_last_error_on_failure(self):
        client = _make_client()
        with patch.object(client, "_get_client", new_callable=AsyncMock) as mock_get:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.ping = AsyncMock(side_effect=ConnectionRefusedError("Connection refused"))
            mock_get.return_value = mock_ctx

            with pytest.raises(ConnectionRefusedError):
                await client.connect()

        assert client.is_ready is False
        assert client.last_error is not None
        assert "refused" in client.last_error.lower()

    @pytest.mark.asyncio
    async def test_call_tool_returns_error_dict_when_down(self):
        client = _make_client()
        client._connected = False
        with patch.object(client, "_get_client", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = ConnectionRefusedError("Connection refused")
            result = await client.call_tool("altinn_status", {})

        assert isinstance(result, dict)
        assert "error" in result

    def test_is_ready_false_initially(self):
        client = _make_client()
        assert client.is_ready is False
        assert client.is_docs_ready is False
        assert client.is_docs_indexing is False


# ---------------------------------------------------------------------------
# MCP server up but docs still indexing
# ---------------------------------------------------------------------------

class TestMCPIndexing:
    """When MCP is reachable but documentation index is still building."""

    @pytest.mark.asyncio
    async def test_docs_indexing_state(self):
        client = _make_client()
        client._connected = True

        # Simulate altinn_status returning indexing state
        status_response = {"docs_ready": False, "docs_indexing": True}
        with patch.object(
            client, "call_tool", new_callable=AsyncMock, return_value=status_response
        ):
            success = await client._check_docs_status()

        assert success is True
        assert client.is_docs_ready is False
        assert client.is_docs_indexing is True

    @pytest.mark.asyncio
    async def test_docs_become_ready(self):
        client = _make_client()
        client._connected = True

        status_response = {"docs_ready": True, "docs_indexing": False}
        with patch.object(
            client, "call_tool", new_callable=AsyncMock, return_value=status_response
        ):
            success = await client._check_docs_status()

        assert success is True
        assert client.is_docs_ready is True
        assert client.is_docs_indexing is False

    @pytest.mark.asyncio
    async def test_wait_for_docs_ready_returns_true_when_already_ready(self):
        client = _make_client()
        client._docs_ready = True
        result = await client.wait_for_docs_ready()
        assert result is True

    @pytest.mark.asyncio
    async def test_wait_for_docs_ready_polls_until_ready(self):
        client = _make_client()
        client._connected = True

        call_count = 0

        async def fake_check():
            nonlocal call_count
            call_count += 1
            if call_count >= 2:
                client._docs_ready = True
            return True

        with patch.object(client, "_check_docs_status", side_effect=fake_check):
            with patch("agents.services.mcp.mcp_client.DOCS_READY_POLL_INTERVAL_SECONDS", 0.01):
                result = await client.wait_for_docs_ready()

        assert result is True
        assert call_count >= 2


# ---------------------------------------------------------------------------
# MCP goes down during a request
# ---------------------------------------------------------------------------

class TestMCPGoesDownDuringRequest:
    """When MCP is initially up but drops mid-request."""

    @pytest.mark.asyncio
    async def test_call_tool_marks_disconnected_on_connection_error(self):
        client = _make_client()
        client._connected = True

        with patch.object(client, "_get_client", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = ConnectionError("Connection reset by peer")
            with patch.object(client, "_mark_disconnected") as mock_mark:
                result = await client.call_tool("altinn_layout_validate", {"json_content": "{}"})

        assert "error" in result
        mock_mark.assert_called_once()

    @pytest.mark.asyncio
    async def test_call_tool_does_not_mark_disconnected_on_non_connection_error(self):
        client = _make_client()
        client._connected = True

        with patch.object(client, "_get_client", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = ValueError("Bad tool arguments")
            with patch.object(client, "_mark_disconnected") as mock_mark:
                result = await client.call_tool("altinn_layout_validate", {"json_content": "{}"})

        assert "error" in result
        mock_mark.assert_not_called()

    def test_mark_disconnected_resets_state(self):
        client = _make_client()
        client._connected = True
        client._docs_ready = True
        client._docs_indexing = False
        client._available_tools = [{"name": "tool1"}]

        with patch.object(client, "_start_reconnect_loop"):
            client._mark_disconnected(error="Connection lost")

        assert client.is_ready is False
        assert client.is_docs_ready is False
        assert client._available_tools == []
        assert client.last_error == "Connection lost"

    def test_mark_disconnected_noop_when_already_disconnected(self):
        client = _make_client()
        client._connected = False

        with patch.object(client, "_start_reconnect_loop") as mock_reconnect:
            client._mark_disconnected(error="test")

        mock_reconnect.assert_not_called()

    @pytest.mark.asyncio
    async def test_wait_for_docs_gives_up_after_consecutive_failures(self):
        client = _make_client()
        client._connected = True

        async def always_fail():
            return False

        with patch.object(client, "_check_docs_status", side_effect=always_fail):
            with patch.object(client, "_mark_disconnected") as mock_mark:
                with patch("agents.services.mcp.mcp_client.DOCS_READY_POLL_INTERVAL_SECONDS", 0.01):
                    with patch("agents.services.mcp.mcp_client.DOCS_MAX_CONSECUTIVE_FAILURES", 2):
                        result = await client.wait_for_docs_ready()

        assert result is False
        mock_mark.assert_called_once()


# ---------------------------------------------------------------------------
# Connection error detection
# ---------------------------------------------------------------------------

class TestConnectionErrorDetection:
    """Verify _is_connection_error correctly classifies exceptions."""

    @pytest.mark.parametrize("msg,expected", [
        ("Failed to connect to server", True),
        ("Connection refused", True),
        ("Connection reset by peer", True),
        ("All connection attempts failed", True),
        ("Invalid JSON in response", False),
        ("Missing required field 'value'", False),
        ("Tool 'altinn_foo' not found", False),
    ])
    def test_is_connection_error(self, msg, expected):
        assert MCPClient._is_connection_error(Exception(msg)) is expected
