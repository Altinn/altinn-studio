import pytest
from unittest.mock import Mock, AsyncMock, patch, PropertyMock
from fastapi.testclient import TestClient
from fastapi.middleware.cors import CORSMiddleware
from api.main import app

APP_NAME = "test-app"
APP_ORG = "test-org"
APP_PATH = "/path/to/test-app"


class TestFaviconEndpoint:
    def test_favicon_returns_empty_icon(self):
        response = TestClient(app).get("/favicon.ico")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/x-icon"
        assert response.content == b""


class TestHealthEndpoint:
    def test_health_check_returns_ok_with_mcp_status(self):
        mock_mcp = Mock()
        mock_mcp.is_ready = True
        mock_mcp.is_docs_ready = True
        mock_mcp.is_docs_indexing = False
        mock_mcp.server_url = "http://localhost:8070/sse"
        mock_mcp.last_error = None

        with patch("agents.services.mcp.get_mcp_client", return_value=mock_mcp):
            response = TestClient(app).get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["mcp"]["status"] == "connected"
        assert data["mcp"]["docs_status"] == "ready"

    def test_health_check_when_mcp_connecting(self):
        mock_mcp = Mock()
        mock_mcp.is_ready = False
        mock_mcp.is_docs_ready = False
        mock_mcp.is_docs_indexing = False
        mock_mcp.server_url = "http://localhost:8070/sse"
        mock_mcp.last_error = "Connection refused"

        with patch("agents.services.mcp.get_mcp_client", return_value=mock_mcp):
            response = TestClient(app).get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["mcp"]["status"] == "connecting"
        assert data["mcp"]["docs_status"] == "unknown"
        assert data["mcp"]["last_error"] == "Connection refused"

    def test_health_check_when_docs_indexing(self):
        mock_mcp = Mock()
        mock_mcp.is_ready = True
        mock_mcp.is_docs_ready = False
        mock_mcp.is_docs_indexing = True
        mock_mcp.server_url = "http://localhost:8070/sse"
        mock_mcp.last_error = None

        with patch("agents.services.mcp.get_mcp_client", return_value=mock_mcp):
            response = TestClient(app).get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["mcp"]["status"] == "connected"
        assert data["mcp"]["docs_status"] == "indexing"
