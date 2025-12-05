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

## Purpose
Get the complete catalog of UI components with working example configurations.

## No Parameters Required
This tool returns ALL components - no filtering needed. You select relevant ones from the results.

## Returns
- `status`: "success" | "error" | "api_no_components"
- `message`: Summary of results
- `components`: List of all components, each with:
  - `component_type`: Type name (e.g., "Input", "Checkboxes", "Datepicker")
  - `component_id`: Example component ID
  - `file_name`: Source file
  - `content`: Complete component JSON configuration

## Available Component Types
Common types include: Input, TextArea, Checkboxes, RadioButtons, Dropdown, Datepicker, 
Header, Paragraph, Button, FileUpload, Image, Panel, Group, RepeatingGroup, and more.

## When to Use
✅ To discover available component types and their example configurations
✅ Call ONCE at the start of layout development
✅ Before `layout_properties_tool` to identify which component types you need

## When NOT to Use
❌ Multiple times in same session - returns identical data, wastes resources
❌ To get property details for a component (use `layout_properties_tool` instead)
❌ To validate existing JSON (use `schema_validator_tool` instead)

## ⚠️ IMPORTANT: This is Step 1 of 4
```
1. layout_components_tool()                          ← Call ONCE to see all components
2. layout_properties_tool(component_type) × N        ← Call for EACH component type you will use
3. [Create your layout JSON using the schemas]
4. schema_validator_tool(json)                       ← Validate before finishing
```

## ❌ WRONG: Calling Multiple Times
This tool returns ALL components in one call. Do NOT call it repeatedly.
```
layout_components_tool()  ← First call - OK
layout_components_tool()  ← Second call - WRONG, wastes resources, identical results
```

## After Using This Tool
- Use `datamodel_tool` to create data bindings for form components
- Use `resource_tool` to create text resources for labels
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
                    "error_code": "EMPTY_REPOSITORY",
                    "message": "NO_COMPONENTS: No component files found in the component library repository. "
                               "This may indicate a configuration issue or the repository is empty.",
                    "hint": "This is likely a server configuration issue, not a usage error. Contact support if this persists.",
                    "retry_allowed": False
                }
                
            print(f"Fetched {len(all_components)} component files from repository")
        except Exception as e:
            # Use exception type name as status and full message as message
            error_type = type(e).__name__
            return {
                "status": "error",
                "error_code": f"API_ERROR_{error_type.upper()}",
                "message": f"API_ACCESS_ERROR: Failed to access Altinn Studio component library. Error: {str(e)}",
                "hint": "This may be a temporary network issue or authentication problem. "
                        "If using authenticated mode, verify your credentials are valid.",
                "retry_allowed": True  # Network errors may be transient
            }
        
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
