"""Centralized tracing utility for all MCP tool calls using Langfuse.

Captures tool calls silently with metadata including:
- Tool name and arguments
- MCP client reasoning (from _meta field if provided)
- Team/organization info (from HTTP headers)
"""

import functools
import inspect
import sys
from contextvars import ContextVar
from typing import Any, Callable, Dict, Optional
from langfuse import Langfuse
from server.config import (
    LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY,
    LANGFUSE_HOST,
    LANGFUSE_ENABLED,
    LANGFUSE_ENVIRONMENT
)

# Default organization if headers are not available
DEFAULT_ORG = "unknown"

# Context variable to store MCP request metadata (set by middleware/handler)
_mcp_request_meta: ContextVar[Dict[str, Any]] = ContextVar('mcp_request_meta', default={})

def set_mcp_request_meta(meta: Dict[str, Any]) -> None:
    """Set MCP request metadata for the current context.
    
    This should be called by the MCP request handler to capture
    client reasoning and other metadata from the _meta field.
    """
    _mcp_request_meta.set(meta or {})

def get_mcp_request_meta() -> Dict[str, Any]:
    """Get MCP request metadata for the current context."""
    return _mcp_request_meta.get()

# Initialize Langfuse client
_langfuse_client: Optional[Langfuse] = None

def get_langfuse_client() -> Optional[Langfuse]:
    """Get or initialize the Langfuse client."""
    global _langfuse_client
    
    if not LANGFUSE_ENABLED:
        return None
    
    if _langfuse_client is None:
        if not LANGFUSE_PUBLIC_KEY or not LANGFUSE_SECRET_KEY:
            print("Warning: Langfuse is enabled but credentials are missing", flush=True)
            return None
        
        _langfuse_client = Langfuse(
            public_key=LANGFUSE_PUBLIC_KEY,
            secret_key=LANGFUSE_SECRET_KEY,
            host=LANGFUSE_HOST,
            environment=LANGFUSE_ENVIRONMENT
        )
    
    return _langfuse_client


def trace_tool_call(func: Callable) -> Callable:
    """Decorator to trace MCP tool calls with Langfuse.
    
    Silently captures:
    - Tool name and all input parameters
    - MCP client reasoning (from _meta.reasoning if provided by client)
    - Team/organization info (from HTTP headers)
    - Return value and any errors
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        client = get_langfuse_client()
        
        # If Langfuse is not enabled, just call the function normally
        if client is None:
            return func(*args, **kwargs)
        
        # Extract function metadata
        tool_name = func.__name__
        
        # Get MCP request metadata (client reasoning, etc.)
        mcp_meta = get_mcp_request_meta()
        client_reasoning = mcp_meta.get('reasoning', mcp_meta.get('description', ''))
        
        # Get team name from HTTP header
        team_name = DEFAULT_ORG
        try:
            from fastmcp.server.dependencies import get_http_headers
            headers = get_http_headers()
            if headers:
                team_name = (
                    headers.get('x-hackathon-name') or 
                    headers.get('X-Hackathon-Name') or 
                    team_name
                )
        except Exception:
            pass
        
        # Prepare input data
        input_data = dict(kwargs)
        if args:
            sig = inspect.signature(func)
            param_names = list(sig.parameters.keys())
            for i, arg in enumerate(args):
                if i < len(param_names):
                    input_data[param_names[i]] = arg
        
        try:
            # Build metadata
            span_metadata = {
                "tool_name": tool_name,
                "team_name": team_name,
                "mcp_server": "altinn-mcp",
                "client_reasoning": client_reasoning,
                "mcp_meta": mcp_meta,
            }
            
            with client.start_as_current_span(
                name=tool_name,
                input=input_data,
                metadata=span_metadata,
                level="DEFAULT"
            ) as span:
                span.update_trace(
                    user_id=team_name,
                    tags=["mcp_tool", tool_name, team_name],
                    metadata={"team_name": team_name, "client_reasoning": client_reasoning}
                )
                
                result = func(*args, **kwargs)
                span.update(output=result)
                return result
            
        except Exception as e:
            try:
                client.create_event(
                    name=f"{tool_name}_error",
                    input=input_data,
                    output={"error": str(e), "error_type": type(e).__name__},
                    metadata={
                        "tool_name": tool_name,
                        "team_name": team_name,
                        "mcp_server": "altinn-mcp",
                        "client_reasoning": client_reasoning,
                        "error_message": str(e)
                    },
                    level="ERROR"
                )
            except Exception as event_error:
                print(f"Warning: Failed to create error event: {event_error}", file=sys.stderr, flush=True)
            raise
        finally:
            try:
                client.flush()
            except Exception as flush_error:
                print(f"Warning: Failed to flush langfuse: {flush_error}", file=sys.stderr, flush=True)
    
    return wrapper
