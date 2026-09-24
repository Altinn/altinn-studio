"""Layout properties tool - retrieves valid properties schema for component types."""

from collections.abc import Iterator
from typing import Any

# Pairings the schema marks optional but the renderer requires.
BINDING_CONSTRAINTS: dict[str, list[str]] = {
    "Datepicker": [
        'A binding to a string with "format": "date" requires "timeStamp": false. '
        "The property defaults to true, which stores a full ISO timestamp against a "
        "date-only field, and Altinn Studio refuses to render the component."
    ],
    "Checkboxes": [
        'Bind "simpleBinding" and nothing else. "group" is a repeating-group '
        "binding: setting it makes Studio apply the repeating-group rules to this "
        'component, which then demands "deletionStrategy" and an array-typed '
        "target, and the page stops rendering."
    ],
    "RepeatingGroup": [
        'A "group" binding must point at an array in the data model, not a string.',
        'Setting "group" requires "deletionStrategy".',
        "Every child simpleBinding must start with the group binding's field, so "
        'a group on "vaccines" takes children like "vaccines.name".',
    ],
}

_BINDING_ADVICE = (
    "allowed_properties is what this component permits, not a list to fill: "
    "set only the properties the component needs."
)


def layout_properties_tool(
    user_goal: str, component_type: str, schema: dict[str, Any], binding_constraints: dict[str, list[str]]
) -> dict[str, Any]:
    """
    Retrieves schema information for a specific Altinn Studio component type.

    Args:
        component_type: Type of component to get schema for (e.g., "Input", "Button")
        schema: The loaded layout schema
        binding_constraints: Renderer constraints to report, keyed by component type

    Returns:
        Dictionary containing schema information with allowed properties and details
    """
    try:
        component_def = find_component_definition(schema, component_type)
        if not component_def:
            return _component_not_found_result(component_type, list_component_types(schema))

        # Extract schema metadata
        allowed_properties, required_properties, property_details = extract_schema_metadata(component_def, schema)

        return {
            "status": "success",
            "message": f"Schema information retrieved for component type '{component_type}'",
            "constraints": [
                *binding_constraints.get(component_type, []),
                _BINDING_ADVICE,
            ],
            "allowed_properties": sorted(allowed_properties),
            "required_properties": sorted(required_properties),
            "property_details": property_details,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error retrieving schema: {e!s}",
            "allowed_properties": [],
            "required_properties": [],
            "property_details": {},
        }


def _component_not_found_result(component_type: str, component_types: list[str]) -> dict[str, Any]:
    return {
        "status": "error",
        "error_code": "COMPONENT_NOT_FOUND",
        "message": f"Component type '{component_type}' not found in schema. "
        f"Verify the component_type is spelled correctly with proper casing (e.g., 'Input' not 'input'). "
        f"Component types in the schema: {', '.join(component_types)}. "
        f"DO NOT RETRY with the same component_type - pick one of the listed component types.",
        "allowed_properties": [],
        "required_properties": [],
        "property_details": {},
    }


def list_component_types(schema: dict[str, Any]) -> list[str]:
    """List the component types that the schema declares, sorted and without duplicates."""
    return sorted({component_type for component_type, _ in _iterate_component_definitions(schema)})


def _iterate_component_definitions(schema: dict[str, Any]) -> Iterator[tuple[str, dict[str, Any]]]:
    """Give each (component type, definition) pair that the schema declares.

    The pairs come from ``definitions.AnyComponent.allOf`` first and from the
    top-level ``allOf`` after it. Each item is an ``if``/``then`` pair where
    ``if.properties.type.const`` is the component type and ``then`` is its definition.
    """
    any_component = schema.get("definitions", {}).get("AnyComponent", {})
    for items in (any_component.get("allOf", []), schema.get("allOf", [])):
        for item in items:
            component = _read_component_definition(item)
            if component:
                yield component


def _read_component_definition(item: Any) -> tuple[str, dict[str, Any]] | None:
    if not isinstance(item, dict):
        return None
    condition = item.get("if")
    definition = item.get("then")
    if not isinstance(condition, dict) or not isinstance(definition, dict):
        return None
    type_constraint = condition.get("properties", {}).get("type", {})
    component_type = type_constraint.get("const") if isinstance(type_constraint, dict) else None
    if not isinstance(component_type, str):
        return None
    return component_type, definition


def extract_schema_metadata(
    schema_def: dict[str, Any], full_schema: dict[str, Any]
) -> tuple[set[str], set[str], dict[str, Any]]:
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

    def is_boolean_only_object(obj: dict[str, Any]) -> bool:
        """Check if an object contains only boolean properties (property availability indicators)."""
        if not isinstance(obj, dict):
            return False

        return all(isinstance(value, bool) for value in obj.values())

    def traverse_schema(obj: dict[str, Any], path_prefix: str = ""):
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


def extract_property_details(prop_def: Any, schema: dict[str, Any]) -> dict[str, Any]:
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
        for key in [
            "type",
            "title",
            "description",
            "enum",
            "const",
            "default",
            "format",
            "pattern",
            "minimum",
            "maximum",
        ]:
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


def resolve_ref(schema: dict[str, Any], ref_path: str) -> dict[str, Any] | None:
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


def find_component_definition(schema: dict[str, Any], component_type: str) -> dict[str, Any] | None:
    """Find the component definition in the schema.

    Args:
        schema: The complete schema dictionary
        component_type: The type of component to find (e.g., "Input", "Button")

    Returns:
        The component definition dictionary, or None if not found
    """
    for declared_type, definition in _iterate_component_definitions(schema):
        if declared_type == component_type:
            return definition
    return None
