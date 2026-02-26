import pytest
from unittest.mock import MagicMock, ANY
from server.main import _initialize_documentation_search, main

DEFAULT_PORT = 8069
CUSTOM_PORT = 9000


class TestInitializeDocumentationSearch:
    def test_verbose_logs_to_stderr(self, mocker):
        mocker.patch('server.tools.planning_tool.planning_tool.initialize_documentation_search')
        mock_stderr = mocker.patch('sys.stderr')

        _initialize_documentation_search(verbose=True)

        mock_stderr.write.assert_called()

    def test_not_verbose_suppresses_logs(self, mocker):
        mocker.patch('server.tools.planning_tool.planning_tool.initialize_documentation_search')
        mock_stderr = mocker.patch('sys.stderr')

        _initialize_documentation_search(verbose=False)

        mock_stderr.write.assert_not_called()


class TestMain:
    @pytest.fixture(autouse=True)
    def setup_mocks(self, mocker):
        """Shared mocks for all main() tests."""
        self.mcp = MagicMock()
        self.init_doc = mocker.patch('server.main._initialize_documentation_search')
        mocker.patch('server.tools.register_all_tools')
        mocker.patch('server.tools.initialize_mcp', return_value=self.mcp)
        self.uvicorn_run = mocker.patch('uvicorn.run')

        # Stub ASGI infrastructure
        mocker.patch('fastmcp.server.http.create_streamable_http_app', return_value=MagicMock())
        mocker.patch('starlette.applications.Starlette')
        mocker.patch('starlette.routing.Mount')

    def _run_with_args(self, mocker, **overrides):
        defaults = {"stdio": False, "port": None, "skip_doc_init": False}
        defaults.update(overrides)
        args = MagicMock(**defaults)
        mocker.patch('argparse.ArgumentParser.parse_args', return_value=args)
        # Save original run before main() replaces it with custom_run
        self.original_mcp_run = self.mcp.run
        main()

    def test_default_settings(self, mocker):
        self._run_with_args(mocker)

        self.init_doc.assert_called_once_with(verbose=True)
        self.uvicorn_run.assert_called_once_with(ANY, host="0.0.0.0", port=DEFAULT_PORT)

    def test_stdio_transport(self, mocker):
        self._run_with_args(mocker, stdio=True)

        self.init_doc.assert_called_once_with(verbose=False)
        self.original_mcp_run.assert_called_once_with(transport="stdio")

    def test_custom_port(self, mocker):
        self._run_with_args(mocker, port=CUSTOM_PORT)

        self.uvicorn_run.assert_called_once_with(ANY, host="0.0.0.0", port=CUSTOM_PORT)

    def test_skip_doc_init(self, mocker):
        self._run_with_args(mocker, skip_doc_init=True)

        self.init_doc.assert_not_called()

    def test_doc_init_failure_continues(self, mocker, capsys):
        self.init_doc.side_effect = Exception("Connection error")

        self._run_with_args(mocker)

        assert "Failed to initialize documentation search" in capsys.readouterr().err
        self.uvicorn_run.assert_called_once()
