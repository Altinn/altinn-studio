"""Tool to generate dynamic layout expressions."""

import os
from codegen.expressions.generator import generate_layout_expressions

from server.tools import register_tool


@register_tool
def old_dynamic_expression_tool(query: str, layout_file: str | None = None, output_dir: str | None = None) -> dict:
    """Generate dynamic expressions for a user query using the Altinn pipeline."""
    try:
        if layout_file and not os.path.exists(layout_file):
            return {"status": "error", "message": f"Layout file not found: {layout_file}", "file_exists": False}
        if layout_file and "App/ui/form/layouts" not in layout_file:
            return {"status": "error", "message": f"Layout file must be in App/ui/form/layouts directory. Current path: {layout_file}", "file_exists": True, "correct_path": False}

        if not output_dir and layout_file:
            output_dir = os.path.dirname(layout_file)

        result = generate_layout_expressions(query, layout_file, output_dir)
        if result["status"] != "success":
            return {"status": "error", "message": result.get("message", "Unknown error")}

        response = {
            "status": "success",
            "message": result.get("message", "Generated layout expressions"),
            "expressions": result.get("expressions", []),
            "available_patterns": result.get("available_patterns", {}),
            "data_bindings": result.get("data_bindings", []),
            "file_exists": layout_file is not None and os.path.exists(layout_file),
            "is_modification_request": any(word in query.lower() for word in ["modify", "change", "update"]),
        }
        if "updated_files" in result:
            response["updated_files"] = result["updated_files"]
        if "modification_suggestions" in result:
            response["modification_suggestions"] = result["modification_suggestions"]
        if "existing_layout" in result:
            response["existing_layout"] = result["existing_layout"]
        return response
    except Exception as e:
        return {"status": "error", "message": f"Server error: {str(e)}"}
