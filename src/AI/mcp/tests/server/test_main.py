from unittest.mock import MagicMock, ANY, patch
from server.main import main

DEFAULT_PORT = 8070
CUSTOM_PORT = 9000

# Shared patches applied to every test via the decorator stack below.
_SHARED_PATCHES = [
    patch('fastmcp.server.http.create_streamable_http_app', return_value=MagicMock()),
    patch('starlette.applications.Starlette'),
    patch('starlette.routing.Mount'),
]


def _make_args(**overrides):
    defaults = {"stdio": False, "port": DEFAULT_PORT}
    defaults.update(overrides)
    return MagicMock(**defaults)


class TestMain:
    """Tests for the main() entry point."""

    def _run(self, mcp_mock, register_mock, uvicorn_mock, args_mock):
        """Call main() and return the mcp.run that existed *before* main replaced it."""
        original_run = mcp_mock.run
        with patch('argparse.ArgumentParser.parse_args', return_value=args_mock), \
             patch('server.main.FastMCP', return_value=mcp_mock), \
             patch('server.handlers.register.register_tools', register_mock), \
             patch('uvicorn.run', uvicorn_mock):
            for p in _SHARED_PATCHES:
                p.start()
            try:
                main()
            finally:
                for p in _SHARED_PATCHES:
                    p.stop()
        return original_run

    def test_default_http_transport(self):
        mcp = MagicMock()
        register = MagicMock(return_value=['tool_a'])
        uvicorn_run = MagicMock()

        self._run(mcp, register, uvicorn_run, _make_args())

        register.assert_called_once_with(mcp)
        uvicorn_run.assert_called_once_with(ANY, host="0.0.0.0", port=DEFAULT_PORT)

    def test_stdio_transport(self):
        mcp = MagicMock()
        register = MagicMock(return_value=['tool_a'])
        uvicorn_run = MagicMock()

        original_run = self._run(mcp, register, uvicorn_run, _make_args(stdio=True))

        register.assert_called_once_with(mcp)
        original_run.assert_called_once_with(transport="stdio")
        uvicorn_run.assert_not_called()

    def test_custom_port(self):
        mcp = MagicMock()
        register = MagicMock(return_value=['tool_a'])
        uvicorn_run = MagicMock()

        self._run(mcp, register, uvicorn_run, _make_args(port=CUSTOM_PORT))

        uvicorn_run.assert_called_once_with(ANY, host="0.0.0.0", port=CUSTOM_PORT)
