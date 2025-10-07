"""
Enhanced tool execution with better MLflow tracing.
"""
import json
import mlflow
from typing import Dict, Any, List, Optional
from agents.services.mcp.mcp_client import get_mcp_client
from agents.services.telemetry import (
    SpanTypes, capture_tool_output, create_tool_span, format_as_markdown, is_json
)
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def execute_tool(tool_name: str, tool_input: Dict[str, Any], display_name: str = None):
    """
    Execute a tool with enhanced MLflow tracing
    
    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool
        display_name: Optional display name for the span
        
    Returns:
        Tool execution result
    """
    span_name = display_name or f"{tool_name.replace('_tool', '')}_generation"
    
    with mlflow.start_span(name=span_name, span_type="TOOL") as span:
        client = get_mcp_client()
        
        # Set detailed attributes
        span.set_attributes({
            "tool_name": tool_name,
            "parameter_count": len(tool_input)
        })
        
        # Set detailed inputs
        span.set_inputs({
            "tool_parameters": tool_input,
            "parameter_summary": {k: str(v)[:100] + "..." if isinstance(v, str) and len(v) > 100 else v 
                                for k, v in tool_input.items()}
        })
        
        try:
            # Call the tool
            result = await client.call_tool(tool_name, tool_input)
            
            # Format the output for multiple views
            result_str = str(result)
            span.set_outputs({
                "raw_result": result,
                "formats": {
                    "text": result_str,
                    "markdown": format_as_markdown(result),
                    "json": result if isinstance(result, dict) else 
                           (json.loads(result_str) if is_json(result_str) else None)
                },
                "result_length": len(result_str),
                "success": True
            })
            
            return result
            
        except Exception as e:
            span.set_status("ERROR")
            span.set_outputs({
                "error": str(e),
                "success": False
            })
            log.error(f"Tool execution failed for {tool_name}: {e}")
            raise
