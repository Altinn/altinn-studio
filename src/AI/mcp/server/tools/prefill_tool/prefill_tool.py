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
