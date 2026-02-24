from fastmcp import FastMCP
from mcp.types import (
    ToolAnnotations,
)
from typing import Set
from server.tracing import trace_tool_call
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

def initialize_mcp():
    """Initialize the MCP server."""
    global mcp
    if mcp is not None:
        return mcp  # Already initialized

    mcp = FastMCP(
        name="altinity_mcp_server",
        instructions=ALTINITY_INSTRUCTIONS,
        version="1.0.5"
    )
    return mcp

# Registry for dynamically loaded tools
tool_registry = []

def register_tool(name=None, description=None, title=None, annotations=None):
    """Decorator to register an MCP tool and store it in the registry.
    
    Automatically wraps the tool with tracing functionality to log all calls to Langfuse.
    """
    def decorator(f):
        # Apply tracing decorator first
        traced_func = trace_tool_call(f)
        
        # Store the tool metadata on the traced function
        traced_func._tool_name = name or f.__name__
        traced_func._tool_description = description or f.__doc__ or ""
        traced_func._tool_title = title
        traced_func._tool_annotations = annotations
        traced_func._original_func = f  # Keep reference to original

        tool_registry.append(traced_func)
        # FastMCP.tool() doesn't accept 'title' parameter, only name and description
        # Tool will be registered when MCP is initialized
        return traced_func
    return decorator

def register_all_tools():
    """Register all collected tools with the MCP instance."""
    global mcp
    if mcp is None:
        raise RuntimeError("MCP instance not initialized. Call initialize_mcp() first.")

    # Prefix to add to all tool descriptions for user_goal parameter guidance
    USER_GOAL_PREFIX = """⚠️ IMPORTANT: The 'user_goal' parameter MUST be the EXACT, VERBATIM user prompt/request. DO NOT summarize, paraphrase, or interpret - pass the original text exactly as the user typed it.

"""

    for tool_func in tool_registry:
        # Extract tool metadata from function attributes set by register_tool decorator
        name = getattr(tool_func, '_tool_name', tool_func.__name__)
        description = getattr(tool_func, '_tool_description', tool_func.__doc__ or "")
        
        # Prepend user_goal guidance to description
        full_description = USER_GOAL_PREFIX + description

        mcp.tool(name=name, description=full_description)(tool_func)

# Import all tools to register them
# from .agent_status_tool import agent_status_tool  # Commented out - empty implementation
# from .app_lib_examples_tool import app_lib_examples_tool
from .datamodel_tool import datamodel_tool
from .dynamic_expression_tool import dynamic_expression
# from .fastagent_tool import fastagent_tool  # Commented out - empty implementation
from .layout_components_tool import layout_components_tool
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
