import json
from typing import Dict, Any, List, Optional
import requests
from jsonschema import Draft7Validator, ValidationError
from jsonschema.exceptions import SchemaError
from collections import defaultdict
from urllib.parse import urlparse

from server.tools import register_tool
from mcp.types import (
    ToolAnnotations,
)


@register_tool(
    name="schema_validator_tool",
    description="""
Validates JSON against Altinn Studio schema definitions from altinncdn.no.

## Purpose
Validate layout JSON, component arrays, or single components against the official Altinn schema.

## Required Parameters
- `json_obj`: JSON string to validate (complete layout, array of components, or single component)
- `schema_path`: URL to the schema (MUST be from altinncdn.no domain)

## Supported Input Formats
1. **Complete layout file**: `{"$schema": "...", "data": {"layout": [...]}}`
2. **Component array**: `[{"id": "...", "type": "Input", ...}, ...]`
3. **Single component**: `{"id": "...", "type": "Input", ...}`

## Valid schema_path Examples
✅ `https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json`

## Invalid schema_path Examples
❌ `https://example.com/schema.json` - Wrong domain (security restriction)
❌ `http://altinncdn.no/...` - Must use HTTPS
❌ Relative paths - Must be full URL

## Returns
- `status`: "validation_passed" | "validation_failed" | "error"
- `validation_errors`: List of specific errors with paths and messages
- `message`: Summary of validation result

## ⚠️ MANDATORY: Must Run After Creating/Modifying Layouts
This validation is REQUIRED - not optional. A task is incomplete without it.

If you created or modified ANY layout file, you MUST call this tool before finishing.

## When to Use
✅ **REQUIRED** after creating any layout file (e.g., Side1.json, Side2.json)
✅ **REQUIRED** after modifying any existing layout file
✅ When debugging layout issues to identify invalid properties

## When NOT to Use
❌ To understand what properties are valid (use `layout_properties_tool` instead)
❌ To find component examples (use `layout_components_tool` instead)
❌ With non-altinncdn.no schema URLs (will fail with security error)

## Error Handling
- If validation fails, examine `validation_errors` for specific issues
- Each error includes the JSON path and what's wrong
- Fix the issues and re-validate until validation passes
""",
    annotations=ToolAnnotations(
        title="Layout Validator Tool",
        readOnlyHint=True
    )
)
def schema_validator_tool(
    user_goal: str,
    json_obj: str,
    schema_path: str
) -> Dict[str, Any]:
    """
    Validates layout JSON against Altinn Studio layout schema using jsonschema library.
    Can handle complete layout files, component snippets, or single components.
    
    Args:
        json_obj: JSON string that can be:
                    - Complete layout with $schema and data.layout structure
                    - Array of objects
                    - Single object
        schema_path: URL to the schema to validate against
    Returns:
        Dictionary containing validation results with status and error messages
    """
    try:
        # Parse the layout JSON
        try:
            parsed_input = json.loads(json_obj)
        except json.JSONDecodeError as e:
            return {
                "status": "error",
                "error_code": "INVALID_JSON",
                "message": f"JSON_PARSE_ERROR: The json_obj parameter contains invalid JSON. Error: {str(e)}. "
                           f"Check for: missing quotes, trailing commas, unescaped characters. "
                           f"DO NOT RETRY with the same input - fix the JSON syntax first.",
                "validation_errors": [],
                "component_results": [],
                "hint": "Validate your JSON with a JSON linter before retrying."
            }
        
        # Load the schema
        try:
            schema = load_layout_schema(schema_path)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error loading schema: {str(e)}",
                "validation_errors": [],
                "component_results": []
            }
        
        # Determine input type and normalize to full layout structure
        layout = normalize_input_to_layout(parsed_input)
        
        # Validate the layout
        return validate_layout_json(layout, schema)
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error during validation: {str(e)}",
            "validation_errors": [],
            "component_results": []
        }


