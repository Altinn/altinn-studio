"""
Layout expression generator for Altinn Studio.
This module provides functionality to generate and validate expressions for Altinn Studio layouts.
"""

import json
import os
from typing import Dict, Any, Optional

from .config import COMMON_PATTERNS, LAYOUT_EXPRESSION_CONFIG
from .utils import extract_data_bindings, generate_expression, is_modification_request, get_output_directory, write_updated_layout

def generate_layout_expressions(query: str, layout_file: Optional[str] = None, output_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate layout expressions based on the user query and optionally update layout files.
    
    Args:
        query: The user query for expression generation
        layout_file: Optional path to a layout file to extract bindings from
        output_dir: Optional directory to write updated layout files to
        
    Returns:
        Dictionary with generated expressions, metadata, and file paths of updated files
    """
    # Initialize result structure
    result = {
        "status": "success",
        "message": "",
        "expressions": [],
        "available_patterns": COMMON_PATTERNS,
        "updated_files": []
    }
    
    # Check if this is a modification request
    is_modification = is_modification_request(query)
    if is_modification:
        result["is_modification"] = True
        result["message"] = "Modification request detected"
    
    # Extract data bindings and existing layout from file if provided
    data_bindings = []
    existing_layout = None
    if layout_file and os.path.exists(layout_file):
        try:
            with open(layout_file, 'r', encoding='utf-8') as f:
                layout_json = json.load(f)
                existing_layout = layout_json
            data_bindings = extract_data_bindings(layout_json)
            result["data_bindings"] = data_bindings
            if is_modification:
                result["existing_layout"] = existing_layout
        except Exception as e:
            result["layout_error"] = f"Error processing layout file: {str(e)}"
    
    # Determine output directory if needed
    if is_modification and existing_layout:
        output_dir = get_output_directory(layout_file, output_dir)
    
    # Parse query to determine what expressions to generate
    # This is a simple implementation - in a real system, you would use NLP or a more sophisticated parser
    query_lower = query.lower()
    
    # Check if query is asking for specific expression types
    expressions_to_generate = []
    
    for expr_type in LAYOUT_EXPRESSION_CONFIG["EXPRESSION_TYPES"]:
        if expr_type.lower() in query_lower:
            expressions_to_generate.append(expr_type)
    
    # If no specific types mentioned, generate examples for all types
    if not expressions_to_generate:
        expressions_to_generate = LAYOUT_EXPRESSION_CONFIG["EXPRESSION_TYPES"]
    
    # If this is a modification request and we have an existing layout, analyze it for improvements
    if is_modification and existing_layout:
        result["modification_suggestions"] = []
        
        # Function to analyze a component and suggest improvements
        def analyze_component(component, path=""):
            if not isinstance(component, dict):
                return
                
            component_id = component.get("id", "unknown")
            current_path = f"{path}/{component_id}" if path else component_id
            
            # Check for components that could benefit from expressions
            if "dataModelBindings" in component:
                # Check if component has required=true but no dynamic expression
                if component.get("required") is True and not component.get("required", []):
                    # This is a static required field that could be dynamic
                    binding = next(iter(component["dataModelBindings"].values())) if component["dataModelBindings"] else None
                    if binding:
                        example = generate_expression("required", binding, "not_empty")
                        if example["status"] == "success":
                            result["modification_suggestions"].append({
                                "component_id": component_id,
                                "path": current_path,
                                "type": "required",
                                "current": True,
                                "suggested": [example["expression"]],
                                "description": f"Convert static required to dynamic expression for {component_id}"
                            })
                
                # Check if component could benefit from a hidden expression based on other fields
                if "hidden" not in component and data_bindings:
                    # Find a potential field to base hiding on (other than this component's binding)
                    current_binding = next(iter(component["dataModelBindings"].values())) if component["dataModelBindings"] else None
                    potential_control_field = next((b for b in data_bindings if b != current_binding), None)
                    
                    if potential_control_field:
                        example = generate_expression("hidden", potential_control_field, "equals", value="someValue")
                        if example["status"] == "success":
                            result["modification_suggestions"].append({
                                "component_id": component_id,
                                "path": current_path,
                                "type": "hidden",
                                "current": None,
                                "suggested": [example["expression"]],
                                "description": f"Add conditional visibility for {component_id} based on {potential_control_field}"
                            })
            
            # Recursively analyze children
            if "children" in component and isinstance(component["children"], list):
                for child in component["children"]:
                    analyze_component(child, current_path)
        
        # Start analysis from the layout root
        if "data" in existing_layout and "layout" in existing_layout["data"]:
            for component in existing_layout["data"]["layout"]:
                analyze_component(component)
        
        # Add a message about modification suggestions
        if result["modification_suggestions"]:
            result["message"] = f"Found {len(result['modification_suggestions'])} potential improvements for the layout"
            
            # Update the layout file with the suggested expressions if output_dir is provided
            if output_dir and existing_layout:
                try:
                    # Create a copy of the existing layout to modify
                    updated_layout = existing_layout.copy()
                    
                    # Apply the suggested expressions to the layout
                    for suggestion in result["modification_suggestions"]:
                        component_path = suggestion["path"].split('/')
                        if len(component_path) >= 2:
                            group_id, component_id = component_path[-2], component_path[-1]
                            
                            # Find the component in the layout
                            for group in updated_layout["data"]["layout"]:
                                if group.get("id") == group_id:
                                    for component in group.get("children", []):
                                        if component.get("id") == component_id:
                                            # Update the component with the expression
                                            if suggestion["type"] == "hidden":
                                                component["hidden"] = [suggestion["suggested"][0]]
                                            elif suggestion["type"] == "required":
                                                component["required"] = [suggestion["suggested"][0]]
                                            elif suggestion["type"] == "readOnly":
                                                component["readOnly"] = [suggestion["suggested"][0]]
                    
                    # Determine the output file path
                    layout_filename = os.path.basename(layout_file)
                    output_file = os.path.join(output_dir, layout_filename)
                    
                    # Write the updated layout to the output file
                    write_result = write_updated_layout(updated_layout, output_file)
                    
                    if write_result["status"] == "success":
                        # Add the output file to the result
                        result["updated_files"].append({
                            "original": layout_file,
                            "updated": output_file,
                            "description": f"Updated layout file with {len(result['modification_suggestions'])} expression modifications"
                        })
                        
                        result["message"] += f". Updated layout file written to {output_file}"
                    else:
                        result["file_error"] = write_result["message"]
                except Exception as e:
                    result["file_error"] = f"Error updating layout file: {str(e)}"
        else:
            result["message"] = "No modification suggestions found for the current layout"
    
    # Generate example expressions if not a modification request or if specifically requested
    if not is_modification or "example" in query.lower() or "generate" in query.lower():
        for expr_type in expressions_to_generate:
            # Add examples for each pattern type
            for pattern_name, _ in COMMON_PATTERNS[expr_type].items():
                # Use a sample field name or one from data bindings if available
                field = data_bindings[0] if data_bindings else "SampleField"
                
                # Generate example expression based on pattern
                if pattern_name == "equals":
                    example = generate_expression(expr_type, field, pattern_name, value="exampleValue")
                elif pattern_name == "not_equals":
                    example = generate_expression(expr_type, field, pattern_name, value="exampleValue")
                elif pattern_name == "contains":
                    example = generate_expression(expr_type, field, pattern_name, value="part")
                elif pattern_name == "greater_than":
                    example = generate_expression(expr_type, field, pattern_name, value=10)
                elif pattern_name == "less_than":
                    example = generate_expression(expr_type, field, pattern_name, value=100)
                elif pattern_name == "not_empty":
                    example = generate_expression(expr_type, field, pattern_name)
                elif pattern_name == "concat":
                    field2 = data_bindings[1] if len(data_bindings) > 1 else "AnotherField"
                    example = generate_expression(expr_type, field, pattern_name, field1=field, field2=field2)
                elif pattern_name == "substring":
                    example = generate_expression(expr_type, field, pattern_name, start=0, length=5)
                elif pattern_name == "is_true":
                    example = generate_expression(expr_type, field, pattern_name)
                elif pattern_name == "is_false":
                    example = generate_expression(expr_type, field, pattern_name)
                elif pattern_name == "and_condition":
                    field2 = data_bindings[1] if len(data_bindings) > 1 else "AnotherField"
                    example = generate_expression(expr_type, field, pattern_name, 
                                                field1=field, value1="value1",
                                                field2=field2, value2="value2")
                elif pattern_name == "or_condition":
                    field2 = data_bindings[1] if len(data_bindings) > 1 else "AnotherField"
                    example = generate_expression(expr_type, field, pattern_name, 
                                                field1=field, value1="value1",
                                                field2=field2, value2="value2")
                elif pattern_name == "component_equals":
                    example = generate_expression(expr_type, field, pattern_name, 
                                                component_id="someComponentId", value="yes")
                elif pattern_name == "component_not_equals":
                    example = generate_expression(expr_type, field, pattern_name, 
                                                component_id="someComponentId", value="no")
                else:
                    continue
                    
                if example["status"] == "success":
                    result["expressions"].append({
                        "type": expr_type,
                        "pattern": pattern_name,
                        "expression": example["expression"],
                        "description": f"Example {expr_type} expression using {pattern_name} pattern"
                    })
    
    # Add message about the generated expressions
    result["message"] = f"Generated {len(result['expressions'])} example expressions for types: {', '.join(expressions_to_generate)}"
    
    return result
