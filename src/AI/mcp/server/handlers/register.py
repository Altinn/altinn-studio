"""
Registration module for Altinn MCP tools.

This module handles registering all tools with the MCP server instance.
"""

from typing import Any, Dict, List
from fastmcp import FastMCP


def register_tools(mcp: FastMCP) -> List[str]:
    """Register all tools with the MCP instance.
    
    Args:
        mcp: The FastMCP server instance.
    
    Returns:
        List of registered tool names.
    """
    # Import all tool modules to populate the registry
    from .router_tool.wrapper import route_tool
    from .help_tool.wrapper import help_tool
    from .planning_tool.wrapper import planning
    from .datamodel_tool.wrapper import datamodel_docs, datamodel_sync
    from .layout_tool.wrapper import layout_list, layout_props, layout_validate
    from .policy_tool.wrapper import policy_docs, policy_summarize, policy_validate
    from .resource_tool.wrapper import resource_docs, resource_validate
    from .prefill_tool.wrapper import prefill_docs
    from .dynamic_expression_tool.wrapper import expression_docs
    
    from .types import get_tool_registry
    
    registered = []
    
    for tool_info in get_tool_registry():
        name = tool_info["name"]
        func = tool_info["func"]
        description = tool_info["description"]
        
        # Register with FastMCP
        mcp.tool(name=name, description=description)(func)
        registered.append(name)
    
    return registered


def get_tool_catalog() -> Dict[str, Any]:
    """Get a catalog of all tools for documentation purposes.
    
    Returns:
        Dictionary with tool information organized by category.
    """
    from .types import get_tool_registry
    
    catalog = {
        "router": [],
        "docs": [],
        "discovery": [],
        "validation": [],
        "generation": [],
    }
    
    for tool_info in get_tool_registry():
        category = tool_info["category"]
        if category in catalog:
            catalog[category].append({
                "name": tool_info["name"],
                "description": tool_info["description"],
                "mode": tool_info["mode"],
                "prerequisites": tool_info["prerequisites"],
            })
    
    return catalog


# Server Instructions (minimal, routing-focused)
INSTRUCTIONS = """
# Altinn MCP Server

Tools for building Altinn Studio applications.

## Entry Point
Use `altinn_route` with your task to get guidance on which tools to call.

## Tool Naming
All tools use `altinn_<domain>_<verb>` naming:
- `altinn_route` - Get routing guidance
- `altinn_help` - Get detailed documentation
- `altinn_planning` - Get development guidelines and search docs
- `altinn_datamodel_docs` / `altinn_datamodel_sync`
- `altinn_layout_list` / `altinn_layout_props` / `altinn_layout_validate`
- `altinn_resource_docs` / `altinn_resource_validate`
- `altinn_policy_docs` / `altinn_policy_summarize` / `altinn_policy_validate`
- `altinn_prefill_docs`
- `altinn_expression_docs`

## Key Rules
1. Docs tools return static content - call once per session
2. Validation tools return structured errors with `recommended_tool`
3. `altinn_policy_validate` requires output from `altinn_policy_summarize`
4. `altinn_layout_props` should be called for each component type before creating layouts
"""
