import pytest
from unittest.mock import Mock, patch, MagicMock
from server.main import _initialize_documentation_search, main

DEFAULT_PORT = 8069
CUSTOM_PORT = 9000
DEFAULT_TRANSPORT = "sse"
STDIO_TRANSPORT = "stdio"

class TestInitializeDocumentationSearch:
    @patch('server.tools.planning_tool.planning_tool.initialize_documentation_search')
    @patch('sys.stderr')
    def test_initialize_documentation_search_verbose(self, mock_stderr, mock_init_doc_search):
        _initialize_documentation_search(verbose=True)

        mock_init_doc_search.assert_called_once_with(verbose=True)
        mock_stderr.write.assert_called()

    @patch('server.tools.planning_tool.planning_tool.initialize_documentation_search')
    @patch('sys.stderr')
    def test_initialize_documentation_search_not_verbose(self, mock_stderr, mock_init_doc_search):
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

    @patch('server.tools.initialize_mcp')
    @patch('server.tools.register_all_tools')
    @patch('server.main._initialize_documentation_search')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_default_settings(self, mock_parse_args, mock_init_doc,
                                   mock_register_tools, mock_init_mcp,
                                   mock_mcp_instance, default_args):
        mock_parse_args.return_value = default_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once_with(DEFAULT_PORT)
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_called_once_with(verbose=True)
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT)

    @patch('server.tools.initialize_mcp')
    @patch('server.tools.register_all_tools')
    @patch('server.main._initialize_documentation_search')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_with_stdio_transport(self, mock_parse_args, mock_init_doc,
                                       mock_register_tools, mock_init_mcp,
                                       mock_mcp_instance):
        mock_args = Mock(stdio=True, port=None, skip_doc_init=False)
        mock_parse_args.return_value = mock_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once_with(DEFAULT_PORT)
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_called_once_with(verbose=False)
        mock_mcp_instance.run.assert_called_once_with(transport=STDIO_TRANSPORT)

    @patch('server.tools.initialize_mcp')
    @patch('server.tools.register_all_tools')
    @patch('server.main._initialize_documentation_search')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_with_custom_port(self, mock_parse_args, mock_init_doc,
                                   mock_register_tools, mock_init_mcp,
                                   mock_mcp_instance):
        mock_args = Mock(stdio=False, port=CUSTOM_PORT, skip_doc_init=False)
        mock_parse_args.return_value = mock_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once_with(CUSTOM_PORT)
        mock_register_tools.assert_called_once()
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT)

    @patch('server.tools.initialize_mcp')
    @patch('server.tools.register_all_tools')
    @patch('server.main._initialize_documentation_search')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_skip_doc_init(self, mock_parse_args, mock_init_doc,
                                mock_register_tools, mock_init_mcp,
                                mock_mcp_instance):
        mock_args = Mock(stdio=False, port=None, skip_doc_init=True)
        mock_parse_args.return_value = mock_args
        mock_init_mcp.return_value = mock_mcp_instance

        main()

        mock_init_mcp.assert_called_once_with(DEFAULT_PORT)
        mock_register_tools.assert_called_once()
        mock_init_doc.assert_not_called()
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT)

    @patch('server.tools.initialize_mcp')
    @patch('server.tools.register_all_tools')
    @patch('server.main._initialize_documentation_search')
    @patch('argparse.ArgumentParser.parse_args')
    @patch('sys.stderr')
    def test_main_doc_init_failure(self, mock_stderr, mock_parse_args, mock_init_doc,
                                   mock_register_tools, mock_init_mcp,
                                   mock_mcp_instance, default_args):
        mock_parse_args.return_value = default_args
        mock_init_mcp.return_value = mock_mcp_instance
        mock_init_doc.side_effect = Exception("Connection error")

        main()

        mock_init_mcp.assert_called_once_with(DEFAULT_PORT)
        mock_register_tools.assert_called_once()
        mock_mcp_instance.run.assert_called_once_with(transport=DEFAULT_TRANSPORT)
