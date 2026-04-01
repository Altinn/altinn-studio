"""
Function to plan a single atomic step for the user goal.
"""
import json
from typing import Dict, Any, List, Optional
from agents.services.mcp.mcp_client import get_mcp_client
from shared.utils.langfuse_utils import trace_span
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def plan_atomic_step(user_goal, facts):
    """Get high-level planning guidance for the user goal
    
    This function gets general guidance, not a detailed plan.
    The detailed plan will be created after gathering tool information.
    """
    with trace_span("planning_guidance_generation", metadata={"span_type": "TOOL"}) as span:
        client = get_mcp_client()
        
        # Create planning tool input for high-level guidance
        tool_input = {
            "user_goal": user_goal,
            "guidance_type": "high_level"  # Request high-level guidance only
        }
        
        # Set detailed metadata
        span.update(metadata={
            "goal_length": len(user_goal),
            "facts_count": len(facts) if isinstance(facts, list) else 1,
            "tool": "altinn_route",
            "guidance_type": "high_level"
        })
        span.update(input={
            "user_goal": user_goal,
            "repository_facts": facts
        })
        
        # Call altinn_route - the v2 entry point
        response = await client.call_tool("altinn_route", tool_input)
        
        # Parse response
        if hasattr(response, 'text'):
            guidance_text = response.text
        else:
            guidance_text = str(response)
        
        # Format the output for multiple views
        span.update(output={
            "guidance": guidance_text,
            "guidance_summary": guidance_text[:200] + "..." if len(guidance_text) > 200 else guidance_text,
            "guidance_length": len(guidance_text)
        })
        
        # Return high-level guidance, not a detailed plan
        return guidance_text
