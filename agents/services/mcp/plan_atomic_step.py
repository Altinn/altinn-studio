"""
Function to plan a single atomic step for the user goal.
"""
import json
import mlflow
from typing import Dict, Any, List, Optional
from agents.services.mcp.mcp_client import get_mcp_client
from agents.services.telemetry import (
    SpanTypes, capture_tool_output, format_as_markdown, is_json
)
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def plan_atomic_step(user_goal, facts):
    """Get high-level planning guidance for the user goal
    
    This function gets general guidance, not a detailed plan.
    The detailed plan will be created after gathering tool information.
    """
    with mlflow.start_span(name="planning_guidance_generation", span_type="TOOL") as span:
        client = get_mcp_client()
        
        # Create planning tool input for high-level guidance
        tool_input = {
            "user_goal": user_goal,
            "repository_facts": facts,
            "guidance_type": "high_level"  # Request high-level guidance only
        }
        
        # Set detailed inputs
        span.set_attributes({
            "goal_length": len(user_goal),
            "facts_count": len(facts) if isinstance(facts, list) else 1,
            "tool": "planning_tool",
            "guidance_type": "high_level"
        })
        span.set_inputs({
            "user_goal": user_goal,
            "repository_facts": facts
        })
        
        # Call planning tool
        response = await client.call_tool("planning_tool", tool_input)
        
        # Parse response
        if hasattr(response, 'text'):
            guidance_text = response.text
        else:
            guidance_text = str(response)
        
        # Format the output for multiple views
        span.set_outputs({
            "full_guidance": guidance_text,  # Complete guidance text
            "guidance_summary": guidance_text[:200] + "..." if len(guidance_text) > 200 else guidance_text,
            "guidance_length": len(guidance_text),
            "formats": {
                "text": guidance_text,
                "markdown": f"```\n{guidance_text}\n```",
                "json": json.loads(guidance_text) if is_json(guidance_text) else None
            }
        })
        
        # Return high-level guidance, not a detailed plan
        return guidance_text
