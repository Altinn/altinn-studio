"""Entry point for the Altinity MCP server."""

from server.tools import mcp  # noqa: F401 - imported for side effects
# Import tool modules so they register themselves
# from server.tools.logic_generator_tool.logic_generator import logic_generator_tool  # noqa: F401
# from server.tools.layout_components_tool.layout_components_tool import layout_components_tool  # noqa: F401 - Disabled, uses slow LLM filtering
from server.tools.layout_components_tool.layout_components_tool_no_llm import layout_components_tool_no_llm  # noqa: F401
from server.tools.dynamic_expression_tool.dynamic_expressions import dynamic_expression  # noqa: F401
from server.tools.datamodel_tool.datamodel_tool import datamodel_tool  # noqa: F401
from server.tools.resource_tool.resource_tool import resource_tool  # noqa: F401
from server.tools.policy_tool.policy_tool import policy_tool  # noqa: F401
from server.tools.prefill_tool.prefill_tool import prefill_tool  # noqa: F401
from server.tools.policy_validation_tool.policy_validation_tool import policy_validation_tool  # noqa: F401
from server.tools.policy_summarization_tool.policy_summarization_tool import policy_summarization_tool  # noqa: F401
from server.tools.schema_validator_tool.schema_validator_tool import schema_validator_tool  # noqa: F401
from server.tools.layout_properties_tool.layout_properties_tool import layout_properties_tool  # noqa: F401
from server.tools.planning_tool.planning_tool import planning_tool  # noqa: F401
from server.tools.datamodel_sync_tool.datamodel_sync_tool import datamodel_sync  # noqa: F401
# Commented out due to dependency on codegen module
# from server.tools.studio_examples_tool.studio_examples_tool import studio_examples_tool  # noqa: F401
# from server.tools.app_lib_examples_tool.app_lib_examples_tool import app_lib_examples_tool  # noqa: F401
def _initialize_documentation_search(verbose: bool = False):
    """Pre-fetch and cache all documentation at server startup."""
    import sys
    from server.tools.planning_tool.planning_tool import initialize_documentation_search
    
    # Log to stderr to avoid interfering with stdio JSON-RPC
    def log(msg: str):
        if verbose:
            print(msg, file=sys.stderr, flush=True)
    
    log("\n" + "=" * 80)
    log("Initializing documentation search (fetching all docs)...")
    log("This may take 30-60 seconds on first run, but uses cache on subsequent starts.")
    log("=" * 80)
    
    initialize_documentation_search(verbose=verbose)
    
    log("=" * 80)
    log("✅ Documentation search initialized and ready!")
    log("=" * 80 + "\n")


def main() -> None:
    """Start the Altinity MCP server.

    When launching via ``uv run -m server.main`` (or ``python -m server.main``)
    you can pass the flag ``--stdio`` to use the *stdio* transport instead of
    the default *sse* transport. This makes it convenient to integrate the
    server in environments that expect communication over standard
    input/output.

    You can also specify a custom port with ``--port <port_number>``.
    """
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="Altinity MCP Server")
    parser.add_argument("--stdio", action="store_true", help="Use stdio transport instead of HTTP")
    parser.add_argument("--port", type=int, help="Custom port for HTTP transport (default: 8069)")
    parser.add_argument("--skip-doc-init", action="store_true", help="Skip documentation initialization at startup")
    
    args = parser.parse_args()

    # Determine the port to use
    port = args.port if args.port else 8069

    # Initialize MCP with the correct port BEFORE importing tools
    from server.tools import initialize_mcp, register_all_tools, set_agent_mode
    mcp = initialize_mcp(port)
    
    # Now register all the tools with the initialized MCP instance
    register_all_tools()

    # Create a custom ASGI app that wraps FastMCP's Streamable HTTP app with agent mode detection.
    # We use stateless HTTP mode so the server does not maintain any in-memory session registry
    # between requests or across deploys.
    from starlette.applications import Starlette
    from starlette.routing import Mount
    from fastmcp.server.http import create_streamable_http_app

    # Create the Streamable HTTP app with stateless HTTP enabled.
    # The app will serve MCP over HTTP at the given path ("/sse" kept for compatibility).
    http_base_app = create_streamable_http_app(
        mcp,
        streamable_http_path="/sse",
        stateless_http=True,
    )
    
    # Pure ASGI middleware that sets agent mode - compatible with SSE streaming
    class AgentModeASGIMiddleware:
        def __init__(self, app):
            self.app = app
        
        async def __call__(self, scope, receive, send):
            if scope["type"] == "http":
                path = scope.get("path", "")
                is_agent = path.startswith("/agent")
                set_agent_mode(is_agent)
            return await self.app(scope, receive, send)
    
    # Create a new Starlette app that mounts the HTTP app at both paths.
    # IMPORTANT: We must propagate the FastMCP app's lifespan so that the
    # StreamableHTTPSessionManager task group is initialized correctly.
    app = Starlette(
        routes=[
            Mount('/agent', app=http_base_app),  # Agent mode endpoint
            Mount('/', app=http_base_app),       # Standard endpoint
        ],
        lifespan=http_base_app.lifespan,
    )
    
    # Wrap with our ASGI middleware
    app = AgentModeASGIMiddleware(app)
    
    # Replace mcp's run to use our custom app for HTTP transport
    original_run = mcp.run
    def custom_run(transport="sse", **kwargs):
        if transport == "http":
            import uvicorn
            uvicorn.run(app, host="0.0.0.0", port=port)
        else:
            original_run(transport=transport, **kwargs)
    mcp.run = custom_run
    
    import sys
    print("""
================================================================================
MCP Server Endpoints (Streamable HTTP):
  - Standard (with tracing):  /sse
  - Agent mode (no tracing):  /agent/sse
================================================================================
""", file=sys.stderr)
    
    transport = "stdio" if args.stdio else "http"
    
    # Pre-fetch documentation unless skipped
    if not args.skip_doc_init:
        try:
            # Only show verbose logs when not using stdio (to avoid JSON-RPC interference)
            verbose = (transport != "stdio")
            
            # In stdio mode, suppress all stdout during initialization to prevent
            # any library (requests, BeautifulSoup, etc.) from polluting JSON-RPC
            if transport == "stdio":
                import sys
                import os
                old_stdout = sys.stdout
                sys.stdout = open(os.devnull, 'w')
                try:
                    _initialize_documentation_search(verbose=verbose)
                finally:
                    sys.stdout.close()
                    sys.stdout = old_stdout
            else:
                _initialize_documentation_search(verbose=verbose)
                
        except Exception as e:
            import sys
            print(f"⚠️  Warning: Failed to initialize documentation search: {e}", file=sys.stderr)
            print("Documentation search will initialize lazily on first use.", file=sys.stderr)
    
    # Log startup message to stderr in stdio mode to avoid JSON-RPC interference
    import sys
    if transport == "stdio":
        print("Starting Altinity MCP server using stdio transport", file=sys.stderr, flush=True)
    else:
        print(f"Starting Altinity MCP server on port {port} using Streamable HTTP (stateless)", file=sys.stderr, flush=True)
    
    mcp.run(transport=transport)


if __name__ == "__main__":
    main()