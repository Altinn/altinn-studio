"""
altinn_resource_docs - Resource documentation tool.
altinn_resource_validate - Resource validation tool.
"""

import pathlib
from typing import Dict, Any, List, Optional
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
    ToolError,
)


@register_tool(
    name="altinn_resource_docs",
    description="Get documentation on Altinn text resources and translations.",
    category=ToolCategory.DOCS,
    mode=OperationMode.ONCE_PER_SESSION,
)
def resource_docs() -> Dict[str, Any]:
    """Get static documentation on Altinn text resources."""
    current_dir = pathlib.Path(__file__).parent
    doc_path = current_dir / "resource_context.md"
    
    if doc_path.exists():
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = "# Altinn Text Resources\n\nText resources provide translations and labels for forms."
    
    return ToolSuccess(content=content).to_dict()


@register_tool(
    name="altinn_resource_validate",
    description="Validate text resource JSON for schema compliance and issues.",
    category=ToolCategory.VALIDATION,
    mode=OperationMode.IDEMPOTENT,
)
def resource_validate(
    resource_json: str,
    language: str = "nb",
    layout_files: Optional[List[str]] = None,
    repo_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate text resource JSON.
    
    Args:
        resource_json: The text resource JSON content as a string.
        language: Language code (nb, nn, en). Default: nb.
        layout_files: Optional list of layout file contents for cross-reference.
        repo_path: Optional path to repository for additional validation.
    """
    import json
    
    if not resource_json or not resource_json.strip():
        return ToolError(
            error_code="MISSING_RESOURCE_JSON",
            message="resource_json is required and must not be empty",
            recommended_tool="altinn_resource_docs",
        ).to_dict()
    
    try:
        json.loads(resource_json)
    except json.JSONDecodeError as e:
        return ToolError(
            error_code="INVALID_JSON",
            message=f"resource_json is not valid JSON: {e}",
        ).to_dict()
    
    valid_languages = ["nb", "nn", "en"]
    if language not in valid_languages:
        return ToolError(
            error_code="INVALID_LANGUAGE",
            message=f"language must be one of: {valid_languages}",
            recommended_args={"language": "nb"},
        ).to_dict()
    
    try:
        from server.handlers.resource_tool.resource_validator_tool import resource_validator_tool as validate_resource
        
        result = validate_resource(
            user_goal="",
            resource_json=resource_json,
            language=language,
            layout_files=layout_files,
            repo_path=repo_path,
        )
        
        if result.get("valid", False):
            return {
                "status": "success",
                "valid": True,
                "message": "Resource file is valid",
            }
        else:
            return {
                "status": "success",
                "valid": False,
                "errors": result.get("errors", []),
                "warnings": result.get("warnings", []),
            }
            
    except ImportError as e:
        return ToolError(
            error_code="VALIDATOR_NOT_AVAILABLE",
            message=f"Resource validator not available: {str(e)}",
        ).to_dict()
