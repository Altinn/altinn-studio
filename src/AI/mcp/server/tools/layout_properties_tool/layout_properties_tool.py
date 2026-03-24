import json
from typing import Dict, Any, Set, Optional, Tuple
import requests
from urllib.parse import urlparse

from server.tools import register_tool
from mcp.types import (
    ToolAnnotations,
)


@register_tool(
    name="layout_properties_tool",
    description="""
⚠️ MANDATORY before creating any layout component - retrieves the valid properties schema.

## Purpose
Get the allowed properties, required properties, and specifications for a component type.
**You MUST call this for EACH component type you plan to use in your layout.**

## Required Parameters
- `component_type`: The component type name (e.g., "Input", "Datepicker", "NavigationButtons")
- `schema_url`: URL to the layout schema (MUST be from altinncdn.no domain)

## Valid schema_url
✅ `https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json`

## Invalid schema_url Examples  
❌ `https://example.com/schema.json` - Wrong domain
❌ `http://altinncdn.no/...` - Must use HTTPS
❌ `layout.schema.v1.json` - Must be full URL

## Returns
- `allowed_properties`: List of all valid properties for the component
- `required_properties`: Properties that MUST be specified
- `property_details`: Type, description, enum values for each property

## ⚠️ MANDATORY: Call for Each Component Type
If your layout uses Input, Datepicker, and NavigationButtons, you MUST call this 3 times:
```
layout_properties_tool(component_type="Input", schema_url="...")
layout_properties_tool(component_type="Datepicker", schema_url="...")
layout_properties_tool(component_type="NavigationButtons", schema_url="...")
```
Without these calls, you will use invalid properties and create broken layouts.

## When to Use
✅ REQUIRED for every component type before creating layout JSON
✅ After `layout_components_tool` to get schemas for components you'll use
✅ When validation fails to understand what properties are valid

## When NOT to Use
❌ To find component examples (use `layout_components_tool` first)
❌ To validate existing JSON (use `schema_validator_tool` instead)

## Position in Workflow
```
1. layout_components_tool()           ← Discover components (call once)
2. layout_properties_tool() × N       ← YOU ARE HERE - call for each component type
3. [Create layout JSON]
4. schema_validator_tool()            ← Validate your layout
```
""",
    annotations=ToolAnnotations(
        title="Layout Component Schema Tool",
        readOnlyHint=True
    )
)
def layout_properties_tool(
    user_goal: str,
    component_type: str,
    schema_url: str
) -> Dict[str, Any]:
    """
    Retrieves schema information for a specific Altinn Studio component type.
    
    Args:
        component_type: Type of component to get schema for (e.g., "Input", "Button")
        schema_url: Direct URL to the schema file
        
    Returns:
        Dictionary containing schema information with allowed properties and details
    """
    try:
        # Load the schema
        try:
            schema = load_layout_schema_from_url(schema_url)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error loading schema: {str(e)}",
                "allowed_properties": [],
                "required_properties": [],
                "property_details": {}
            }
        
        # Find the component definition in the schema
        component_def = find_component_definition(schema, component_type)
        if not component_def:
            return {
                "status": "error",
                "error_code": "COMPONENT_NOT_FOUND",
                "message": f"Component type '{component_type}' not found in schema. "
                           f"Verify the component_type is spelled correctly with proper casing (e.g., 'Input' not 'input'). "
                           f"Common component types: Input, Checkboxes, RadioButtons, Dropdown, Datepicker, TextArea, Header, Paragraph, Button. "
                           f"DO NOT RETRY with the same component_type - use layout_components_tool to discover valid component types.",
                "allowed_properties": [],
                "required_properties": [],
                "property_details": {},
                "hint": "Use layout_components_tool first to see all available component types and their exact names."
            }
        
        # Extract schema metadata
        allowed_properties, required_properties, property_details = extract_schema_metadata(component_def, schema)
        
        return {
            "status": "success",
            "message": f"Schema information retrieved for component type '{component_type}'",
            "allowed_properties": sorted(list(allowed_properties)),
            "required_properties": sorted(list(required_properties)),
            "property_details": property_details
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error retrieving schema: {str(e)}",
            "allowed_properties": [],
            "required_properties": [],
            "property_details": {}
        }


def extract_schema_metadata(
    schema_def: Dict[str, Any], 
    full_schema: Dict[str, Any]
) -> Tuple[Set[str], Set[str], Dict[str, Any]]:
    """Extract allowed properties, required properties, and property details from schema.
    
    Args:
        schema_def: The schema definition to analyze
        full_schema: The complete schema for resolving $ref references
        
    Returns:
        Tuple of (allowed_properties, required_properties, property_details)
    """
    allowed_properties = set()
    required_properties = set()
    property_details = {}
    
    def is_boolean_only_object(obj: Dict[str, Any]) -> bool:
        """Check if an object contains only boolean properties (property availability indicators)."""
        if not isinstance(obj, dict):
            return False
        
        for value in obj.values():
            if not isinstance(value, bool):
                return False
        return True
    
    def traverse_schema(obj: Dict[str, Any], path_prefix: str = ""):
        """Recursively traverse schema to extract properties."""
        if isinstance(obj, dict):
            # Handle properties
            if "properties" in obj:
                props = obj["properties"]
                if isinstance(props, dict) and not is_boolean_only_object(props):
                    for prop_name, prop_def in props.items():
                        full_prop_name = f"{path_prefix}.{prop_name}" if path_prefix else prop_name
                        allowed_properties.add(full_prop_name)
                        
                        # Extract property details
                        property_details[full_prop_name] = extract_property_details(prop_def, full_schema)
                        
                        # Recursively process nested properties
                        if isinstance(prop_def, dict):
                            traverse_schema(prop_def, full_prop_name)
            
            # Handle required properties
            if "required" in obj and isinstance(obj["required"], list):
                for req_prop in obj["required"]:
                    full_req_prop = f"{path_prefix}.{req_prop}" if path_prefix else req_prop
                    required_properties.add(full_req_prop)
            
            # Handle allOf, anyOf, oneOf
            for key in ["allOf", "anyOf", "oneOf"]:
                if key in obj and isinstance(obj[key], list):
                    for item in obj[key]:
                        traverse_schema(item, path_prefix)
            
            # Handle $ref
            if "$ref" in obj:
                resolved = resolve_ref(full_schema, obj["$ref"])
                if resolved:
                    traverse_schema(resolved, path_prefix)
    
    traverse_schema(schema_def)
    return allowed_properties, required_properties, property_details


