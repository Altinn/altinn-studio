"""Entry point for the Altinn MCP server.

Features:
- Namespace-based tool naming (altinn_*)
- Stateless HTTP mode for session survival across redeploys
- Agent mode routing (/agent/sse vs /sse)
- Langfuse tracing (skipped in agent mode)
"""

import sys
import argparse
from contextvars import ContextVar
from fastmcp import FastMCP

# Context variable to track if current request is in agent mode
# Set by middleware based on request path (/sse vs /agent/sse)
_agent_mode_var: ContextVar[bool] = ContextVar('agent_mode', default=False)


def is_agent_mode() -> bool:
    """Check if current request is in agent mode.
    
    Agent mode is enabled when connecting via /agent/sse endpoint.
    In agent mode:
    - Langfuse tracing is skipped
    - user_goal parameter is optional
    """
    return _agent_mode_var.get()


def set_agent_mode(value: bool) -> None:
    """Set agent mode for the current request context."""
    _agent_mode_var.set(value)


def main() -> None:
    """Start the Altinn MCP server.
    
    Uses namespace-based tool naming (altinn_*) with:
    - Short, user-facing descriptions
    - Structured error responses
    - Prerequisite enforcement in tool behavior
    - Router tool for intent detection
    - Stateless HTTP for session survival across redeploys
    - Agent mode routing (/agent/sse vs /sse)
    """
    parser = argparse.ArgumentParser(description="Altinn MCP Server")
    parser.add_argument("--stdio", action="store_true", help="Use stdio transport instead of HTTP")
    parser.add_argument("--port", type=int, default=8070, help="Port for HTTP transport (default: 8070)")
    
    args = parser.parse_args()
    port = args.port
    
    # Import tool registration
    from server.handlers.register import register_tools, INSTRUCTIONS
    
    # Create MCP instance with minimal instructions
    mcp = FastMCP(
        name="altinn_mcp",
        instructions=INSTRUCTIONS,
        version="2.0.0",
    )
    
    # Register all tools
    registered = register_tools(mcp)
    
    # Determine transport
    transport = "stdio" if args.stdio else "http"
    
    if transport == "http":
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
    
    print(f"""
================================================================================
Altinn MCP Server
================================================================================
Registered {len(registered)} tools:
{chr(10).join(f'  - {name}' for name in sorted(registered))}

Endpoints (Streamable HTTP):
  - Standard (with tracing):  /sse
  - Agent mode (no tracing):  /agent/sse
================================================================================
""", file=sys.stderr)
    
    if transport == "stdio":
        print("Starting Altinn MCP server using stdio transport", file=sys.stderr, flush=True)
    else:
        print(f"Starting Altinn MCP server on port {port} using Streamable HTTP (stateless)", file=sys.stderr, flush=True)
    
    mcp.run(transport=transport)


if __name__ == "__main__":
    main()
