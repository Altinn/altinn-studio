import pytest
from unittest.mock import Mock, MagicMock
from server.main import _initialize_documentation_search, main

DEFAULT_PORT = 8069
CUSTOM_PORT = 9000
DEFAULT_TRANSPORT = "sse"
STDIO_TRANSPORT = "stdio"

class TestInitializeDocumentationSearch:
    def test_initialize_documentation_search_verbose(self, mocker):
        mock_init_doc_search = mocker.patch('server.tools.planning_tool.planning_tool.initialize_documentation_search')
        mock_stderr = mocker.patch('sys.stderr')

        _initialize_documentation_search(verbose=True)

        mock_init_doc_search.assert_called_once_with(verbose=True)
        mock_stderr.write.assert_called()

    def test_initialize_documentation_search_not_verbose(self, mocker):
        mock_init_doc_search = mocker.patch('server.tools.planning_tool.planning_tool.initialize_documentation_search')
        mock_stderr = mocker.patch('sys.stderr')

        _initialize_documentation_search(verbose=False)

        mock_init_doc_search.assert_called_once_with(verbose=False)
        mock_stderr.write.assert_not_called()


class TestMain:
    @pytest.fixture
    def mock_mcp_instance(self):
        return MagicMock()

    @pytest.fixture
    def default_args(self):
        return Mock(stdio=False, port=None, skip_doc_init=False)

    def test_main_default_settings(self, mocker, mock_mcp_instance, default_args):
        mock_parse_args = mocker.patch('argparse.ArgumentParser.parse_args')
        mock_init_doc = mocker.patch('server.main._initialize_documentation_search')
        mock_register_tools = mocker.patch('server.tools.register_all_tools')
        mock_init_mcp = mocker.patch('server.tools.initialize_mcp')

        mock_parse_args.return_value = default_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once()
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_called_once_with(verbose=True)
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT, host="0.0.0.0", port=DEFAULT_PORT)

    def test_main_with_stdio_transport(self, mocker, mock_mcp_instance):
        mock_parse_args = mocker.patch('argparse.ArgumentParser.parse_args')
        mock_init_doc = mocker.patch('server.main._initialize_documentation_search')
        mock_register_tools = mocker.patch('server.tools.register_all_tools')
        mock_init_mcp = mocker.patch('server.tools.initialize_mcp')

        mock_args = Mock(stdio=True, port=None, skip_doc_init=False)
        mock_parse_args.return_value = mock_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once()
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_called_once_with(verbose=False)
        mock_mcp_instance.run.assert_called_once_with(transport=STDIO_TRANSPORT)

    def test_main_with_custom_port(self, mocker, mock_mcp_instance):
        mock_parse_args = mocker.patch('argparse.ArgumentParser.parse_args')
        mock_init_doc = mocker.patch('server.main._initialize_documentation_search')
        mock_register_tools = mocker.patch('server.tools.register_all_tools')
        mock_init_mcp = mocker.patch('server.tools.initialize_mcp')

        mock_args = Mock(stdio=False, port=CUSTOM_PORT, skip_doc_init=False)
        mock_parse_args.return_value = mock_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once()
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_called_once_with(verbose=True)
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT, host="0.0.0.0", port=CUSTOM_PORT)

    def test_main_skip_doc_init(self, mocker, mock_mcp_instance):
        mock_parse_args = mocker.patch('argparse.ArgumentParser.parse_args')
        mock_init_doc = mocker.patch('server.main._initialize_documentation_search')
        mock_register_tools = mocker.patch('server.tools.register_all_tools')
        mock_init_mcp = mocker.patch('server.tools.initialize_mcp')

        mock_args = Mock(stdio=False, port=None, skip_doc_init=True)
        mock_parse_args.return_value = mock_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once()
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_not_called()
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT, host="0.0.0.0", port=DEFAULT_PORT)

    def test_main_doc_init_failure(self, mocker, mock_mcp_instance, default_args, capsys):
        mock_parse_args = mocker.patch('argparse.ArgumentParser.parse_args')
        mock_init_doc = mocker.patch('server.main._initialize_documentation_search')
        mock_register_tools = mocker.patch('server.tools.register_all_tools')
        mock_init_mcp = mocker.patch('server.tools.initialize_mcp')

        mock_parse_args.return_value = default_args
        mock_init_mcp.return_value = mock_mcp_instance
        mock_init_doc.side_effect = Exception("Connection error")

        main()

        mock_init_mcp.assert_called_once()
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_called_once_with(verbose=True)
        assert "Failed to initialize documentation search" in capsys.readouterr().err
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT, host="0.0.0.0", port=DEFAULT_PORT)
