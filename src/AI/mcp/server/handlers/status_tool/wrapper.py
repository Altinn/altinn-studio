"""
altinn_status - Server readiness status tool.

Reports whether the MCP server and its subsystems (e.g. documentation index)
are fully ready.  Intended for programmatic health checks by agents.
"""

from typing import Dict, Any
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
)


@register_tool(
    name="altinn_status",
    description="Check MCP server readiness (documentation indexing, etc.).",
    category=ToolCategory.DOCS,
    mode=OperationMode.ONCE_PER_SESSION,
)
def server_status() -> Dict[str, Any]:
    """Return current server readiness status.

    Response includes:
    - ``docs_ready``  – True when the documentation index is built.
    - ``docs_indexing`` – True while background indexing is in progress.
    """
    from server.handlers.planning_tool.doc_search import get_doc_search

    search = get_doc_search()

    return ToolSuccess(
        content="Server status retrieved.",
    ).to_dict() | {
        "docs_ready": search.is_ready,
        "docs_indexing": search.is_indexing,
    }
