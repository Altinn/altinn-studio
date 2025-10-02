from server.tools import register_tool
import os
from mcp.types import ToolAnnotations

@register_tool(
    name="resource_tool",
    description="""
This tool provides documentation on implementing text resources and translations in Altinn applications.
Use this tool when you need to work with text resources, implement multi-language support, or understand resource file structure in Altinn Studio.

The tool returns comprehensive documentation covering resource file formats, implementation strategies, and best practices for localization.
Resources must match component IDs created with the layout_components_tool and can reference data which require the datamodel_tool.

Resource files are located in App/config/texts/ within the Altinn Studio application. This is the standard location where all text resources for the application are stored and managed.

No query parameter is needed as this tool returns static documentation that covers all aspects of Altinn resources.
""",
    title="Resource Tool",
    annotations=ToolAnnotations(
        title="Resource Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def resource_tool() -> dict:
    """Provides documentation on implementing text resources and translations in Altinn applications.

    Returns:
        A dictionary containing the markdown documentation for Altinn Studio resource tool.
    """
    try:
        doc_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tools", "resource_tool", "resource_context.md")
        with open(doc_path, 'r') as f:
            markdown_content = f.read()
        return {"status": "success", "content": markdown_content}
    except FileNotFoundError:
        return {"status": "error", "message": f"Documentation file not found. Please ensure the resource_context.md is in {doc_path}."}