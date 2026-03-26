"""
altinn_policy_docs - Policy documentation tool.
altinn_policy_summarize - Policy summarization tool.
altinn_policy_validate - Policy validation tool.
"""

import pathlib
from typing import Dict, Any
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
    ToolError,
)


@register_tool(
    name="altinn_policy_docs",
    description="Get documentation on Altinn authorization policies and XACML.",
    category=ToolCategory.DOCS,
    mode=OperationMode.ONCE_PER_SESSION,
)
def policy_docs() -> Dict[str, Any]:
    """Get static documentation on Altinn authorization policies."""
    current_dir = pathlib.Path(__file__).parent
    doc_path = current_dir / "policy_context.md"
    
    if doc_path.exists():
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = "# Altinn Policy Documentation\n\nPolicies define authorization rules using XACML."
    
    return ToolSuccess(content=content).to_dict()


@register_tool(
    name="altinn_policy_summarize",
    description="Parse policy.xml and create a readable summary of authorization rules.",
    category=ToolCategory.VALIDATION,
    mode=OperationMode.IDEMPOTENT,
)
def policy_summarize(xml_content: str) -> Dict[str, Any]:
    """Parse policy.xml and summarize authorization rules.
    
    Args:
        xml_content: The policy.xml content as a string.
    """
    if not xml_content or not xml_content.strip():
        return ToolError(
            error_code="MISSING_XML_CONTENT",
            message="xml_content is required and must not be empty",
            recommended_tool="altinn_policy_docs",
            why="Review policy documentation to understand the expected format",
        ).to_dict()
    
    try:
        from server.handlers.policy_tool.policy_summarization_tool import policy_summarization_tool as summarize_policy
        
        result = summarize_policy(
            user_goal="",
            xml_content=xml_content,
        )
        
        if result.get("status") == "error":
            return ToolError(
                error_code=result.get("error_code", "SUMMARIZATION_FAILED"),
                message=result.get("message", "Failed to parse policy XML"),
            ).to_dict()
        
        return {
            "status": "success",
            "summary": result.get("summary", ""),
            "rules": result.get("rules", []),
            "next_steps": [
                {
                    "tool": "altinn_policy_validate",
                    "reason": "Validate the policy rules against your requirements",
                }
            ],
        }
        
    except ImportError as e:
        return ToolError(
            error_code="SUMMARIZATION_NOT_AVAILABLE",
            message=f"Policy summarization not available: {str(e)}",
        ).to_dict()


@register_tool(
    name="altinn_policy_validate",
    description="Validate policy rules against access control requirements.",
    category=ToolCategory.VALIDATION,
    mode=OperationMode.IDEMPOTENT,
    prerequisites=["altinn_policy_summarize"],
)
def policy_validate(query: str, policy_rules: Any) -> Dict[str, Any]:
    """Validate policy rules against access control requirements.
    
    Args:
        query: Description of access control requirements to validate.
        policy_rules: The rules output from altinn_policy_summarize.
    """
    if not policy_rules:
        return ToolError(
            error_code="MISSING_POLICY_RULES",
            message="policy_rules is required - call altinn_policy_summarize first",
            recommended_tool="altinn_policy_summarize",
            why="You must call altinn_policy_summarize first to obtain the rules",
            minimal_next_call="altinn_policy_summarize(xml_content=...)",
        ).to_dict()
    
    if not query or not query.strip():
        return ToolError(
            error_code="MISSING_QUERY",
            message="query is required - describe your access control requirements",
        ).to_dict()
    
    try:
        from server.handlers.policy_tool.policy_validation_tool import policy_validation_tool as validate_policy
        
        result = validate_policy(
            query=query,
            policy_rules=policy_rules,
        )
        
        return result
        
    except ImportError as e:
        return ToolError(
            error_code="VALIDATION_NOT_AVAILABLE",
            message=f"Policy validation not available: {str(e)}",
        ).to_dict()
