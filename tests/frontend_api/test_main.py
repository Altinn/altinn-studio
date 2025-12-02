import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient

APP_NAME = "test-app"
APP_ORG = "test-org"
APP_PATH = "/fake/path/to/test-app"

@pytest.fixture
def client():
    from frontend_api.main import app, app_manager
    return TestClient(app), app_manager

class TestFaviconEndpoint:
    def test_favicon_returns_empty_icon(self, client):
        test_client, _ = client
        response = test_client.get("/favicon.ico")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/x-icon"
        assert response.content == b""

class TestHealthEndpoint:
    def test_health_check_returns_ok(self, client):
        test_client, _ = client
        response = test_client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

class TestStatusEndpoint:
    def test_status_endpoint_with_no_current_app(self, client, mocker):
        test_client, _ = client
        mocker.patch('frontend_api.main.app_manager.get_current_app', return_value=None)

        response = test_client.get("/api/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["services"] == {"app_manager": "running"}
        assert data["active_sessions"] == 0
        assert data["current_app"] is None

    def test_status_endpoint_with_current_app(self, client, mocker):
        test_client, _ = client

        mock_app_info = {
            "name": APP_NAME,
            "org": APP_ORG,
            "repo_name": APP_NAME,
            "path": APP_PATH
        }
        mocker.patch('frontend_api.main.app_manager.get_current_app', return_value=mock_app_info)

        response = test_client.get("/api/status")

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
    async def test_startup_configures_event_sink_and_checks_mcp_server(self, mocker):
        from frontend_api.main import startup_event

        mock_sink = Mock()
        mock_sink.set_main_loop = Mock()
        mocker.patch('agents.services.events.sink', mock_sink)

        mock_check_mcp = mocker.patch('agents.services.mcp.check_mcp_server_startup', new_callable=AsyncMock)

        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = False
        mocker.patch('shared.config.get_config', return_value=mock_config)

        await startup_event()

        mock_check_mcp.assert_called_once()
        mock_sink.set_main_loop.assert_called_once()

    @pytest.mark.asyncio
    async def test_startup_initializes_langfuse_when_enabled(self, mocker, capsys):
        from frontend_api.main import startup_event

        mock_sink = Mock()
        mock_sink.set_main_loop = Mock()
        mocker.patch('agents.services.events.sink', mock_sink)
        mocker.patch('agents.services.mcp.check_mcp_server_startup', new_callable=AsyncMock)

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
    async def test_startup_handles_langfuse_init_failure(self, mocker, capsys):
        from frontend_api.main import startup_event

        mock_sink = Mock()
        mock_sink.set_main_loop = Mock()
        mocker.patch('agents.services.events.sink', mock_sink)
        mocker.patch('agents.services.mcp.check_mcp_server_startup', new_callable=AsyncMock)

        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = True
        mock_config.LANGFUSE_HOST = "https://langfuse.example.com"
        mocker.patch('shared.config.get_config', return_value=mock_config)

        mocker.patch('shared.utils.langfuse_utils.init_langfuse', side_effect=Exception("Connection failed"))

        await startup_event()

        mock_sink.set_main_loop.assert_called_once()

        captured = capsys.readouterr()
        assert "Failed to initialize Langfuse" in captured.out

    @pytest.mark.asyncio
    async def test_startup_skips_langfuse_when_disabled(self, mocker):
        from frontend_api.main import startup_event

        mock_sink = Mock()
        mock_sink.set_main_loop = Mock()
        mocker.patch('agents.services.events.sink', mock_sink)
        mocker.patch('agents.services.mcp.check_mcp_server_startup', new_callable=AsyncMock)

        mock_config = Mock()
        mock_config.LANGFUSE_ENABLED = False
        mocker.patch('shared.config.get_config', return_value=mock_config)

        mock_init = mocker.patch('shared.utils.langfuse_utils.init_langfuse')

        await startup_event()

        mock_init.assert_not_called()

class TestShutdownEvent:
    @pytest.mark.asyncio
    async def test_shutdown_logs_message(self, mocker):
        from frontend_api.main import shutdown_event

        mock_logger = mocker.patch('frontend_api.main.logger')
        await shutdown_event()

        mock_logger.info.assert_called_once()
        assert "Shutting down" in mock_logger.info.call_args[0][0]

class TestAppConfiguration:
    def test_app_has_correct_metadata(self):
        from frontend_api.main import app

        assert app.title == "Altinity"
        assert app.description == "API for Altinn app preview and management"
        assert app.version == "2.0.0"

    def test_app_has_cors_middleware(self):
        from frontend_api.main import app

        has_cors = False
        for middleware in app.user_middleware:
            if "CORSMiddleware" in str(middleware.cls):
                has_cors = True
                break

        assert has_cors, "CORS middleware not found in app middleware stack"
