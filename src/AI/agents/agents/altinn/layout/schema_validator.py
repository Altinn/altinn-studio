"""Schema validator tool - validates layout JSON against Altinn schemas."""

import json
from collections import defaultdict
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlparse

import requests
from jsonschema import Draft7Validator, ValidationError
from referencing import Registry, Resource
from referencing.exceptions import NoSuchResource
from referencing.jsonschema import DRAFT7

_EXPRESSION_SCHEMA_FILE_NAME = "expression.schema.v1.json"
# Stands in for an expression schema that cannot be fetched. The layout schemas
# reference only these three of its definitions.
_EXPRESSION_SCHEMA_FALLBACK = {
    "definitions": {
        "string": {"type": "string"},
        "boolean": {"type": "boolean"},
        "number": {"type": "number"},
    }
}


def schema_validator_tool(user_goal: str, json_obj: str, schema_path: str) -> dict[str, Any]:
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
                "message": f"JSON_PARSE_ERROR: The json_obj parameter contains invalid JSON. Error: {e!s}. "
                f"Check for: missing quotes, trailing commas, unescaped characters. "
                f"DO NOT RETRY with the same input - fix the JSON syntax first.",
                "validation_errors": [],
                "component_results": [],
                "hint": "Validate your JSON with a JSON linter before retrying.",
            }

        # Load the schema
        try:
            schema = load_layout_schema(schema_path)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error loading schema: {e!s}",
                "validation_errors": [],
                "component_results": [],
            }

        # Determine input type and normalize to full layout structure
        layout = normalize_input_to_layout(parsed_input)

        # Validate the layout
        return validate_layout_json(layout, schema)

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error during validation: {e!s}",
            "validation_errors": [],
            "component_results": [],
        }


def normalize_input_to_layout(parsed_input: Any) -> dict[str, Any]:
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
            "data": {"layout": parsed_input},
        }

    # If it's a single object (dict with id and type), wrap it in layout structure
    if isinstance(parsed_input, dict) and "id" in parsed_input and "type" in parsed_input:
        return {
            "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
            "data": {"layout": [parsed_input]},
        }

    # If it's some other dict structure, assume it's a malformed layout and return as-is
    # This will likely fail validation, which is the desired behavior
    if isinstance(parsed_input, dict):
        return parsed_input

    # For any other type, raise error
    raise ValueError("Unsupported input type")


def validate_layout_json(
    layout: dict[str, Any],
    schema: dict[str, Any],
    referenced_schemas: Mapping[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Validate an entire json against the schema.

    Args:
        layout: The json to validate (full structure with $schema and data)
        schema: The schema to validate against
        referenced_schemas: Schemas its `$ref`s point to, keyed by `$id`

    Returns:
        Dictionary with validation results
    """
    validation_errors = []

    try:
        registry = _build_schema_registry(schema, referenced_schemas or {})
        validator = Draft7Validator(_reference_to_root(schema), registry=registry)

        # Collect all validation errors
        raw_errors = list(validator.iter_errors(layout))

        # Deduplicate and prioritize errors to avoid overwhelming output
        validation_errors = _deduplicate_validation_errors(raw_errors)

    except Exception as e:
        return {"status": "error", "message": f"Unexpected error during validation: {e!s}", "validation_errors": []}

    # Determine overall status
    if validation_errors:
        status = "validation_failed"
        message = f"Layout validation failed with {len(validation_errors)} error(s)"
    else:
        status = "validation_passed"
        message = "Layout validation passed"

    return {"status": status, "message": message, "validation_errors": validation_errors}


def _build_schema_registry(schema: dict[str, Any], referenced_schemas: Mapping[str, dict[str, Any]]) -> Registry:
    schemas_by_uri = {**referenced_schemas, schema.get("$id", ""): schema}
    resources = [
        (uri, Resource.from_contents(contents, default_specification=DRAFT7))
        for uri, contents in schemas_by_uri.items()
        if uri
    ]
    return Registry(retrieve=_retrieve_referenced_schema).with_resources(resources)


def _reference_to_root(schema: dict[str, Any]) -> dict[str, Any]:
    """Draft 7 ignores a `$id` next to `$ref`, as at the root of the layout schemas.

    Without it the schema's relative `$ref`s have no base URI. Validating
    through a `$ref` to the registered schema gives them that base again.
    """
    root_id = schema.get("$id")
    return {"$ref": root_id} if root_id else schema


def _retrieve_referenced_schema(uri: str) -> Resource:
    """Fetch a `$ref` target that is not registered, from altinncdn.no."""
    from . import get_layout_schema

    try:
        contents = get_layout_schema(uri)
    except Exception as exc:
        if _EXPRESSION_SCHEMA_FILE_NAME not in uri:
            raise NoSuchResource(ref=uri) from exc
        contents = _EXPRESSION_SCHEMA_FALLBACK
    return Resource.from_contents(contents, default_specification=DRAFT7)


def _deduplicate_validation_errors(raw_errors: list[ValidationError]) -> list[dict[str, Any]]:
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
            (error.validator == "required" and "type" in str(error.validator_value)) or "type" in error.message.lower()
            for error in json_errors
        )

        if has_type_issues and len(json_errors) > 10:
            # Collapse many errors into a single meaningful error
            type_error = next(
                (
                    error
                    for error in json_errors
                    if error.validator == "required" and "type" in str(error.validator_value)
                ),
                json_errors[0],  # fallback
            )

            deduplicated_errors.append(
                {
                    "path": json_path,
                    "message": f"Json missing required 'type' property (collapsed {len(json_errors)} related errors)",
                    "validator": "required",
                    "validator_value": "type",
                    "schema_path": ".".join(str(p) for p in type_error.schema_path)
                    if type_error.schema_path
                    else "root",
                }
            )
        else:
            # Keep individual errors for json without structural issues
            for error in json_errors:
                deduplicated_errors.append(
                    {
                        "path": ".".join(str(p) for p in error.absolute_path) if error.absolute_path else "root",
                        "message": error.message,
                        "validator": error.validator,
                        "validator_value": error.validator_value,
                        "schema_path": ".".join(str(p) for p in error.schema_path) if error.schema_path else "root",
                    }
                )

    return deduplicated_errors


def load_layout_schema(schema_url: str) -> dict[str, Any]:
    """Load the layout schema from the repository.

    Args:
        schema_url: URL to the schema file

    Returns:
        The parsed schema dictionary
    """
    try:
        # Validate that the URL is from altinncdn.no domain for security
        parsed_url = urlparse(schema_url)
        if parsed_url.netloc != "altinncdn.no":
            raise Exception(
                f"INVALID_DOMAIN: Schema URL must be from altinncdn.no domain, got: '{parsed_url.netloc}'. "
                f"Valid example: https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json. "
                f"This is a security restriction - only official Altinn schemas are supported. "
                f"DO NOT RETRY with the same URL."
            )

        # Ensure HTTPS for security
        if parsed_url.scheme != "https":
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
        raise Exception(f"Failed to load layout schema: {e!s}") from e
