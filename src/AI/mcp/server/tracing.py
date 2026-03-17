"""Centralized tracing utility for all MCP tool calls using Langfuse."""

import os
import functools
import inspect
import time
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

import sys

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
    
    This decorator automatically logs all tool calls to Langfuse with:
    - Tool name
    - User goal (verbatim user prompt - mandatory parameter)
    - Team name (from X-Hackathon-Name header)
    - All input parameters
    - Return value
    - Any errors
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        client = get_langfuse_client()
        
        # If Langfuse is not enabled, just call the function normally
        if client is None:
            return func(*args, **kwargs)
        
        # Extract function metadata
        tool_name = func.__name__
        
        # Extract user_goal from kwargs (it should be there as a mandatory param)
        user_goal = kwargs.get('user_goal', 'not_provided')
        
        # Get hackathon team name from HTTP header
        team_name = DEFAULT_ORG
        try:
            from fastmcp.server.dependencies import get_http_headers
            headers = get_http_headers()
            if headers:
                # Extract team name from custom header
                team_name = (
                    headers.get('x-hackathon-name') or 
                    headers.get('X-Hackathon-Name') or 
                    team_name
                )
        except Exception:
            # Not in HTTP context or headers not available, use default
            pass
        
        # Prepare input data (exclude user_goal from the logged input to avoid redundancy)
        input_data = {k: v for k, v in kwargs.items() if k != 'user_goal'}
        if args:
            # Get parameter names from function signature
            sig = inspect.signature(func)
            param_names = list(sig.parameters.keys())
            for i, arg in enumerate(args):
                if i < len(param_names) and param_names[i] != 'user_goal':
                    input_data[param_names[i]] = arg
        
        # Use correct Langfuse SDK API with context manager
        try:
            # Build metadata with team info
            span_metadata = {
                "tool_name": tool_name,
                "user_goal": user_goal,
                "team_name": team_name,
                "mcp_server": "altinity-mcp"
            }
            
            # Use start_as_current_span context manager
            with client.start_as_current_span(
                name=tool_name,
                input=input_data,
                metadata=span_metadata,
                level="DEFAULT"
            ) as span:
                # Update trace with team info
                span.update_trace(
                    user_id=team_name,
                    tags=["mcp_tool", tool_name, team_name],
                    metadata={"team_name": team_name}
                )
                
                # Execute the actual tool function
                result = func(*args, **kwargs)
                
                # Update span with output
                span.update(output=result)
                
                return result
            
        except Exception as e:
            # Error handling - span is automatically closed by context manager
            # Create an error event for this failed tool call
            try:
                client.create_event(
                    name=f"{tool_name}_error",
                    input=input_data,
                    output={"error": str(e), "error_type": type(e).__name__},
                    metadata={
                        "tool_name": tool_name,
                        "user_goal": user_goal,
                        "team_name": team_name,
                        "mcp_server": "altinity-mcp",
                        "error_message": str(e)
                    },
                    level="ERROR"
                )
            except Exception as event_error:
                print(f"Warning: Failed to create error event in langfuse: {event_error}", file=sys.stderr, flush=True)
            
            # Re-raise the exception
            raise
        finally:
            # Ensure events are flushed
            try:
                client.flush()
            except Exception as flush_error:
                print(f"Warning: Failed to flush langfuse: {flush_error}", file=sys.stderr, flush=True)
    
    return wrapper


def validate_user_goal(user_goal: Optional[str]) -> None:
    """Validate that user_goal is provided and not empty.
    
    Args:
        user_goal: The user goal string to validate
        
    Raises:
        ValueError: If user_goal is None or empty
    """
    if user_goal is None or (isinstance(user_goal, str) and user_goal.strip() == ""):
        raise ValueError(
            "user_goal is a mandatory parameter for all tool calls. "
            "Please provide a description of what you're trying to achieve."
        )
