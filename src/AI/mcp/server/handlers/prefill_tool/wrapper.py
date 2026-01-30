"""altinn_prefill_docs - Prefill documentation tool."""

import pathlib
from typing import Dict, Any
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
)


@register_tool(
    name="altinn_prefill_docs",
    description="Get documentation on Altinn form prefilling from external data sources.",
    category=ToolCategory.DOCS,
    mode=OperationMode.ONCE_PER_SESSION,
)
def prefill_docs() -> Dict[str, Any]:
    """Get static documentation on Altinn prefill functionality."""
    current_dir = pathlib.Path(__file__).parent
    doc_path = current_dir / "prefill_context.md"
    
    if doc_path.exists():
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = "# Altinn Prefill Documentation\n\nPrefill allows pre-populating form fields from external data sources."
    
    return ToolSuccess(content=content).to_dict()
