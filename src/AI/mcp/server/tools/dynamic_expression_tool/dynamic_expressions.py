from server.tools import register_tool
import os
import pathlib
from mcp.types import ToolAnnotations

from scripts.github_client import get_file

@register_tool(
    name="dynamic_expression",
    description="""
Returns static documentation on dynamic expressions for conditional logic in Altinn forms.

## Purpose
Understand how to implement conditional show/hide, validation, and calculations in forms.

## No Parameters Required
Returns comprehensive static documentation - call ONCE per session.

## Documentation Covers
- Expression syntax and operators
- Conditional visibility (hidden property)
- Dynamic validation rules
- Calculated values
- Available functions and operators
- Data field references

## Common Use Cases
- **Show/hide components**: `"hidden": ["equals", ["dataModel", "field"], "value"]`
- **Conditional required**: Make fields required based on other values
- **Calculated fields**: Auto-compute values from other fields
- **Dynamic validation**: Validate based on complex conditions

## Expression Syntax
Expressions use array-based syntax:
```json
["operator", "operand1", "operand2"]
["equals", ["dataModel", "someField"], "expectedValue"]
```

## When to Use
✅ To understand dynamic expression syntax
✅ When implementing conditional component visibility
✅ When creating dynamic validation rules
✅ When implementing calculated fields

## When NOT to Use
❌ To understand datamodel structure (use `datamodel_tool` instead)
❌ To find component examples (use `layout_components_tool` instead)
❌ Multiple times in same session (returns identical static content)

## Related Tools
- `datamodel_tool`: Expressions reference datamodel fields
- `layout_components_tool`: Components use expressions in hidden, required, etc.
- `schema_validator_tool`: Validate layouts containing expressions
""",
    title="Dynamic Expression Tool",
    annotations=ToolAnnotations(
        title="Dynamic Expression Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def dynamic_expression(user_goal: str) -> dict:
    """Provides documentation on implementing dynamic expressions in Altinn applications.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
    
    Returns:
        A dictionary containing the markdown documentation for Altinn Studio dynamic expressions.
    """
    try:
        # Get the expressions documentation from GitHub
        expressions = get_file("altinn", "altinn-studio-docs", "content/altinn-studio/v8/reference/logic/dynamic/_index.en.md", "master")
        
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
    

