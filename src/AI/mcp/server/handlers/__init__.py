"""Tools package for the Altinn MCP server.

This module provides:
1. register_tool - decorator for tool registration (new style with category/mode)
2. Structured response types (ToolError, ToolSuccess, etc.)
3. Legacy compatibility for old-style tool decorators
"""

# Re-export from types module (new-style registration)
from .types import (
    register_tool as _register_tool_new,
    ToolCategory,
    OperationMode,
    ToolError,
    ToolSuccess,
    ToolRecommendation,
    RouteResult,
    PrerequisiteError,
    require_prerequisite,
    SCHEMA_HINTS,
    get_tool_registry,
    get_tool_by_name,
)


def register_tool(name=None, description=None, title=None, annotations=None, meta=None,
                  category=None, mode=None, prerequisites=None, schema_hints=None):
    """Unified register_tool decorator supporting both old and new styles.
    
    Old style (legacy): name, description, title, annotations, meta
    New style: name, description, category, mode, prerequisites, schema_hints
    
    If category is provided, uses new-style registration.
    Otherwise, returns function unchanged (legacy tools are called via wrappers).
    """
    using_v2 = any(
        value is not None
        for value in (category, mode, prerequisites, schema_hints)
    )

    if using_v2:
        if category is None or mode is None:
            raise TypeError(
                "register_tool() requires both 'category' and 'mode' for v2 registration"
            )
        # New-style registration
        return _register_tool_new(
            name=name,
            description=description,
            category=category,
            mode=mode,
            prerequisites=prerequisites,
            schema_hints=schema_hints
        )
    else:
        # Legacy style - just return the function unchanged
        # The actual MCP registration happens via wrapper files
        def decorator(func):
            return func
        return decorator
