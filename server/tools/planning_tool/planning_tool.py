"""Tool to provide planning instructions for Windsurf client."""
import os
import pathlib
from server.tools import register_tool
from mcp.types import (
    ToolAnnotations,
)
@register_tool(
    name="planning_tool",
    description="""
    This tool provides comprehensive documentation on Altinn Studio planning.
    Use this tool when you need to understand planning in Altinn Studio, create or modify a plan, or reference XSD schemas in Altinn.

    No query parameter is needed as this tool returns static documentation that covers all aspects of Altinn planning.
    """,
    title="Planning Tool",
    annotations=ToolAnnotations(
        readOnlyHint=True,
        idempotentHint=True
    )
)
def planning_tool() -> dict:
    """Returns static markdown documentation for Altinn planning.
    The starting point for any use of MCP tools for Altinn application development.
    Gives guidelines on how to structure plans and what tools to use.
    
    Returns:
        A dictionary containing the planning instructions for Altinn applications.
    """
    try:        
        # Load the instructions markdown file
        current_dir = pathlib.Path(__file__).parent.absolute()
        instructions_path = os.path.join(current_dir, "planning_context.md")
        
        with open(instructions_path, "r", encoding="utf-8") as f:
            instructions = f.read()
        
        # Return the instructions
        return {
            "status": "success", 
            "content": instructions
        }
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
