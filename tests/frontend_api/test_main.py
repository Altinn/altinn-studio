import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi.middleware.cors import CORSMiddleware
from frontend_api.main import app, shutdown_event, startup_event

APP_NAME = "test-app"
APP_ORG = "test-org"
APP_PATH = "/path/to/test-app"

@pytest.fixture
def startup_mocks(mocker):
    mock_check_mcp = mocker.patch('agents.services.mcp.check_mcp_server_startup', new_callable=AsyncMock)
    mock_sink = mocker.patch('agents.services.events.sink')
    mock_sink.set_main_loop = Mock()

    return {
        'sink': mock_sink,
        'check_mcp': mock_check_mcp
    }

class TestFaviconEndpoint:
    def test_favicon_returns_empty_icon(self):
        response = TestClient(app).get("/favicon.ico")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/x-icon"
        assert response.content == b""

class TestHealthEndpoint:
    def test_health_check_returns_ok(self):
        response = TestClient(app).get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

class TestStatusEndpoint:
    def test_status_endpoint_with_no_current_app(self, mocker):
        mocker.patch('frontend_api.main.app_manager.get_current_app', return_value=None)

        response = TestClient(app).get("/api/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["services"] == {"app_manager": "running"}
        assert data["active_sessions"] == 0
        assert data["current_app"] is None

    def test_status_endpoint_with_current_app(self, mocker):
        mock_app_info = {
            "name": APP_NAME,
            "org": APP_ORG,
            "repo_name": APP_NAME,
            "path": APP_PATH
        }
        mocker.patch('frontend_api.main.app_manager.get_current_app', return_value=mock_app_info)

        response = TestClient(app).get("/api/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["current_app"]["name"] == APP_NAME
        assert data["current_app"]["org"] == APP_ORG
        assert data["current_app"]["repo_name"] == APP_NAME
        assert data["current_app"]["path"] == APP_PATH
        assert data["current_app"]["description"] is None

class TestStartupEvent:
    @pytest.mark.asyncio
    async def test_startup_configures_event_sink_and_checks_mcp_server(self, startup_mocks, mocker):
        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = False
        mocker.patch('shared.config.get_config', return_value=mock_config)

        await startup_event()

        startup_mocks['check_mcp'].assert_called_once()
        startup_mocks['sink'].set_main_loop.assert_called_once()

    @pytest.mark.asyncio
    async def test_startup_initializes_langfuse_when_enabled(self, startup_mocks, mocker, capsys):
        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = True
        mock_config.LANGFUSE_HOST = "https://langfuse.example.com"
        mocker.patch('shared.config.get_config', return_value=mock_config)

        mock_init = mocker.patch('shared.utils.langfuse_utils.init_langfuse')

        await startup_event()

        mock_init.assert_called_once()
        captured = capsys.readouterr()
        assert "Langfuse initialized" in captured.out

    @pytest.mark.asyncio
    async def test_startup_handles_langfuse_init_failure(self, startup_mocks, mocker, capsys):
        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = True
        mock_config.LANGFUSE_HOST = "https://langfuse.example.com"
        mocker.patch('shared.config.get_config', return_value=mock_config)

        mocker.patch('shared.utils.langfuse_utils.init_langfuse', side_effect=Exception("Connection failed"))

        await startup_event()

        startup_mocks['sink'].set_main_loop.assert_called_once()
        captured = capsys.readouterr()
        assert "Failed to initialize Langfuse" in captured.out

    @pytest.mark.asyncio
    async def test_startup_skips_langfuse_when_disabled(self, startup_mocks, mocker):
        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = False
        mocker.patch('shared.config.get_config', return_value=mock_config)

        mock_init = mocker.patch('shared.utils.langfuse_utils.init_langfuse')

        await startup_event()

        mock_init.assert_not_called()

class TestShutdownEvent:
    @pytest.mark.asyncio
    async def test_shutdown_logs_message(self, mocker):
        mock_logger = mocker.patch('frontend_api.main.logger')
        await shutdown_event()

        mock_logger.info.assert_called_once()
        assert "Shutting down" in mock_logger.info.call_args[0][0]
