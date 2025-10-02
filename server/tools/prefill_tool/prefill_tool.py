"""Tool to provide prefill configuration documentation."""
import os
import pathlib
from server.tools import register_tool
from mcp.types import ToolAnnotations

@register_tool(
    name="prefill_tool",
    description="""
This tool provides documentation on implementing data prefill (prepopulating form fields with data from external sources) functionality in Altinn applications.
Use this tool when you need to implement form prefilling functionality, understand data sources for prefill, or configuring prefill settings.

It is crucial to consider the different data sources and which one is the correct one in the prefill context. 
For example, the userProfile data source refers to the user submitting the form, but also contains information about the represented person or organization. 

Prefill configurations must match the data structure defined with the datamodel_tool.

No query parameter is needed as this tool returns static documentation that covers all aspects of Altinn prefill functionality.
""",
    title="Prefill Tool",
    annotations=ToolAnnotations(
        title="Prefill Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def prefill_tool() -> dict:
    """Provides documentation on implementing data prefill functionality in Altinn applications.
        
    Returns:
        Instructions for implementing prefill in Altinn applications.
    """
    try:        
        # Load the instructions markdown file
        current_dir = pathlib.Path(__file__).parent.absolute()
        instructions_path = os.path.join(current_dir, "prefill_context.md")
        
        with open(instructions_path, "r", encoding="utf-8") as f:
            instructions = f.read()
        
        # Return the instructions
        return {
            "status": "success", 
            "content": instructions
        }
    
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    prefill_tool()
