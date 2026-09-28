"""Validate layout JSON against Altinn schemas."""

from collections import defaultdict
from typing import Any
from urllib.parse import urlparse

import requests
from jsonschema import Draft7Validator, ValidationError


def validate_layout_json(layout: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
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
        return {"status": "error", "message": f"Unexpected error during validation: {e!s}", "validation_errors": []}

    # Determine overall status
    if validation_errors:
        status = "validation_failed"
        message = f"Layout validation failed with {len(validation_errors)} error(s)"
    else:
        status = "validation_passed"
        message = "Layout validation passed"

    return {"status": status, "message": message, "validation_errors": validation_errors}


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
