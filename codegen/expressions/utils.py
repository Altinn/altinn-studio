"""Utility functions for the layout expression generator."""

import json
import os
from typing import Dict, List, Any, Optional

from .config import COMMON_PATTERNS, LAYOUT_EXPRESSION_CONFIG, MODIFICATION_KEYWORDS


def validate_expression(expression: str, expression_type: str) -> Dict[str, Any]:
    """
    Validate an expression for a given type.
    
    Args:
        expression: The expression to validate
        expression_type: The type of expression (hidden, required, etc.)
        
    Returns:
        Dictionary with validation result
    """
    if expression_type not in LAYOUT_EXPRESSION_CONFIG["EXPRESSION_TYPES"]:
        return {
            "valid": False,
            "message": f"Invalid expression type: {expression_type}. Must be one of {', '.join(LAYOUT_EXPRESSION_CONFIG['EXPRESSION_TYPES'])}"
        }
    
    # Basic validation - check if the expression is not empty
    if not expression or not expression.strip():
        return {
            "valid": False,
            "message": "Expression cannot be empty"
        }
    
    # Check for common syntax errors
    if expression.count('(') != expression.count(')'):
        return {
            "valid": False,
            "message": "Mismatched parentheses in expression"
        }
    
    # For boolean expressions (true/false), no further validation needed
    if expression == "true" or expression == "false" or expression is True or expression is False:
        return {
            "valid": True,
            "message": "Expression is valid"
        }
    
    # Check for dataModel or component reference in most expressions
    # Skip this check for value expressions or if it's a complex expression with AND/OR
    if ("dataModel." not in expression and 
        "component" not in expression and 
        "and" not in expression and 
        "or" not in expression and 
        expression_type != "value"):
        return {
            "valid": False,
            "message": "Expression should reference dataModel"
        }
    
    # All checks passed
    return {
        "valid": True,
        "message": "Expression is valid"
    }


def extract_data_bindings(layout_json: Dict[str, Any]) -> List[str]:
    """
    Extract data model bindings from a layout JSON.
    
    Args:
        layout_json: The layout JSON object
        
    Returns:
        List of data model bindings found in the layout
    """
    bindings = []
    
    def extract_from_component(component):
        if isinstance(component, dict):
            # Check for dataModelBindings
            if "dataModelBindings" in component and isinstance(component["dataModelBindings"], dict):
                for binding in component["dataModelBindings"].values():
                    if binding and isinstance(binding, str) and binding not in bindings:
                        bindings.append(binding)
            
            # Recursively check all other dictionary values
            for value in component.values():
                if isinstance(value, (dict, list)):
                    extract_from_component(value)
        elif isinstance(component, list):
            # Recursively check all list items
            for item in component:
                if isinstance(item, (dict, list)):
                    extract_from_component(item)
    
    # Start extraction from the root
    extract_from_component(layout_json)
    return bindings


def generate_expression(expression_type: str, field: str, pattern: str, **kwargs) -> Dict[str, Any]:
    """
    Generate an expression based on pattern and parameters.
    
    Args:
        expression_type: Type of expression (hidden, required, etc.)
        field: The field to generate expression for
        pattern: The pattern name to use
        **kwargs: Additional parameters for the pattern
        
    Returns:
        Dictionary with the generated expression
    """
    try:
        if expression_type not in LAYOUT_EXPRESSION_CONFIG["EXPRESSION_TYPES"]:
            return {
                "status": "error",
                "message": f"Invalid expression type: {expression_type}. Must be one of {', '.join(LAYOUT_EXPRESSION_CONFIG["EXPRESSION_TYPES"])}"
            }
        
        if pattern not in COMMON_PATTERNS.get(expression_type, {}):
            return {
                "status": "error",
                "message": f"Invalid pattern '{pattern}' for expression type '{expression_type}'"
            }
        
        # Get the pattern template
        template = COMMON_PATTERNS[expression_type][pattern]
        
        # Replace field placeholder
        expression = template.replace("{field}", field)
        
        # Replace additional placeholders based on pattern
        if pattern == "equals" or pattern == "not_equals" or pattern == "contains":
            if "value" not in kwargs:
                return {"status": "error", "message": f"Missing 'value' parameter for {pattern} pattern"}
            expression = expression.replace("{value}", str(kwargs["value"]))
        elif pattern == "greater_than" or pattern == "less_than":
            if "value" not in kwargs:
                return {"status": "error", "message": f"Missing 'value' parameter for {pattern} pattern"}
            expression = expression.replace("{value}", str(kwargs["value"]))
        elif pattern == "concat":
            if "field1" not in kwargs or "field2" not in kwargs:
                return {"status": "error", "message": "Missing 'field1' or 'field2' parameter for concat pattern"}
            expression = expression.replace("{field1}", kwargs["field1"]).replace("{field2}", kwargs["field2"])
        elif pattern == "substring":
            if "start" not in kwargs or "length" not in kwargs:
                return {"status": "error", "message": "Missing 'start' or 'length' parameter for substring pattern"}
            expression = expression.replace("{start}", str(kwargs["start"])).replace("{length}", str(kwargs["length"]))
        
        # Validate the generated expression
        validation = validate_expression(expression, expression_type)
        if not validation["valid"]:
            return {"status": "error", "message": validation["message"]}
        
        return {
            "status": "success",
            "expression": expression
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error generating expression: {str(e)}"
        }


def is_modification_request(query: str) -> bool:
    """
    Determine if a query is requesting modification of an existing layout.
    
    Args:
        query: The user query
        
    Returns:
        True if this is a modification request, False otherwise
    """
    return any(keyword in query.lower() for keyword in MODIFICATION_KEYWORDS)


def get_output_directory(layout_file: Optional[str], output_dir: Optional[str] = None) -> Optional[str]:
    """
    Determine the output directory for updated layout files.
    
    Args:
        layout_file: Path to the input layout file
        output_dir: User-specified output directory (optional)
        
    Returns:
        Path to the output directory, or None if no layout file is provided
    """
    if not layout_file:
        return output_dir
    
    # If output_dir is specified, use it
    if output_dir:
        return output_dir
    
    # By default, use the same directory as the original file
    # This ensures we edit the existing file rather than creating a new one
    return os.path.dirname(layout_file)


def write_updated_layout(layout_json: Dict[str, Any], output_path: str) -> Dict[str, Any]:
    """
    Write an updated layout to the specified output path.
    
    Args:
        layout_json: The layout JSON to write
        output_path: Path to write the layout file to
        
    Returns:
        Dictionary with result information
    """
    try:
        # Create the output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Write the layout to the output file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(layout_json, f, indent=2)
        
        return {
            "status": "success",
            "path": output_path,
            "message": f"Updated layout written to {output_path}"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error writing layout file: {str(e)}"
        }
