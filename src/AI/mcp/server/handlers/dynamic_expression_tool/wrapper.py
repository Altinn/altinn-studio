"""altinn_expression_docs - Dynamic expression documentation tool."""

import pathlib
from typing import Dict, Any
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
)


@register_tool(
    name="altinn_expression_docs",
    description="Get documentation on Altinn dynamic expressions for conditional logic.",
    category=ToolCategory.DOCS,
    mode=OperationMode.ONCE_PER_SESSION,
)
def expression_docs() -> Dict[str, Any]:
    """Get static documentation on Altinn dynamic expressions."""
    current_dir = pathlib.Path(__file__).parent
    doc_path = current_dir / "dynamic_expression_context.md"
    
    if doc_path.exists():
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = "# Altinn Dynamic Expressions\n\nDynamic expressions allow conditional logic in layouts."
    
    return ToolSuccess(content=content).to_dict()
