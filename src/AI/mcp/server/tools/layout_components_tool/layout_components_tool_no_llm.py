"""Tool to fetch layout components from Altinn Studio repositories - returns all components without LLM filtering."""

# Standard library imports
import json
from typing import List, Dict, Any, Optional

# Third-party imports
from mcp.types import (
    ToolAnnotations,
)

# Local imports
from server.tools import register_tool
from scripts.gitea_client import get_directory_files
from server.config import COMPONENT_SELECTION_CONFIG


@register_tool(
    name="layout_components_tool",
    description="""
Retrieves ALL available Altinn Studio layout component examples from the component library.

Use this tool to get the complete list of UI components (Header, Input, DatePicker, Dropdown, Checkboxes, etc.) with their example configurations.

Returns a list of components, each containing:
- `component_type`: The type of component (e.g., "Input", "Header", "Datepicker")
- `component_id`: The example component's ID
- `file_name`: Source file name
- `content`: Full component configuration JSON

You should filter and select the relevant components from the returned list based on your task context.

After selecting components:
- Use `datamodel_tool` to create or adjust data model bindings.
- Use `resource_tool` to create or update text resources.
""",
    title="Layout Components Tool",
    annotations=ToolAnnotations(
        title="Layout Components Tool",
        readOnlyHint=True
    )
)
def layout_components_tool_no_llm(user_goal: str) -> dict:
    """Retrieve all UI component examples from the Altinn Studio component library.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)

    Returns:
        A dictionary containing all component files from the component library.
        The dictionary contains the following keys:
        - status: The status of the request (possible error)
        - message: A detailed message (error message if error)
        - components: A list of all available components with their configurations
    """
    # Get headers from FastMCP context for per-request authentication
    try:
        from fastmcp.server.dependencies import get_http_headers
        headers = get_http_headers()
    except Exception:
        # Not in HTTP context (e.g., stdio transport or testing)
        headers = None

    return run_component_pipeline_no_llm(headers)


def run_component_pipeline_no_llm(headers: Optional[dict] = None) -> Dict[str, Any]:
    """Run the component retrieval pipeline without LLM filtering.

    Args:
        headers: Optional HTTP headers for multi-tenant authentication

    Returns:
        Dictionary with status, message, and all components
    """
    try:
        print("Fetching all components from component library...")

        # Get all components from the component library
        try:
            all_components = get_directory_files(
                COMPONENT_SELECTION_CONFIG["REPO_OWNER"],
                COMPONENT_SELECTION_CONFIG["REPO_NAME"],
                COMPONENT_SELECTION_CONFIG["LAYOUTS_PATH"],
                headers
            )
            if not all_components:
                return {
                    "status": "api_no_components",
                    "message": "No component files found in the repository."
                }
                
            print(f"Fetched {len(all_components)} component files from repository")
        except Exception as e:
            # Use exception type name as status and full message as message
            status = type(e).__name__.lower()
            message = "Error accessing Altinn Studio API: " + str(e)
            return {"status": status, "message": message}
        
        # Parse and extract all components from all files
        parsed_components = []
        for component_file in all_components:
            file_name = component_file.get("name", "")
            content = component_file.get("content", "")
            
            try:
                parsed_content = json.loads(content)
                # The layout components are nested under data.layout
                components = parsed_content.get("data", {}).get("layout", [])
                
                for component in components:
                    component_id = component.get("id", "")
                    component_type = component.get("type", "")
                    parsed_components.append({
                        "file_name": file_name,
                        "component_id": component_id,
                        "component_type": component_type,
                        "content": component
                    })
            except json.JSONDecodeError as e:
                print(f"Error parsing component file {file_name}: {e}")
                continue
        
        if parsed_components:
            return {
                "status": "success",
                "message": f"Retrieved {len(parsed_components)} components from {len(all_components)} files. Select the relevant components based on your needs.",
                "components": parsed_components
            }
        else:
            return {
                "status": "no_components_parsed",
                "message": "Could not parse any components from the repository files.",
                "components": []
            }
            
    except Exception as e:
        # Use exception type name as status and full message as message
        status = type(e).__name__.lower()
        message = str(e)
        return {"status": status, "message": message}
