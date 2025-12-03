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

## Available Tools Overview

Use these tools to help developers build Altinn Studio applications:

### Core Development Tools


1.. **layout_components_tool(query: str)** - Find relevant UI components
   - Use for: Discovering existing layout components and UI patterns
   - Input: Description of the UI component or functionality needed
   - Returns: Relevant component JSONs with relevance scores
   - Note: LLM-powered relevance matching, avoid multiple queries without keyword changes

2. **schema_validator_tool(owner: str, repo: str, layout_json: str)** - Validate layout JSON
   - Use for: Validating entire layout JSON files against Altinn Studio layout schema definitions
   - Input: Repository owner, repo name, and layout JSON string
   - Returns: Validation status, missing required properties, and detailed error messages
   - Focused on validation only - use for checking layout correctness

3. **layout_properties_tool(owner: str, repo: str, component_type: str)** - Get component schema info
   - Use for: Understanding available properties and requirements for component types
   - Input: Repository owner, repo name, and component type (e.g., "Input", "Button")
   - Returns: Allowed properties, required properties, and detailed property specifications
   - Focused on schema discovery - use for understanding component capabilities


4. **logic_generator_tool(query: str)** - Generate C# logic code
   - Use for: Creating validation logic, calculations, business rules
   - Input: Natural language description of the logic needed
   - Returns: Generated C# code files for Altinn applications

### Documentation Tools

5. **datamodel_tool()** - Get datamodel documentation
   - Use for: Understanding Altinn data models and schemas
   - No parameters needed - returns comprehensive documentation
   - Call once per session as content is static

6. **resource_tool()** - Get resource implementation guide
   - Use for: Learning how to implement resources in Altinn applications
   - No parameters needed - returns implementation documentation
   - Call once per session as content is static

7. **policy_tool()** - Get authorization and policy context
   - Use for: Understanding access control, user roles, and policy.xml configuration
   - No parameters needed - returns policy generation context
   - Call once per session as content is static

8. **prefill_tool()** - Get prefill configuration guide
   - Use for: Learning how to implement data prefilling
   - No parameters needed - returns prefill implementation instructions
   - Call once per session as content is static

9. **dynamic_expression()** - Get dynamic expressions documentation
   - Use for: Understanding and implementing dynamic expressions
   - No parameters needed - returns expressions documentation and examples
   - Call once per session as content is static

## Usage Guidelines

### For Code Generation
- Start with documentation tools to understand the domain
- Use logic_generator_tool for specific code requirements
- Use layout_components_tool to find existing UI patterns

### For Learning and Reference
- Documentation tools provide comprehensive guides
- Each documentation tool only needs to be called once per session
- Use these to understand Altinn concepts before generating code

### Best Practices
1. Call documentation tools first to establish context
2. Be specific in queries to logic_generator_tool and layout_components_tool
3. Documentation tools return markdown content - present it clearly to users
4. For complex applications, break down requirements into smaller, focused queries

## Workflow Recommendations

1. **New Project Setup**: Start with datamodel_tool and resource_tool
2. **UI Development**: Use layout_components_tool to find existing patterns
3. **Business Logic**: Use logic_generator_tool for validation and calculations
4. **Authorization**: Use policy_tool for access control implementation
5. **Data Management**: Use prefill_tool for data initialization
6. **Advanced Features**: Use dynamic_expression for complex UI behavior

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
