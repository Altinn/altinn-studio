from fastmcp import FastMCP
from mcp.types import (
    ToolAnnotations,
)
from typing import Set
import functools
import inspect
from contextvars import ContextVar
from server.tracing import trace_tool_call

# Context variable to track if current request is in agent mode
# Set by middleware based on request path (/sse vs /sse/agent)
_agent_mode_var: ContextVar[bool] = ContextVar('agent_mode', default=False)
# Instructions for the Altinity MCP Server
ALTINITY_INSTRUCTIONS = """
# Altinity MCP Server - Altinn Studio Assistant

You are an AI assistant specialized in Altinn Studio application development. This MCP server provides tools for generating, configuring, and documenting Altinn applications.

## ⚠️ MANDATORY: Always Start With planning_tool

**EVERY session MUST begin with `planning_tool`** - no exceptions.

```
planning_tool(query="<describe the user's task>")  ← ALWAYS FIRST
```

### Why This Is Required
- Provides essential Altinn domain knowledge that all other tools depend on
- Contains platform-specific conventions, file structures, and patterns
- Returns searchable documentation relevant to the specific task
- Without this context, you WILL make mistakes requiring rework

### ❌ WRONG - Never Do This
```
layout_components_tool()  ← WRONG: Missing critical Altinn context
datamodel_tool()          ← WRONG: Missing critical Altinn context
```

### ✅ CORRECT - Always Do This
```
planning_tool(query="create form with date field")  ← CORRECT: Get context first
layout_components_tool()                             ← Then proceed with task
```

---

## Tool Categories & Routing Guide

Tools are organized into three categories. Understanding these categories is essential for optimal tool selection.

### Category 1: Documentation Tools (Static Context)
These tools return static documentation. Call ONCE per session - repeated calls waste resources.

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `planning_tool` | Planning docs + searchable Altinn documentation | **⚠️ MANDATORY FIRST TOOL** - Always start here |
| `datamodel_tool` | Data model structure and bindings | When working with form data, XSD schemas, or data bindings |
| `resource_tool` | Text resources and translations | When implementing labels, translations, or localization |
| `policy_tool` | Authorization rules and access control | When configuring who can access what in policy.xml |
| `prefill_tool` | Form prefilling from external sources | When pre-populating form fields with user/org data |
| `dynamic_expression` | Conditional logic syntax | When implementing show/hide, validation, or calculations |

### Category 2: Discovery Tools (Query-Based)
These tools search or retrieve data. Results depend on input parameters.

| Tool | Purpose | Required Input |
|------|---------|----------------|
| `layout_components_tool` | Get ALL UI component examples | No query needed - returns full component library |
| `layout_properties_tool` | Get schema for specific component type | `component_type` (e.g., "Input"), `schema_url` |

### Category 3: Validation Tools (Input Required)
These tools validate or transform provided content. Always require specific input.

| Tool | Purpose | Required Input |
|------|---------|----------------|
| `schema_validator_tool` | Validate layout JSON against schema | `json_obj`, `schema_path` |
| `resource_validator_tool` | Validate text resource files | `resource_json`, optional `language`, `layout_files`, `repo_path` |
| `policy_summarization_tool` | Summarize policy.xml rules | `xml_content` (the policy XML) |
| `policy_validation_tool` | Validate policy against requirements | `query` (requirements), `policy_rules` (from summarization) |
| `datamodel_sync` | Generate XSD/C# from JSON schema | `schema_content`, `schema_filename` |

---

## ⚠️ CRITICAL: Tool Chaining Rules

### Required Sequences (DO follow these patterns)

0. **Every Session** (MANDATORY):
   ```
   planning_tool(query) → [any other tools]
   ```
   - ALWAYS call `planning_tool` first to get Altinn domain context

1. **Policy Validation Flow** (MANDATORY ORDER):
   ```
   planning_tool → policy_summarization_tool(xml_content) → policy_validation_tool(query, policy_rules)
   ```
   - You MUST call `policy_summarization_tool` FIRST to get `policy_rules`
   - Then pass those rules to `policy_validation_tool`
   - ❌ NEVER call `policy_validation_tool` without first calling `policy_summarization_tool`

2. **Layout Development Flow** (MANDATORY for creating layouts):
   ```
   planning_tool → layout_components_tool() → layout_properties_tool(component_type) → [create layout] → schema_validator_tool(json)
   ```
   - Get context → Get component examples → **Get schema for EACH component type you will use** → Create layout → Validate
   - ⚠️ `layout_properties_tool` is REQUIRED before using any component type
   - Call it once for each component type (e.g., Input, Datepicker, NavigationButtons)
   - Without property schemas, you will use invalid properties and create broken layouts

3. **Datamodel Creation Flow** (IMPORTANT):
   ```
   planning_tool → datamodel_tool() → [create .schema.json ONLY] → datamodel_sync(schema_content)
   ```
   - Get context → Understand structure → Create ONLY the .schema.json file
   - ⚠️ **NEVER manually create .xsd or .cs files** - use `datamodel_sync` to generate them
   - The sync tool ensures .xsd and .cs are correct and match the schema

4. **Post-Change Validation** (⚠️ MANDATORY - DO NOT SKIP):
   ```
   After modifying layouts    → schema_validator_tool(json_obj, schema_path)
   After modifying resources  → resource_validator_tool(resource_json)
   After modifying policy.xml → policy_summarization_tool → policy_validation_tool
   ```
   - ⚠️ You MUST validate ALL files you create or modify before finishing
   - This is NOT optional - validation catches errors that break the application
   - A task is NOT complete until validation passes

   **Example: If you modified Side1.json and resource.nb.json, you MUST run:**
   ```
   schema_validator_tool(json_obj=<Side1.json content>, schema_path="https://altinncdn.no/...")
   resource_validator_tool(resource_json=<resource.nb.json content>)
   ```

### Anti-Patterns (DO NOT do these)

❌ **DO NOT** call the same tool multiple times with identical parameters
   - `layout_components_tool` returns ALL components - call it ONCE, not repeatedly
   - `datamodel_tool`, `resource_tool`, `policy_tool`, `prefill_tool`, `dynamic_expression` return STATIC content
   - Calling them twice returns identical results and wastes resources

❌ **DO NOT** create layout components without first calling `layout_properties_tool`
   - You MUST call `layout_properties_tool` for EACH component type you plan to use
   - Example: Using Input, Datepicker, NavigationButtons? Call layout_properties_tool 3 times (once per type)
   - Without this, you will use invalid properties and create broken layouts

❌ **DO NOT** call `policy_validation_tool` without `policy_summarization_tool` output
   - It requires the `policy_rules` parameter from summarization
   - Will fail or produce meaningless results without proper input

❌ **DO NOT** manually create .xsd or .cs datamodel files
   - Only create the .schema.json file manually
   - Use `datamodel_sync` to generate .xsd and .cs - this ensures correctness
   - Manually created .xsd/.cs files will likely have errors or mismatches

❌ **DO NOT** skip validation after creating/modifying files
   - A task is INCOMPLETE without validation
   - You MUST run validators for ALL modified files:
     - Layout files (.json in ui/layouts/) → `schema_validator_tool`
     - Resource files (resource.*.json) → `resource_validator_tool`  
     - Policy files (policy.xml) → `policy_summarization_tool` + `policy_validation_tool`
   - If you modified 2 layout files and 1 resource file, run 3 validations

❌ **DO NOT** call `layout_properties_tool` without a valid `schema_url`
   - Schema URL must be from `altinncdn.no` domain
   - Example valid URL: `https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json`

❌ **DO NOT** call `schema_validator_tool` with non-altinncdn.no schema URLs
   - Only schemas from `altinncdn.no` are supported for security reasons

❌ **DO NOT** retry failed tool calls without changing parameters
   - If a tool returns an error, read the error message for guidance
   - Errors include specific hints about what to fix
   - Blind retries waste resources and will fail identically

---

## Tool Selection Decision Tree

```
User wants to...
│
├─► Understand Altinn concepts → planning_tool (with query for specific topics)
│
├─► Work with form layouts
│   ├─► Find component examples → layout_components_tool
│   ├─► Get component schema → layout_properties_tool (need component_type + schema_url)
│   └─► Validate layout JSON → schema_validator_tool (need json_obj + schema_path)
│
├─► Work with data models
│   ├─► Understand structure → datamodel_tool
│   └─► Generate XSD/C# files → datamodel_sync (need schema_content + schema_filename)
│
├─► Work with text resources
│   ├─► Understand format → resource_tool
│   └─► Validate resources → resource_validator_tool (need resource_json)
│
├─► Work with authorization
│   ├─► Understand policies → policy_tool
│   ├─► Summarize existing policy → policy_summarization_tool (need xml_content)
│   └─► Validate policy rules → policy_validation_tool (need query + policy_rules from summarization)
│
├─► Implement prefill → prefill_tool
│
└─► Implement conditional logic → dynamic_expression
```

---

## Parameter Requirements Summary

| Tool | Required Parameters | Optional Parameters |
|------|---------------------|---------------------|
| `planning_tool` | - | `query`, `max_results`, `include_planning_context`, `include_full_content` |
| `datamodel_tool` | - | - |
| `resource_tool` | - | - |
| `policy_tool` | - | - |
| `prefill_tool` | - | - |
| `dynamic_expression` | - | - |
| `layout_components_tool` | - | - |
| `layout_properties_tool` | `component_type`, `schema_url` | - |
| `schema_validator_tool` | `json_obj`, `schema_path` | - |
| `resource_validator_tool` | `resource_json` | `language`, `layout_files`, `repo_path` |
| `policy_summarization_tool` | `xml_content` | - |
| `policy_validation_tool` | `query`, `policy_rules` | - |
| `datamodel_sync` | `schema_content`, `schema_filename` | - |

---

Remember: This server specializes in Norwegian government applications using the Altinn platform. All generated code and guidance follows Altinn Studio conventions and patterns.
"""

