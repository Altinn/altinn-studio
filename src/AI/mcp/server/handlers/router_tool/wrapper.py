"""
altinn_route - Generic router tool for Altinn MCP.

This is the entry point tool that analyzes user intent and routes to the
appropriate tool with structured guidance.
"""

from typing import Optional, Dict, Any, List
from pathlib import Path
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    SCHEMA_HINTS,
)


def _load_planning_context() -> str:
    """Load the Altinn App Development Instructions from planning_context.md."""
    context_path = Path(__file__).parent.parent / "planning_tool" / "planning_context.md"
    
    if context_path.exists():
        with open(context_path, "r", encoding="utf-8") as f:
            return f.read()
    
    return _get_planning_context_fallback()


def _get_planning_context_fallback() -> str:
    """Fallback planning context if file not found."""
    return """
# Altinn App Development Instructions

## Core Components
- **App/models/**: Data model files (.schema.json, .xsd, .cs)
- **App/ui/**: Frontend layout definitions (JSON)
- **App/config/**: Application metadata, process, authorization

## Critical Conventions
- Only manually create .schema.json files
- Use altinn_datamodel_sync to generate .xsd and .cs
- Layout files must reference valid data model bindings
"""


# Tool catalog for routing
TOOL_CATALOG = {
    "altinn_route": {
        "description": "Analyze user intent and recommend appropriate tools",
        "keywords": ["help", "what", "how", "which tool", "start", "begin"],
        "category": "router",
    },
    "altinn_help": {
        "description": "Get detailed documentation on specific topics",
        "keywords": ["help", "documentation", "docs", "explain", "learn"],
        "category": "docs",
    },
    "altinn_datamodel_docs": {
        "description": "Get datamodel documentation",
        "keywords": ["datamodel", "schema", "json schema", "xsd", "model", "data"],
        "category": "docs",
    },
    "altinn_datamodel_sync": {
        "description": "Generate XSD and C# from JSON schema",
        "keywords": ["generate", "sync", "xsd", "csharp", "c#", "convert"],
        "category": "generation",
    },
    "altinn_layout_list": {
        "description": "List available UI components",
        "keywords": ["component", "ui", "layout", "form", "input", "field"],
        "category": "discovery",
    },
    "altinn_layout_props": {
        "description": "Get component property schema",
        "keywords": ["properties", "props", "schema", "component"],
        "category": "discovery",
    },
    "altinn_layout_validate": {
        "description": "Validate layout JSON",
        "keywords": ["validate", "check", "verify", "layout"],
        "category": "validation",
    },
    "altinn_policy_docs": {
        "description": "Get authorization policy documentation",
        "keywords": ["policy", "authorization", "auth", "xacml", "permission"],
        "category": "docs",
    },
    "altinn_policy_summarize": {
        "description": "Parse and summarize policy.xml",
        "keywords": ["summarize", "parse", "policy", "xml"],
        "category": "validation",
    },
    "altinn_policy_validate": {
        "description": "Validate policy rules",
        "keywords": ["validate", "policy", "rules", "check"],
        "category": "validation",
    },
    "altinn_resource_docs": {
        "description": "Get text resource documentation",
        "keywords": ["resource", "text", "translation", "i18n", "label"],
        "category": "docs",
    },
    "altinn_resource_validate": {
        "description": "Validate text resource files",
        "keywords": ["validate", "resource", "text", "check"],
        "category": "validation",
    },
    "altinn_prefill_docs": {
        "description": "Get prefill documentation",
        "keywords": ["prefill", "prepopulate", "default", "initial"],
        "category": "docs",
    },
    "altinn_expression_docs": {
        "description": "Get dynamic expression documentation",
        "keywords": ["expression", "dynamic", "conditional", "logic", "show", "hide"],
        "category": "docs",
    },
}


def _score_tool_match(tool_name: str, tool_info: Dict, query: str) -> int:
    """Score how well a tool matches the query."""
    query_lower = query.lower()
    score = 0
    
    for keyword in tool_info.get("keywords", []):
        if keyword in query_lower:
            score += 10
    
    if tool_name.replace("altinn_", "").replace("_", " ") in query_lower:
        score += 20
    
    return score


def _detect_workflow(query: str) -> Optional[str]:
    """Detect if query matches a known workflow pattern."""
    query_lower = query.lower()
    
    if any(w in query_lower for w in ["create form", "build form", "new form", "make form"]):
        return "form_creation"
    if any(w in query_lower for w in ["datamodel", "data model", "schema"]):
        return "datamodel"
    if any(w in query_lower for w in ["policy", "authorization", "permission"]):
        return "policy"
    if any(w in query_lower for w in ["layout", "component", "ui"]):
        return "layout"
    
    return None


@register_tool(
    name="altinn_route",
    description="Analyze user intent and recommend the appropriate Altinn tool to call.",
    category=ToolCategory.ROUTER,
    mode=OperationMode.IDEMPOTENT,
    schema_hints={
        "query": SCHEMA_HINTS["user_goal"],
    },
)
def route_tool(
    query: Optional[str] = None,
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """Route user request to appropriate Altinn tool.
    
    Args:
        query: The user's request or question.
        context: Optional additional context about current state.
    
    Returns:
        Structured routing recommendation with next_tool, reason, args_template, prerequisites.
    """
    effective_goal = query or ""
    
    if not effective_goal or not effective_goal.strip():
        return {
            "status": "error",
            "error_code": "EMPTY_QUERY",
            "message": "query is required and must not be empty",
            "recommended_tool": "altinn_route",
            "why": "Provide the user's actual request to get routing guidance",
        }
    
    # Score all tools
    scores = []
    for tool_name, tool_info in TOOL_CATALOG.items():
        score = _score_tool_match(tool_name, tool_info, effective_goal)
        if score > 0:
            scores.append((tool_name, tool_info, score))
    
    scores.sort(key=lambda x: x[2], reverse=True)
    
    # Detect workflow pattern
    workflow = _detect_workflow(effective_goal)
    
    # Build response
    planning_context = _load_planning_context()
    
    if scores:
        best_tool, best_info, _ = scores[0]
        args_template = {"query": effective_goal}
        
        return {
            "status": "success",
            "planning_context": planning_context,
            "next_tool": best_tool,
            "reason": best_info["description"],
            "args_template": args_template,
            "workflow": workflow,
            "alternative_tools": [
                {"tool": t[0], "reason": t[1]["description"]}
                for t in scores[1:4]
            ],
        }
    else:
        return {
            "status": "success",
            "planning_context": planning_context,
            "next_tool": "altinn_help",
            "reason": "No specific tool matched - try the help system",
            "args_template": {"topic": "overview"},
            "workflow": None,
        }