def normalize_input_to_layout(parsed_input: Any) -> Dict[str, Any]:
    """
    Normalize different input types to a full layout structure.
    
    Args:
        parsed_input: Can be a complete layout, component array, or single component
        
    Returns:
        Dictionary with full layout structure including $schema and data.layout
    """
    # If it's already a complete layout with $schema and data, return as-is
    if isinstance(parsed_input, dict) and "$schema" in parsed_input and "data" in parsed_input:
        return parsed_input
    
    # If it's a list (component snippet), wrap it in layout structure
    if isinstance(parsed_input, list):
        return {
            "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
            "data": {
                "layout": parsed_input
            }
        }
    
    # If it's a single object (dict with id and type), wrap it in layout structure
    if isinstance(parsed_input, dict) and "id" in parsed_input and "type" in parsed_input:
        return {
            "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
            "data": {
                "layout": [parsed_input]
            }
        }
    
    # If it's some other dict structure, assume it's a malformed layout and return as-is
    # This will likely fail validation, which is the desired behavior
    if isinstance(parsed_input, dict):
        return parsed_input
    
    # For any other type, raise error
    raise ValueError("Unsupported input type")

def validate_layout_json(layout: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate an entire json against the schema.
    
    Args:
        layout: The json to validate (full structure with $schema and data)
        schema: The schema to validate against
        
    Returns:
        Dictionary with validation results
    """
    validation_errors = []
    
    try:
        # Create a custom resolver that handles missing external references gracefully
        from jsonschema import RefResolver
        
        # Create a custom resolver that substitutes missing external refs with basic types
        def custom_resolver(uri):
            if "expression.schema.v1.json" in uri:
                # Return basic type definitions for missing expression schema
                if "string" in uri:
                    return {"type": "string"}
                elif "boolean" in uri:
                    return {"type": "boolean"}
                elif "number" in uri:
                    return {"type": "number"}
                else:
                    return {"type": "string"}  # fallback
            return None
        
        # Create resolver with custom handling
        resolver = RefResolver.from_schema(schema)
        
        # Override the resolver's resolve method to handle missing refs
        original_resolve = resolver.resolve
        def patched_resolve(url):
            try:
                return original_resolve(url)
            except Exception:
                # If resolution fails, try our custom resolver
                result = custom_resolver(url)
                if result:
                    return url, result
                raise
        
        resolver.resolve = patched_resolve
        validator = Draft7Validator(schema, resolver=resolver)
        
        # Collect all validation errors
        raw_errors = list(validator.iter_errors(layout))
        
        # Deduplicate and prioritize errors to avoid overwhelming output
        validation_errors = _deduplicate_validation_errors(raw_errors)
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error during validation: {str(e)}",
            "validation_errors": []
        }
    
    # Determine overall status
    if validation_errors:
        status = "validation_failed"
        message = f"Layout validation failed with {len(validation_errors)} error(s)"
    else:
        status = "validation_passed"
        message = "Layout validation passed"
    
    return {
        "status": status,
        "message": message,
        "validation_errors": validation_errors
    }


def _deduplicate_validation_errors(raw_errors: List[ValidationError]) -> List[Dict[str, Any]]:
    """
    Deduplicate and prioritize validation errors to avoid overwhelming output.
    
    This function specifically addresses the issue where missing/invalid refs cause
    the schema validator to try validating against all possible defs schemas,
    generating hundreds of errors for a single root issue.
    
    The function groups errors by json path and collapses errors caused by invalid refs into a single error.
    This is to avoid overwhelming output and to make it easier to identify the root cause of the issue.
    
    Args:
        raw_errors: List of ValidationError objects from jsonschema
        
    Returns:
        List of deduplicated error dictionaries
    """
    # Group errors by json path (e.g., "data.layout.2")
    errors_by_json = defaultdict(list)
    
    for error in raw_errors:
        # Extract json path (e.g., "data.layout.2")
        path_parts = list(error.absolute_path)
        if len(path_parts) >= 3 and path_parts[0] == "data" and path_parts[1] == "layout":
            json_path = f"{path_parts[0]}.{path_parts[1]}.{path_parts[2]}"
        else:
            json_path = ".".join(str(p) for p in path_parts) if path_parts else "root"
        
        errors_by_json[json_path].append(error)
    
    deduplicated_errors = []
    
    for json_path, json_errors in errors_by_json.items():
        # Check if this json has structural issues (missing/invalid type)
        has_type_issues = any(
            error.validator == "required" and "type" in str(error.validator_value)
            or "type" in error.message.lower()
            for error in json_errors
        )
        
        if has_type_issues and len(json_errors) > 10:
            # Collapse many errors into a single meaningful error
            type_error = next(
                (error for error in json_errors 
                 if error.validator == "required" and "type" in str(error.validator_value)),
                json_errors[0]  # fallback
            )
            
            deduplicated_errors.append({
                "path": json_path,
                "message": f"Json missing required 'type' property (collapsed {len(json_errors)} related errors)",
                "validator": "required",
                "validator_value": "type",
                "schema_path": ".".join(str(p) for p in type_error.schema_path) if type_error.schema_path else "root"
            })
        else:
            # Keep individual errors for json without structural issues
            for error in json_errors:
                deduplicated_errors.append({
                    "path": ".".join(str(p) for p in error.absolute_path) if error.absolute_path else "root",
                    "message": error.message,
                    "validator": error.validator,
                    "validator_value": error.validator_value,
                    "schema_path": ".".join(str(p) for p in error.schema_path) if error.schema_path else "root"
                })
    
    return deduplicated_errors


def validate_json_object(
    object: Dict[str, Any], 
    schema: Dict[str, Any], 
) -> Dict[str, Any]:
    """Validate component using jsonschema library and extract detailed information.
    
    Args:
        object: The object instance to validate
        schema: The complete schema for reference resolution
        component_type: The component type name
        
    Returns:
        Dictionary with validation results and detailed error information
    """
    try:
        # Create validator with the component definition and provide the full schema for $ref resolution
        from jsonschema import RefResolver
        
        # Create a resolver with the full schema
        resolver = RefResolver.from_schema(schema)
        validator = Draft7Validator(schema, resolver=resolver)
        
        # Validate and collect errors
        errors = list(validator.iter_errors(object))
        validation_errors = []
        missing_required_properties = []
        
        # Process validation errors
        for error in errors:
            error_info = {
                "path": '.'.join(str(p) for p in error.absolute_path),
                "message": error.message,
                "validator": error.validator,
                "failed_value": error.instance
            }
            validation_errors.append(error_info)
            
            # Categorize errors
            if error.validator == 'required':
                # Required properties missing
                missing_required_properties.extend(error.validator_value)
        
        # Determine validation status
        if errors:
            status = "validation_failed"
            message = f"Object validation failed with {len(errors)} error(s)"
        else:
            status = "validation_passed"
            message = "Object validation passed"
        
        return {
            "status": status,
            "message": message,
            "missing_required_properties": list(set(missing_required_properties)),  # Remove duplicates
            "validation_errors": validation_errors
        }
        
    except SchemaError as e:
        return {
            "status": "error",
            "message": f"Invalid schema definition: {str(e)}",
            "missing_required_properties": [],
            "validation_errors": []
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Validation error: {str(e)}",
            "missing_required_properties": [],
            "validation_errors": []
        }

def load_layout_schema(schema_url: str) -> Dict[str, Any]:
    """Load the layout schema from the repository.
    
    Args:
        schema_url: URL to the schema file
        
    Returns:
        The parsed schema dictionary
    """
    try:
        # Validate that the URL is from altinncdn.no domain for security
        parsed_url = urlparse(schema_url)
        if parsed_url.netloc != 'altinncdn.no':
            raise Exception(
                f"INVALID_DOMAIN: Schema URL must be from altinncdn.no domain, got: '{parsed_url.netloc}'. "
                f"Valid example: https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json. "
                f"This is a security restriction - only official Altinn schemas are supported. "
                f"DO NOT RETRY with the same URL."
            )
        
        # Ensure HTTPS for security
        if parsed_url.scheme != 'https':
            raise Exception(
                f"INVALID_PROTOCOL: Schema URL must use HTTPS, got: '{parsed_url.scheme}'. "
                f"Change the URL to use https:// instead of {parsed_url.scheme}://. "
                f"DO NOT RETRY with the same URL."
            )
        
        response = requests.get(schema_url)
        response.raise_for_status()
        
        schema_path = response.json()
        return schema_path
        
    except Exception as e:
        raise Exception(f"Failed to load layout schema: {str(e)}")