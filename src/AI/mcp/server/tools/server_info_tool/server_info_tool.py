"""Tool for getting server information."""

from typing import Dict, Any
from server.tools import register_tool


@register_tool(
    name="server_info",
    description="""
Get information about the Altinity MCP server.

Returns basic server information including version, status, and capabilities.

Returns:
- version: Server version
- status: Server status ("running")
""",
)
def server_info() -> Dict[str, Any]:
    """Get server information including version and status.

    Returns:
        Dictionary with server information
    """
    return {
        "version": "1.0.0",
        "status": "running",
        "description": "Altinity MCP server for Altinn Studio development and automation"
    }