def extract_property_details(prop_def: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
    """Extract detailed schema information from a property definition.
    
    Args:
        prop_def: The property definition (can be dict, bool, or other types)
        schema: The complete schema dictionary for resolving $ref references
        
    Returns:
        A dictionary containing the property's schema details
    """
    if isinstance(prop_def, dict):
        details = {}
        
        # Handle $ref
        if "$ref" in prop_def:
            resolved = resolve_ref(schema, prop_def["$ref"])
            if resolved:
                return extract_property_details(resolved, schema)
        
        # Extract common schema properties
        for key in ["type", "title", "description", "enum", "const", "default", "format", "pattern", "minimum", "maximum"]:
            if key in prop_def:
                details[key] = prop_def[key]
        
        # Handle nested properties
        if "properties" in prop_def:
            details["properties"] = {}
            for nested_prop, nested_def in prop_def["properties"].items():
                details["properties"][nested_prop] = extract_property_details(nested_def, schema)
        
        # Handle array items
        if "items" in prop_def:
            details["items"] = extract_property_details(prop_def["items"], schema)
        
        return details
    elif isinstance(prop_def, bool):
        # Boolean schema (true allows anything, false allows nothing)
        return {"type": "any" if prop_def else "never"}
    else:
        # Handle other types gracefully
        return {"type": "unknown", "value": prop_def}


def resolve_ref(schema: Dict[str, Any], ref_path: str) -> Optional[Dict[str, Any]]:
    """Resolve a $ref reference within the schema.
    
    Args:
        schema: The complete schema dictionary
        ref_path: The reference path (e.g., "#/definitions/ComponentType")
        
    Returns:
        The resolved definition or None if not found
    """
    if not ref_path.startswith("#/"):
        return None
    
    path_parts = ref_path[2:].split("/")  # Remove "#/" and split
    current = schema
    
    for part in path_parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    
    return current if isinstance(current, dict) else None


def find_component_definition(schema: Dict[str, Any], component_type: str) -> Optional[Dict[str, Any]]:
    """Find the component definition in the schema.
    
    Args:
        schema: The complete schema dictionary
        component_type: The type of component to find (e.g., "Input", "Button")
        
    Returns:
        The component definition dictionary, or None if not found
    """
    # Traverse down json schema to find the component definition
    if "definitions" in schema:
        if "AnyComponent" in schema["definitions"]:
            any_component = schema["definitions"]["AnyComponent"]
        
            if "allOf" in any_component: 
                
                # Iterate over allOf items to find the component definition
                for i, item in enumerate(any_component["allOf"]):
                    if isinstance(item, dict) and "if" in item and "then" in item:
                        if_condition = item["if"]
                        
                        if ("properties" in if_condition and 
                            "type" in if_condition["properties"]):
                            type_constraint = if_condition["properties"]["type"]
                            
                            if ("const" in type_constraint and
                                type_constraint["const"] == component_type):
                                return item["then"]
    
    # Look for the component definition in the top-level allOf array
    if "allOf" in schema:
        for i, item in enumerate(schema["allOf"]):
            if isinstance(item, dict) and "if" in item and "then" in item:
                if_condition = item["if"]
                
                if ("properties" in if_condition and 
                    "type" in if_condition["properties"]):
                    type_constraint = if_condition["properties"]["type"]
                    
                    if ("const" in type_constraint and
                        type_constraint["const"] == component_type):
                        return item["then"]
    
    return None


def load_layout_schema_from_url(schema_url: str) -> Dict[str, Any]:
    """Load the layout schema from a direct URL.
    
    Args:
        schema_url: Direct URL to the schema file
        
    Returns:
        The parsed schema dictionary
    """
    try:
        # Validate that the URL is from altinncdn.no domain for security
        parsed_url = urlparse(schema_url)
        if parsed_url.netloc != 'altinncdn.no':
            raise Exception(
                f"INVALID_DOMAIN: Schema URL must be from altinncdn.no domain, got: '{parsed_url.netloc}'. "
                f"Use a valid URL like: https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json. "
                f"DO NOT RETRY with the same URL - this error is not recoverable without changing the schema_url parameter."
            )
        
        # Ensure HTTPS for security
        if parsed_url.scheme != 'https':
            raise Exception(
                f"INVALID_PROTOCOL: Schema URL must use HTTPS, got: '{parsed_url.scheme}'. "
                f"Change the URL to use https:// instead of {parsed_url.scheme}://. "
                f"DO NOT RETRY with the same URL."
            )
        
        # Fetch the schema from the URL
        response = requests.get(schema_url)
        response.raise_for_status()
        
        schema = response.json()
        return schema
        
    except Exception as e:
        raise Exception(f"Failed to load layout schema from URL: {str(e)}")