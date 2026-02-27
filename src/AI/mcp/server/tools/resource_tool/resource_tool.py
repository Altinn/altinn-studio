from server.tools import register_tool
import os
from mcp.types import ToolAnnotations

@register_tool(
    name="resource_tool",
    description="""
Returns static documentation on text resources and translations in Altinn applications.

## Purpose
Understand how to create and manage text resources for labels, messages, and translations.

## No Parameters Required
Returns comprehensive static documentation - call ONCE per session.

## Documentation Covers
- Resource file format (resource.nb.json, resource.en.json)
- Text resource ID naming conventions
- Variable interpolation in text
- Multi-language support (nb, nn, en)
- textResourceBindings in layout components

## File Location
Text resources are stored in: `App/config/texts/`
- `resource.nb.json` - Norwegian Bokmål
- `resource.nn.json` - Norwegian Nynorsk  
- `resource.en.json` - English

## When to Use
✅ To understand text resource format and structure
✅ When creating labels for form components
✅ When implementing multi-language support
✅ Before using `resource_validator_tool`

## When NOT to Use
❌ To validate existing resources (use `resource_validator_tool` instead)
❌ Multiple times in same session (returns identical static content)

## Related Tools
- `resource_validator_tool`: Validate text resource files
- `layout_components_tool`: Components use textResourceBindings
- `datamodel_tool`: Resources can reference data fields
""",
    title="Resource Tool",
    annotations=ToolAnnotations(
        title="Resource Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def resource_tool(user_goal: str) -> dict:
    """Provides documentation on implementing text resources and translations in Altinn applications.

    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)

    Returns:
        A dictionary containing the markdown documentation for Altinn Studio resources.
    """
    try:
        doc_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tools", "resource_tool", "resource_context.md")
        with open(doc_path, 'r') as f:
            markdown_content = f.read()
        return {"status": "success", "content": markdown_content}
    except FileNotFoundError:
        return {"status": "error", "message": f"Documentation file not found. Please ensure the resource_context.md is in {doc_path}."}