# Global MCP instance - will be initialized by main.py after parsing arguments
mcp = None

def initialize_mcp(port: int = 8069):
    """Initialize the MCP server with the specified port."""
    global mcp
    if mcp is not None:
        return mcp  # Already initialized

    mcp = FastMCP(
        name="altinity_mcp_server",
        instructions=ALTINITY_INSTRUCTIONS,
        host="0.0.0.0",
        port=port,
        version="1.0.5"
    )
    return mcp

# Registry for dynamically loaded tools
tool_registry = []

def is_agent_mode() -> bool:
    """Check if current request is in agent mode.
    
    Agent mode is enabled when connecting via /sse/agent endpoint.
    In agent mode:
    - Langfuse tracing is skipped
    - user_goal parameter is optional (not required)
    """
    return _agent_mode_var.get()


def set_agent_mode(value: bool) -> None:
    """Set agent mode for the current request context."""
    _agent_mode_var.set(value)


def _make_user_goal_optional(func):
    """Create a wrapper with user_goal as optional parameter.
    
    This modifies the function signature so that user_goal has a default value,
    making it optional for MCP clients that don't provide it (agent mode).
    user_goal is moved to the end of the parameter list to avoid 
    'non-default argument follows default argument' error.
    """
    original_sig = inspect.signature(func)
    
    # Check if user_goal exists in parameters
    if 'user_goal' not in original_sig.parameters:
        return func
    
    # Separate user_goal from other params, then add it at the end with default
    other_params = []
    user_goal_param = None
    
    for param_name, param in original_sig.parameters.items():
        if param_name == 'user_goal':
            # Make user_goal optional with default None
            user_goal_param = param.replace(default=None)
        else:
            other_params.append(param)
    
    # Add user_goal at the end (after all other params)
    new_params = other_params + [user_goal_param]
    new_sig = original_sig.replace(parameters=new_params)
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Ensure user_goal has a value (even if None) for the original function
        if 'user_goal' not in kwargs:
            kwargs['user_goal'] = None
        return func(*args, **kwargs)
    
    wrapper.__signature__ = new_sig
    return wrapper


