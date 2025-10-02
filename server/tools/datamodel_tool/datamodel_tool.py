"""Tool to provide data model documentation."""
import os
from server.tools import register_tool
from mcp.types import ToolAnnotations

@register_tool(
    name="datamodel_tool",
    description="""
This tool provides comprehensive documentation on Altinn Studio datamodels and data bindings.
Use this tool when you need to understand data models and bindings in Altinn applications, create or modify a data model, or reference XSD schemas in Altinn.

Datamodel changes are required when:
- Adding new form components (after using layout_components_tool)
- Implementing dynamic expressions that reference data fields
- Setting up prefill configurations

No query parameter is needed as this tool returns static documentation that covers all aspects of Altinn datamodels.
Whenever making changes to data models, all three datamodel files (model.cs, model.xsd and model.schema.json) should be updated.
""",
    title="Datamodel Tool",
    annotations=ToolAnnotations(
        title="Datamodel Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def datamodel_tool() -> dict:
    """Provides documentation on Altinn Studio datamodels and data structures.
    
    Returns:
        A dictionary containing the markdown documentation for Altinn Studio datamodels.
    """
    try:
        doc_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tools", "datamodel_tool", "datamodel_context.md")
        with open(doc_path, "r", encoding="utf-8") as f:
            markdown_content = f.read()
        return {"status": "success", "content": markdown_content}
    except FileNotFoundError:
        return {"status": "error", "message": f"Documentation file not found. Please ensure datamodel_context.md exists in {doc_path}."}


if __name__ == "__main__":
    datamodel_tool()
