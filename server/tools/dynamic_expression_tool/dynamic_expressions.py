from server.tools import register_tool
import os
import pathlib
from mcp.types import ToolAnnotations

from scripts.github_client import get_file

@register_tool(
    name="dynamic_expression",
    description="""
This tool provides documentation and implementation guides for dynamic expressions in Altinn Studio applications.
Use this tool when you need to implement conditional logic in forms, create dynamic validation rules, or show/hide components based on conditions.

The tool returns comprehensive documentation on dynamic expression syntax, usage examples, and best practices directly from the official Altinn documentation.

Dynamic expressions must reference valid data fields created with the datamodel_tool and often apply to components selected with the layout_components_tool.

No query parameter is needed as this tool returns complete static documentation that covers all aspects of dynamic expressions.
""",
    title="Dynamic Expression Tool",
    annotations=ToolAnnotations(
        title="Dynamic Expression Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def dynamic_expression() -> dict:
    """Provides documentation on implementing dynamic expressions in Altinn applications.
    
    Returns:
        A dictionary containing the expressions documentation and instructions for implementing dynamic expressions in Altinn applications.
    """
    try:
        # Get the expressions documentation from GitHub
        expressions = get_file("altinn", "altinn-studio-docs", "content/altinn-studio/reference/logic/expressions/_index.en.md", "master")
        
        # Load the instructions markdown file
        current_dir = pathlib.Path(__file__).parent.absolute()
        instructions_path = os.path.join(current_dir, "dynamic_expression_context.md")
        
        with open(instructions_path, "r", encoding="utf-8") as f:
            instructions = f.read()
        
        # Return both the expressions documentation and the instructions
        return {
            "status": "success", 
            "expressions": expressions,
            "instructions": instructions
        }
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