def register_tool(name=None, description=None, title=None, annotations=None):
    """Decorator to register an MCP tool and store it in the registry.
    
    Automatically wraps the tool with tracing functionality to log all calls to Langfuse.
    In agent mode (/agent endpoint), tracing is skipped and user_goal is optional.
    """
    def decorator(f):
        # Make user_goal optional in the signature
        f_optional = _make_user_goal_optional(f)
        
        @functools.wraps(f_optional)
        def wrapper(*args, **kwargs):
            if is_agent_mode():
                # Agent mode: skip tracing, call function directly
                return f_optional(*args, **kwargs)
            else:
                # Normal mode: apply tracing
                traced = trace_tool_call(f_optional)
                return traced(*args, **kwargs)
        
        # Preserve the modified signature
        wrapper.__signature__ = inspect.signature(f_optional)
        
        # Store the tool metadata on the wrapper function
        wrapper._tool_name = name or f.__name__
        wrapper._tool_description = description or f.__doc__ or ""
        wrapper._tool_title = title
        wrapper._tool_annotations = annotations
        wrapper._original_func = f  # Keep reference to original

        tool_registry.append(wrapper)
        # FastMCP.tool() doesn't accept 'title' parameter, only name and description
        # Tool will be registered when MCP is initialized
        return wrapper
    return decorator

