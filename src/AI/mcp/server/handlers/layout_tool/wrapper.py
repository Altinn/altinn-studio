"""
altinn_layout_list - List available UI components.
altinn_layout_props - Get component property schema.
altinn_layout_validate - Validate layout JSON.
"""

import json
from typing import Dict, Any, Optional
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolError,
)

LAYOUT_SCHEMA_URL = "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"


@register_tool(
    name="altinn_layout_list",
    description="Get all available Altinn UI component examples with configurations.",
    category=ToolCategory.DISCOVERY,
    mode=OperationMode.ONCE_PER_SESSION,
)
def layout_list() -> Dict[str, Any]:
    """Get all available UI component examples."""
    try:
        from .layout_components_tool_no_llm import run_component_pipeline_no_llm
        
        try:
            from fastmcp.server.dependencies import get_http_headers
            headers = get_http_headers()
        except Exception:
            headers = None
        
        result = run_component_pipeline_no_llm(headers)
        
        if result.get("status") != "success":
            return ToolError(
                error_code=result.get("error_code", "COMPONENT_ERROR"),
                message=result.get("message", "Failed to retrieve components"),
            ).to_dict()
        
        components = result.get("components", [])
        
        if not components:
            return ToolError(
                error_code="NO_COMPONENTS",
                message="No components found in component library",
            ).to_dict()
        
        component_types = sorted(set(c.get("component_type", "Unknown") for c in components))
        
        return {
            "status": "success",
            "component_count": len(components),
            "component_types": component_types,
            "components": components,
            "next_steps": [
                {
                    "tool": "altinn_layout_props",
                    "reason": "Get the property schema for each component type you will use",
                    "args_template": {
                        "component_type": "<TYPE_FROM_LIST>",
                        "schema_url": LAYOUT_SCHEMA_URL,
                    },
                },
            ],
        }
        
    except ImportError as e:
        return ToolError(
            error_code="COMPONENTS_NOT_AVAILABLE",
            message=f"Layout components module could not be loaded: {str(e)}",
        ).to_dict()


@register_tool(
    name="altinn_layout_props",
    description="Get the valid properties schema for a specific component type.",
    category=ToolCategory.DISCOVERY,
    mode=OperationMode.IDEMPOTENT,
    schema_hints={
        "component_type": "Component type from altinn_layout_list (e.g., 'Input', 'Checkboxes').",
        "schema_url": "MUST be from altinncdn.no domain.",
    },
)
def layout_props(
    component_type: str,
    schema_url: str = LAYOUT_SCHEMA_URL,
) -> Dict[str, Any]:
    """Get the property schema for a specific component type.
    
    Args:
        component_type: The component type (e.g., "Input", "Checkboxes").
        schema_url: URL to the Altinn layout schema.
    """
    if not component_type or not component_type.strip():
        return ToolError(
            error_code="MISSING_COMPONENT_TYPE",
            message="component_type is required",
            recommended_tool="altinn_layout_list",
            why="Get the list of available component types first",
        ).to_dict()
    
    try:
        from .layout_properties_tool import layout_properties_tool as get_props
        
        result = get_props(
            user_goal="",
            component_type=component_type,
            schema_url=schema_url,
        )
        
        if result.get("status") == "error":
            return ToolError(
                error_code=result.get("error_code", "PROPS_ERROR"),
                message=result.get("message", "Failed to get component properties"),
            ).to_dict()
        
        return {
            "status": "success",
            "component_type": component_type,
            "properties": result.get("properties", {}),
            "required": result.get("required", []),
            "next_steps": [
                {
                    "tool": "altinn_layout_validate",
                    "reason": "Validate your layout JSON after creating it",
                }
            ],
        }
        
    except ImportError as e:
        return ToolError(
            error_code="PROPS_NOT_AVAILABLE",
            message=f"Layout properties module could not be loaded: {str(e)}",
        ).to_dict()


@register_tool(
    name="altinn_layout_validate",
    description="Validate layout JSON against the official Altinn schema.",
    category=ToolCategory.VALIDATION,
    mode=OperationMode.IDEMPOTENT,
    schema_hints={
        "json_content": "Complete layout JSON as a string.",
        "schema_url": "MUST be from altinncdn.no domain.",
    },
)
def layout_validate(
    json_content: str,
    schema_url: str = LAYOUT_SCHEMA_URL,
) -> Dict[str, Any]:
    """Validate layout JSON against Altinn schema.
    
    Args:
        json_content: The layout JSON content as a string.
        schema_url: URL to the Altinn layout schema.
    """
    if not json_content or not json_content.strip():
        return ToolError(
            error_code="MISSING_JSON_CONTENT",
            message="json_content is required and must not be empty",
        ).to_dict()
    
    try:
        json.loads(json_content)
    except json.JSONDecodeError as e:
        return ToolError(
            error_code="INVALID_JSON",
            message=f"json_content is not valid JSON: {e}",
        ).to_dict()
    
    try:
        from .schema_validator_tool import schema_validator_tool as validate_schema
        
        result = validate_schema(
            user_goal="",
            json_obj=json_content,
            schema_path=schema_url,
        )
        
        if result.get("status") == "validation_passed":
            return {
                "status": "success",
                "valid": True,
                "message": "Layout JSON is valid",
            }
        else:
            return {
                "status": "success",
                "valid": False,
                "errors": result.get("errors", []),
                "error_summary": result.get("error_summary", ""),
            }
            
    except ImportError as e:
        return ToolError(
            error_code="VALIDATOR_NOT_AVAILABLE",
            message=f"Schema validator module could not be loaded: {str(e)}",
        ).to_dict()
