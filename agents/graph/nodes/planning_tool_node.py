"""Planning tool node that calls MCP planning_tool for semantic guidance."""

from __future__ import annotations

import json
import re
import mlflow
from agents.graph.state import AgentState
from agents.services.events import AgentEvent, sink
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def _extract_markdown_from_guidance(planning_guidance: str) -> str:
    """
    Extract markdown content from planning guidance.
    
    If guidance is JSON, extract and combine all relevant content:
    - planning_context: Base Altinn documentation
    - content: Combined planning context + search results
    
    Also fixes markdown formatting issues (removes problematic triple-backtick wrappers).
    """
    if not planning_guidance:
        return ""
    
    try:
        parsed = json.loads(planning_guidance)
        
        # Log available fields for debugging
        log.info(f"📋 Planning guidance JSON fields: {list(parsed.keys())}")
        
        # PRIORITY 1: Check for 'content' field (combined planning_context + search results)
        # The planning_tool MCP returns this when semantic search is performed
        if "content" in parsed:
            content = parsed["content"]
            log.info(f"✅ Extracted {len(content)} chars from 'content' field (includes search results)")
            
            # FIX: Remove problematic triple-backtick wrappers around "Full Content"
            # The MCP server wraps full content in ```...``` which breaks markdown rendering
            # since the content itself is already markdown
            # Pattern: **Full Content:**\n\n```\n<content>\n```
            content = re.sub(
                r'\*\*Full Content:\*\*\n\n```\n(.*?)\n```\n',
                r'**Full Content:**\n\n\1\n',
                content,
                flags=re.DOTALL
            )
            log.info("🔧 Fixed markdown formatting (removed triple-backtick wrappers)")
            
            return content
        
        # PRIORITY 2: Fallback to planning_context only (no search results)
        if "planning_context" in parsed:
            context = parsed["planning_context"]
            log.info(f"ℹ️ Using 'planning_context' field only ({len(context)} chars) - no search results")
            return context
        
        # PRIORITY 3: Last resort - return entire JSON as string
        log.warning("⚠️ Neither 'content' nor 'planning_context' found in JSON")
        log.debug(f"Full JSON structure: {json.dumps(parsed, indent=2)[:500]}...")
        return planning_guidance
            
    except (json.JSONDecodeError, AttributeError, TypeError):
        # If not JSON or parsing fails, use as-is
        return planning_guidance