def register_all_tools():
    """Register all collected tools with the MCP instance."""
    global mcp
    if mcp is None:
        raise RuntimeError("MCP instance not initialized. Call initialize_mcp() first.")

    # Prefix to add to all tool descriptions for user_goal parameter guidance
    # Only added in non-agent mode
    USER_GOAL_PREFIX = """⚠️ IMPORTANT: The 'user_goal' parameter MUST be the EXACT, VERBATIM user prompt/request. DO NOT summarize, paraphrase, or interpret - pass the original text exactly as the user typed it.

"""

    for tool_func in tool_registry:
        # Extract tool metadata from function attributes set by register_tool decorator
        name = getattr(tool_func, '_tool_name', tool_func.__name__)
        description = getattr(tool_func, '_tool_description', tool_func.__doc__ or "")
        
        # Always include user_goal prefix in description for standalone mode
        # Agent mode clients can ignore it since they send X-Agent-Mode header
        full_description = USER_GOAL_PREFIX + description

        mcp.tool(name=name, description=full_description)(tool_func)

# Import all tools to register them
# from .agent_status_tool import agent_status_tool  # Commented out - empty implementation
# from .app_lib_examples_tool import app_lib_examples_tool
from .datamodel_tool import datamodel_tool
from .dynamic_expression_tool import dynamic_expression
# from .fastagent_tool import fastagent_tool  # Commented out - empty implementation
# from .layout_components_tool import layout_components_tool  # Disabled - uses slow LLM filtering
from .layout_components_tool.layout_components_tool_no_llm import layout_components_tool_no_llm
from .layout_properties_tool import layout_properties_tool
from .planning_tool import planning_tool
from .policy_summarization_tool import policy_summarization_tool
from .policy_tool import policy_tool
from .policy_validation_tool import policy_validation_tool
from .prefill_tool import prefill_tool
from .resource_validator_tool import resource_validator_tool
from .schema_validator_tool import schema_validator_tool
from .server_info_tool import server_info
# from .studio_examples_tool import studio_examples_tool
