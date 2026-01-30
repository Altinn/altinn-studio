"""
Altinn MCP Tools - Namespace-based tool architecture.

Tool Naming Convention:
    altinn_<domain>_<verb>
    
Examples:
    altinn_route             - Router tool (entry point)
    altinn_help              - Documentation lookup
    altinn_datamodel_docs    - Datamodel documentation
    altinn_datamodel_sync    - Generate XSD/C# from schema
    altinn_layout_list       - List available components
    altinn_layout_props      - Get component properties
    altinn_layout_validate   - Validate layout JSON
    altinn_resource_docs     - Resource documentation
    altinn_resource_validate - Validate resource files
    altinn_policy_docs       - Policy documentation
    altinn_policy_summarize  - Summarize policy.xml
    altinn_policy_validate   - Validate policy rules
    altinn_prefill_docs      - Prefill documentation
    altinn_expression_docs   - Dynamic expression documentation
"""

from typing import Any, Dict, List, Optional, Literal, Union, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
import functools
import inspect


# ============================================================================
# Agent Mode Detection (imported from main at runtime)
# ============================================================================

def _get_agent_mode() -> bool:
    """Check if running in agent mode (no tracing)."""
    try:
        from server.main import is_agent_mode
        return is_agent_mode()
    except ImportError:
        return False


def _trace_tool_call(func: Callable) -> Callable:
    """Wrap tool with Langfuse tracing if not in agent mode."""
    try:
        from server.tracing import trace_tool_call
        return trace_tool_call(func)
    except ImportError:
        return func

# ============================================================================
# Structured Response Types
# ============================================================================

class ToolCategory(str, Enum):
    """Tool categories for routing."""
    ROUTER = "router"
    DOCS = "docs"
    DISCOVERY = "discovery"
    VALIDATION = "validation"
    GENERATION = "generation"


class OperationMode(str, Enum):
    """How often a tool should be called."""
    ONCE_PER_SESSION = "once_per_session"  # Static docs - call once
    IDEMPOTENT = "idempotent"              # Same input = same output
    STATEFUL = "stateful"                   # May have side effects


@dataclass
class ToolRecommendation:
    """Structured recommendation for next tool to call."""
    tool: str
    reason: str
    args_template: Dict[str, Any] = field(default_factory=dict)
    priority: int = 1  # 1 = highest


@dataclass
class ToolError:
    """Structured error response for wrong tool usage."""
    error_code: str
    message: str
    recommended_tool: Optional[str] = None
    recommended_args: Optional[Dict[str, Any]] = None
    why: Optional[str] = None
    minimal_next_call: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass 
class ToolSuccess:
    """Structured success response."""
    status: Literal["success"] = "success"
    content: Any = None
    next_steps: List[ToolRecommendation] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        result = {"status": self.status}
        if self.content is not None:
            result["content"] = self.content
        if self.next_steps:
            result["next_steps"] = [
                {"tool": r.tool, "reason": r.reason, "args_template": r.args_template}
                for r in self.next_steps
            ]
        if self.warnings:
            result["warnings"] = self.warnings
        return result


@dataclass
class RouteResult:
    """Output from altinn.route tool."""
    next_tool: str
    reason: str
    args_template: Dict[str, Any]
    prerequisites: List[str] = field(default_factory=list)
    workflow_position: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ============================================================================
# Prerequisite Enforcement
# ============================================================================

class PrerequisiteError(Exception):
    """Raised when a tool is called without required prerequisites."""
    def __init__(self, error: ToolError):
        self.error = error
        super().__init__(error.message)


