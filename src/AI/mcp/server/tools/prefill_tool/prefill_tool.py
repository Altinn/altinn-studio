"""Tool to provide prefill configuration documentation."""
import os
import pathlib
from typing import Any, Dict

import requests
from server.tools import register_tool
from mcp.types import ToolAnnotations


def _format_schema(schema: Dict[str, Any]) -> str:
    lines = []

    description = schema.get("description")
    if description:
        lines.append(description)
        lines.append("")

    properties = schema.get("properties", {})
    if properties:
        lines.append("### Top-Level Properties")
        for name, details in properties.items():
            type_part = details.get("type")
            description_part = details.get("description", "")
            ref = details.get("$ref")
            ref_note = f" Reference: `{ref.split('/')[-1]}`." if ref else ""
            type_label = f" ({type_part})" if type_part else ""
            lines.append(f"- **`{name}`**{type_label}: {description_part}{ref_note}")
        lines.append("")

    definitions = schema.get("definitions", {})
    if definitions:
        lines.append("### Definitions")
        for def_name, definition in definitions.items():
            lines.append(f"#### `{def_name}`")
            def_desc = definition.get("description")
            if def_desc:
                lines.append(def_desc)
            properties = definition.get("properties", {})
            for field_name, field_info in properties.items():
                type_part = field_info.get("type")
                title = field_info.get("title")
                description_part = field_info.get("description", "")
                type_label = f" ({type_part})" if type_part else ""
                title_label = f" – {title}" if title and title != field_name else ""
                line = f"- **`{field_name}`**{type_label}{title_label}"
                if description_part:
                    line += f": {description_part}"
                lines.append(line)
            lines.append("")

    return "\n".join(line for line in lines if line).strip()

@register_tool(
    name="prefill_tool",
    description="""
Returns static documentation on data prefill functionality in Altinn applications.

## Purpose
Understand how to pre-populate form fields with data from external sources.

## No Parameters Required
Returns comprehensive static documentation + schema reference - call ONCE per session.

## Documentation Covers
- Prefill configuration file format (prefill.json)
- Available data sources:
  - `userProfile`: Current user's profile data
  - `party`: Party (person/organization) data
  - `instanceOwner`: Instance owner information
  - `register`: Data from national registers
- Field mapping syntax
- Conditional prefill logic

## File Location
Prefill configuration: `App/config/prefill/prefill.json`

## Data Source Considerations
⚠️ `userProfile` refers to the SUBMITTING user, which may differ from the subject of the form
⚠️ When representing an organization, party data contains org info, not user info
⚠️ Prefill fields must match your datamodel structure

## When to Use
✅ To understand prefill configuration options
✅ When implementing automatic form field population
✅ To learn about available data sources
✅ When debugging prefill issues

## When NOT to Use
❌ To understand datamodel structure (use `datamodel_tool` instead)
❌ Multiple times in same session (returns identical static content)

## Related Tools
- `datamodel_tool`: Prefill fields must match datamodel structure
- `layout_components_tool`: Components receive prefilled data via dataModelBindings
""",
    title="Prefill Tool",
    annotations=ToolAnnotations(
        title="Prefill Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def prefill_tool(user_goal: str) -> dict:
    """Provides documentation on implementing data prefill functionality in Altinn applications.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
        
    Returns:
        A dictionary containing the markdown documentation for Altinn Studio prefill functionality.
    """
    try:        
        # Load the instructions markdown file
        current_dir = pathlib.Path(__file__).parent.absolute()
        instructions_path = os.path.join(current_dir, "prefill_context.md")
        
        with open(instructions_path, "r", encoding="utf-8") as f:
            instructions = f.read()
        
        schema_url = "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json"
        schema_response = requests.get(schema_url, timeout=10)
        schema_response.raise_for_status()
        schema = schema_response.json()

        schema_markdown = _format_schema(schema)
        content_with_schema = (
            f"{instructions}\n\n---\n\n## Prefill Schema Reference\n\n{schema_markdown}"
        )

        # Return the instructions and schema details
        return {
            "status": "success",
            "content": content_with_schema,
            "schema": schema
        }
    
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    prefill_tool()