async def handle(state: AgentState) -> AgentState:
    """Call planning_tool MCP tool to get planning guidance with semantic search."""
    
    import time
    log.info(f"⏱️ [PLANNING_TOOL NODE] Starting at {time.time()}")
    log.info("📋 Planning tool node executing")
    
    with mlflow.start_span(name="planning_tool_node", span_type="AGENT") as node_span:
        # Set node-level inputs
        node_span.set_inputs({
            "user_goal": state.user_goal,
            "has_repo_facts": bool(state.repo_facts),
            "repo_facts_summary": {
                "layouts": len(state.repo_facts.get("layouts", [])) if state.repo_facts else 0,
                "models": len(state.repo_facts.get("models", [])) if state.repo_facts else 0,
                "resources": len(state.repo_facts.get("resources", [])) if state.repo_facts else 0
            }
        })
        
        try:
            from agents.services.mcp import get_mcp_client
            from agents.services.llm import extract_semantic_query
            
            # Step 1: Generate focused semantic search query from user goal using shared utility
            semantic_query = await extract_semantic_query(state.user_goal, context="planning")
            
            client = get_mcp_client()
            await client.connect()
            
            with mlflow.start_span(name="planning_tool_mcp_call", span_type="TOOL") as span:
                # Prepare tool input with focused semantic search query
                # The query enables TF-IDF semantic search in planning_tool
                tool_input = {
                    "query": semantic_query,  # Use generated focused query
                    "repository_facts": state.repo_facts or {}
                }
                
                log.info(f"🔍 Calling planning_tool with semantic search query: {semantic_query}")
                
                span.set_attributes({
                    "semantic_query_length": len(semantic_query),
                    "original_goal_length": len(state.user_goal),
                    "has_repo_facts": bool(state.repo_facts),
                    "tool": "planning_tool",
                    "semantic_search_enabled": True
                })
                
                span.set_inputs({
                    "tool": "planning_tool",
                    "semantic_query": semantic_query,  # Focused English query for semantic search
                    "original_user_goal": state.user_goal[:200] + "..." if len(state.user_goal) > 200 else state.user_goal,
                    "query_length": len(semantic_query),
                    "repository_facts_summary": {
                        "layouts": len(state.repo_facts.get("layouts", [])) if state.repo_facts else 0,
                        "models": len(state.repo_facts.get("models", [])) if state.repo_facts else 0,
                        "resources": len(state.repo_facts.get("resources", [])) if state.repo_facts else 0
                    }
                })
                
                # Call planning_tool with enhanced semantic search
                # Without query: Returns standard planning context
                # With query: Returns TF-IDF semantic search results (top 5 relevant docs)
                planning_result = await client.call_tool('planning_tool', tool_input)
                
                # Extract planning guidance using robust extraction
                planning_guidance = None
                if planning_result:
                    # Handle CallToolResult objects (MCP client returns these)
                    if hasattr(planning_result, 'content'):
                        content = planning_result.content
                        if isinstance(content, str):
                            planning_guidance = content
                        elif isinstance(content, list) and content:
                            first_item = content[0]
                            if hasattr(first_item, 'text'):
                                planning_guidance = first_item.text
                            else:
                                planning_guidance = str(first_item)
                    # Handle legacy list responses
                    elif isinstance(planning_result, list) and len(planning_result) > 0:
                        if hasattr(planning_result[0], 'text'):
                            planning_guidance = planning_result[0].text
                
                log.info(f"📦 Planning result type: {type(planning_result)}")
                log.info(f"📦 Has content attr: {hasattr(planning_result, 'content')}")
                if hasattr(planning_result, 'content'):
                    log.info(f"📦 Content type: {type(planning_result.content)}")
                
                # Store in state
                state.planning_guidance = planning_guidance
                
                # Extract markdown from JSON response for display
                guidance_markdown = _extract_markdown_from_guidance(planning_guidance)
                
                span.set_outputs({
                    "tool_result": {
                        "guidance_length": len(planning_guidance) if planning_guidance else 0,
                        "has_guidance": bool(planning_guidance)
                    },
                    # Full guidance displayed as markdown in MLflow
                    "guidance_markdown": guidance_markdown
                })
                
                log.info(f"✅ Retrieved planning guidance ({len(planning_guidance) if planning_guidance else 0} chars)")
            
            # Set node-level outputs
            guidance_md = _extract_markdown_from_guidance(planning_guidance)
            node_span.set_outputs({
                "semantic_query": semantic_query,
                "planning_guidance_length": len(planning_guidance) if planning_guidance else 0,
                "has_planning_guidance": bool(planning_guidance),
                # Full guidance displayed as markdown in MLflow
                "planning_guidance_markdown": guidance_md
            })
            
            sink.send(AgentEvent(
                type="status",
                session_id=state.session_id,
                data={
                    "message": "Planning guidance retrieved",
                    "guidance_length": len(planning_guidance) if planning_guidance else 0,
                    "preview": planning_guidance[:200] + "..." if planning_guidance and len(planning_guidance) > 200 else planning_guidance
                }
            ))
            
            # Verify state was updated
            if planning_guidance:
                log.info(f"✅ Planning guidance stored in state ({len(planning_guidance)} chars)")
            else:
                log.warning("⚠️ Planning guidance is empty - planning_tool returned no results")
            
            log.info(f"📤 Planning tool node complete, state.planning_guidance={'SET' if state.planning_guidance else 'NOT SET'}")
            state.next_action = "plan"
            
        except Exception as exc:
            log.error(f"❌ Planning tool node failed: {exc}", exc_info=True)
            node_span.set_attribute("error", str(exc))
            # Ensure planning_guidance is at least empty string, not None
            if not hasattr(state, 'planning_guidance') or state.planning_guidance is None:
                state.planning_guidance = ""
                log.error("Set planning_guidance to empty string after error")
            state.next_action = "stop"
            sink.send(
                AgentEvent(
                    type="error",
                    session_id=state.session_id,
                    data={"message": f"Planning tool call failed: {exc}"},
                )
            )
    
    return state