def require_prerequisite(
    prerequisite_tool: str,
    check_fn: callable,
    error_message: str
):
    """Decorator to enforce prerequisites at runtime.
    
    Args:
        prerequisite_tool: Name of the tool that must be called first
        check_fn: Function that checks if prerequisite is met (receives **kwargs)
        error_message: Message to show if prerequisite not met
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not check_fn(**kwargs):
                raise PrerequisiteError(ToolError(
                    error_code="PREREQUISITE_NOT_MET",
                    message=error_message,
                    recommended_tool=prerequisite_tool,
                    why=f"You must call {prerequisite_tool} first to obtain required data.",
                    minimal_next_call=f'{prerequisite_tool}(...)'
                ))
            return func(*args, **kwargs)
        return wrapper
    return decorator


# ============================================================================
# Tool Registry
# ============================================================================

# Registry for tools
_tool_registry: List[Dict[str, Any]] = []


def register_tool(
    name: str,
    description: str,
    category: ToolCategory,
    mode: OperationMode,
    prerequisites: List[str] = None,
    schema_hints: Dict[str, str] = None
):
    """Register a tool with namespace naming and structured metadata.
    
    Args:
        name: Tool name in altinn_* namespace format
        description: ONE LINE user-facing summary (no routing rules)
        category: Tool category for routing
        mode: How often the tool should be called
        prerequisites: List of tools that must be called first
        schema_hints: Dict mapping param names to routing hints for schema
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract MCP context if present and capture _meta for tracing
            ctx = kwargs.pop('ctx', None)
            if ctx is not None:
                try:
                    from server.tracing import set_mcp_request_meta
                    if hasattr(ctx, 'request_context') and ctx.request_context:
                        meta = ctx.request_context.meta
                        if meta:
                            # Convert meta object to dict
                            meta_dict = {}
                            for attr in ['reasoning', 'description', 'user_id', 'trace_id']:
                                if hasattr(meta, attr):
                                    meta_dict[attr] = getattr(meta, attr)
                            set_mcp_request_meta(meta_dict)
                except Exception:
                    pass  # Silently ignore tracing setup errors
            
            try:
                result = func(*args, **kwargs)
                # Ensure consistent response format
                if isinstance(result, (ToolSuccess, ToolError)):
                    return result.to_dict()
                elif isinstance(result, dict):
                    return result
                else:
                    return {"status": "success", "content": result}
            except PrerequisiteError as e:
                return {"status": "error", **e.error.to_dict()}
            except Exception as e:
                return ToolError(
                    error_code="TOOL_ERROR",
                    message=str(e)
                ).to_dict()
        
        # Wrap with tracing if not in agent mode
        def traced_wrapper(*args, **kwargs):
            if _get_agent_mode():
                # Agent mode: skip tracing
                return wrapper(*args, **kwargs)
            else:
                # Normal mode: apply tracing
                traced = _trace_tool_call(wrapper)
                return traced(*args, **kwargs)
        
        # Preserve signature for MCP
        traced_wrapper.__signature__ = inspect.signature(func)
        functools.update_wrapper(traced_wrapper, func)
        
        # Store metadata
        traced_wrapper._tool_v2 = True
        traced_wrapper._tool_name = name
        traced_wrapper._tool_description = description
        traced_wrapper._tool_category = category
        traced_wrapper._tool_mode = mode
        traced_wrapper._tool_prerequisites = prerequisites or []
        traced_wrapper._tool_schema_hints = schema_hints or {}
        traced_wrapper._original_func = func
        
        _tool_registry.append({
            "name": name,
            "description": description,
            "category": category.value,
            "mode": mode.value,
            "prerequisites": prerequisites or [],
            "func": traced_wrapper
        })
        
        return traced_wrapper
    return decorator


def get_tool_registry() -> List[Dict[str, Any]]:
    """Get all registered tools."""
    return _tool_registry.copy()


def get_tool_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Look up a tool by name."""
    for tool in _tool_registry:
        if tool["name"] == name:
            return tool
    return None


# ============================================================================
# Schema Hint Constants (for embedding in JSON Schema field descriptions)
# ============================================================================

SCHEMA_HINTS = {
    "user_goal": (
        "MUST be the EXACT, VERBATIM user prompt. "
        "NEVER summarize, paraphrase, or interpret. "
        "Pass the original text exactly as typed."
    ),
    "operation_docs": (
        "Use 'docs' to retrieve static documentation. "
        "Call ONCE per session - repeated calls return identical content."
    ),
    "operation_validate": (
        "Use 'validate' to check content against schema. "
        "MUST provide content to validate."
    ),
    "operation_sync": (
        "Use 'sync' to generate derived files. "
        "MUST provide source content."
    ),
    "prerequisite_policy_summary": (
        "MUST call altinn.policy.summarize first. "
        "Pass the 'rules' from that response as policy_rules here."
    ),
    "schema_url": (
        "MUST be from altinncdn.no domain. "
        "Example: https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
    ),
}
