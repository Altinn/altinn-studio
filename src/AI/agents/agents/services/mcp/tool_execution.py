"""
Enhanced tool execution with better langfuse tracing.
"""
import json
from typing import Dict, Any, List, Optional
from langfuse import get_client
from agents.services.mcp.mcp_client import get_mcp_client
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def execute_tool(tool_name: str, tool_input: Dict[str, Any], display_name: str = None):
    """
    Execute a tool with enhanced Langfuse tracing
    
    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool
        display_name: Optional display name for the span
        
    Returns:
        Tool execution result
    """
    span_name = display_name or f"{tool_name.replace('_tool', '')}_generation"
    
    langfuse = get_client()
    with langfuse.start_as_current_span(name=span_name, metadata={"span_type": "TOOL"}) as span:
        client = get_mcp_client()
        
        # Set detailed metadata
        span.update(metadata={
            "tool_name": tool_name,
            "parameter_count": len(tool_input)
        })

        # Set detailed inputs
        span.update(input={
            "tool_parameters": tool_input,
            "parameter_summary": {k: str(v)[:100] + "..." if isinstance(v, str) and len(v) > 100 else v
                                for k, v in tool_input.items()}
        })
        
        try:
            # Call the tool
            result = await client.call_tool(tool_name, tool_input)
            
            # Format the output for multiple views
            result_str = str(result)
            span.update(output={
                "result": result,
                "result_length": len(result_str),
                "success": True
            })
            
            return result
            
        except Exception as e:
            span.update(level="ERROR", output={
                "error": str(e),
                "success": False
            })
            log.error(f"Tool execution failed for {tool_name}: {e}")
            raise
