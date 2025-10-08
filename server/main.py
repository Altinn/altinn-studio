"""Entry point for the Altinity MCP server."""

from server.tools import mcp  # noqa: F401 - imported for side effects
# Import tool modules so they register themselves
# from server.tools.logic_generator_tool.logic_generator import logic_generator_tool  # noqa: F401
from server.tools.layout_components_tool.layout_components_tool import layout_components_tool  # noqa: F401
from server.tools.dynamic_expression_tool.dynamic_expressions import dynamic_expression  # noqa: F401
from server.tools.datamodel_tool.datamodel_tool import datamodel_tool  # noqa: F401
from server.tools.resource_tool.resource_tool import resource_tool  # noqa: F401
from server.tools.policy_tool.policy_tool import policy_tool  # noqa: F401
from server.tools.prefill_tool.prefill_tool import prefill_tool  # noqa: F401  
from server.tools.policy_validation_tool.policy_validation_tool import policy_validation_tool  # noqa: F401 
from server.tools.policy_summarization_tool.policy_summarization_tool import policy_summarization_tool  # noqa: F401 
from server.tools.schema_validator_tool.schema_validator_tool import schema_validator_tool  # noqa: F401
from server.tools.layout_properties_tool.layout_properties_tool import layout_properties_tool  # noqa: F401
from server.tools.planning_tool.planning_tool import planning_tool  # noqa: F401
from server.tools.datamodel_sync_tool.datamodel_sync_tool import datamodel_sync  # noqa: F401
# Commented out due to dependency on codegen module
# from server.tools.studio_examples_tool.studio_examples_tool import studio_examples_tool  # noqa: F401
# from server.tools.app_lib_examples_tool.app_lib_examples_tool import app_lib_examples_tool  # noqa: F401
def main() -> None:
    """Start the Altinity MCP server.

    When launching via ``uv run -m server.main`` (or ``python -m server.main``)
    you can pass the flag ``--stdio`` to use the *stdio* transport instead of
    the default *sse* transport. This makes it convenient to integrate the
    server in environments that expect communication over standard
    input/output.

    You can also specify a custom port with ``--port <port_number>``.
    """
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="Altinity MCP Server")
    parser.add_argument("--stdio", action="store_true", help="Use stdio transport instead of sse")
    parser.add_argument("--port", type=int, help="Custom port for sse transport (default: 8069)")
    
    args = parser.parse_args()

    # Determine the port to use
    port = args.port if args.port else 8069

    # Initialize MCP with the correct port BEFORE importing tools
    from server.tools import initialize_mcp, register_all_tools
    mcp = initialize_mcp(port)
    
    # Now register all the tools with the initialized MCP instance
    register_all_tools()

    transport = "stdio" if args.stdio else "sse"
    
    if transport == "stdio":
        print("Starting Altinity MCP server using stdio transport")
    else:
        print(f"Starting Altinity MCP server on port {port} using transport {transport}")
    
    mcp.run(transport=transport)


if __name__ == "__main__":
    main()