"""Chat handler for question answering without making changes."""

from typing import List, Dict, Any, Optional
import mlflow
from agents.services.mcp import get_mcp_client
from agents.services.repo import discover_repository_context
from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
from shared.models import AgentAttachment
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle_chat_query(
    query: str,
    repo_path: str,
    session_id: str,
    attachments: Optional[List[AgentAttachment]] = None
) -> Dict[str, Any]:
    """
    Handle a chat query without making changes.
    
    Args:
        query: The user's question
        repo_path: Path to the repository
        session_id: Session identifier
        attachments: Optional attachments (images, files)
    
    Returns:
        Dict with response and tool results
    """
    log.info(f"💬 Chat mode: handling query for session {session_id}")
    
    with mlflow.start_span(name="chat_query", span_type="CHAIN") as span:
        span.set_attributes({
            "session_id": session_id,
            "query_length": len(query),
            "has_attachments": bool(attachments),
        })
        
        # Step 1: Scan repository for context
        log.info("📂 Scanning repository for context...")
        with mlflow.start_span(name="repository_context", span_type="TOOL"):
            repo_context = discover_repository_context(repo_path)
            repo_summary = {
                "layouts": repo_context.layout_pages,
                "models": repo_context.model_files,
                "resources": repo_context.resource_files,
                "locales": repo_context.available_locales,
            }
        
        # Step 2: Connect to MCP and get available tools
        log.info("🔧 Connecting to MCP tools...")
        mcp_client = get_mcp_client()
        await mcp_client.connect()
        
        # Get documentation tools and context tools
        available_tools = mcp_client._available_tools or []
        tool_names = [
            tool.get("name") if isinstance(tool, dict) else tool
            for tool in available_tools
        ]
        
        # Step 3: Determine which tools to call based on query
        relevant_tools = await _select_relevant_tools(query, tool_names, repo_summary)
        
        # Step 4: Call selected tools
        tool_results = {}
        if relevant_tools:
            log.info(f"📊 Calling {len(relevant_tools)} relevant tools...")
            with mlflow.start_span(name="tool_execution", span_type="TOOL") as tool_span:
                for tool_name in relevant_tools:
                    try:
                        result = await mcp_client.call_tool(tool_name, {})
                        
                        # Handle CallToolResult objects with structured_content
                        if hasattr(result, 'structured_content') and result.structured_content:
                            tool_results[tool_name] = result.structured_content
                        elif hasattr(result, 'content'):
                            # Handle content attribute (may be list or string)
                            content = result.content
                            if isinstance(content, list) and len(content) > 0:
                                # Extract text from first item if available
                                first_item = content[0]
                                if hasattr(first_item, 'text'):
                                    tool_results[tool_name] = {"text": first_item.text}
                                else:
                                    tool_results[tool_name] = first_item
                            elif isinstance(content, str):
                                tool_results[tool_name] = {"text": content}
                            else:
                                tool_results[tool_name] = content
                        else:
                            # Fallback to the result itself
                            tool_results[tool_name] = result
                    except Exception as e:
                        log.error(f"Failed to call tool {tool_name}: {e}")
                        tool_results[tool_name] = {"error": str(e)}
                
                success_count = sum(
                    1 for r in tool_results.values() 
                    if not (isinstance(r, dict) and "error" in r)
                )
                tool_span.set_outputs({
                    "tools_called": list(tool_results.keys()),
                    "success_count": success_count
                })
        
        # Step 5: Generate response using LLM with context
        log.info("🤖 Generating response...")
        with mlflow.start_span(name="response_generation", span_type="LLM"):
            response = await _generate_chat_response(
                query,
                repo_summary,
                tool_results,
                attachments
            )
        
        return {
            "response": response,
            "repository_summary": repo_summary,
            "tools_used": list(tool_results.keys()),
            "mode": "chat"
        }


async def _select_relevant_tools(
    query: str,
    available_tools: List[str],
    repo_summary: Dict[str, Any]
) -> List[str]:
    """Select which MCP tools are relevant for answering the query."""
    
    query_lower = query.lower()
    selected = []
    
    # Documentation tools - always useful for concept questions
    doc_tools = {
        "datamodel_tool": ["datamodel", "data model", "binding", "field type"],
        "prefill_tool": ["prefill", "pre-fill", "prepopulate", "er", "dsf"],
        "dynamic_expression": ["expression", "hidden", "required", "conditional", "dynamic"],
        "planning_tool": ["best practice", "how to", "guidance", "documentation"],
    }
    
    for tool, keywords in doc_tools.items():
        if tool in available_tools and any(kw in query_lower for kw in keywords):
            selected.append(tool)
    
    # Repository-specific tools
    if any(word in query_lower for word in ["layout", "component", "field", "page"]):
        if "layout_reader_tool" in available_tools:
            selected.append("layout_reader_tool")
        if "layout_properties_tool" in available_tools:
            selected.append("layout_properties_tool")
    
    if any(word in query_lower for word in ["text", "resource", "label", "translation"]):
        if "resource_reader_tool" in available_tools:
            selected.append("resource_reader_tool")
    
    if any(word in query_lower for word in ["model", "schema", "datamodel"]):
        if "datamodel_tool" in available_tools and "datamodel_tool" not in selected:
            selected.append("datamodel_tool")
    
    # If no specific tools matched, provide general documentation
    if not selected and "planning_tool" in available_tools:
        selected.append("planning_tool")
    
    return selected


async def _generate_chat_response(
    query: str,
    repo_summary: Dict[str, Any],
    tool_results: Dict[str, Any],
    attachments: Optional[List[AgentAttachment]] = None
) -> str:
    """Generate a natural language response using LLM."""
    
    client = LLMClient(role="assistant")
    
    system_prompt = get_prompt_content("chat_assistant")
    
    # Build context from repository
    layouts_list = repo_summary.get('layouts', [])
    models_list = repo_summary.get('models', [])
    resources_list = repo_summary.get('resources', [])
    locales_list = repo_summary.get('locales', [])
    
    repo_context = f"""
REPOSITORY CONTEXT:
- Layouts: {len(layouts_list)} page(s) - {', '.join(layouts_list[:5]) if layouts_list else 'none'}
- Data Models: {len(models_list)} file(s) - {', '.join(models_list[:3]) if models_list else 'none'}
- Text Resources: {len(resources_list)} file(s)
- Available Locales: {', '.join(locales_list) if locales_list else 'none'}
"""
    
    # Build context from tool results
    tool_context = ""
    if tool_results:
        tool_context = "\n\nRELEVANT DOCUMENTATION:\n"
        for tool_name, result in tool_results.items():
            if isinstance(result, dict):
                if "error" in result:
                    continue
                # Extract text content from various result formats
                if "text" in result:
                    tool_context += f"\n{tool_name}:\n{result['text'][:1000]}...\n"
                elif "content" in result:
                    content_str = str(result['content']) if not isinstance(result['content'], str) else result['content']
                    tool_context += f"\n{tool_name}:\n{content_str[:1000]}...\n"
                else:
                    tool_context += f"\n{tool_name}:\n{str(result)[:1000]}...\n"
            elif hasattr(result, 'text'):
                # Handle objects with text attribute
                tool_context += f"\n{tool_name}:\n{result.text[:1000]}...\n"
            else:
                # Fallback: convert to string
                tool_context += f"\n{tool_name}:\n{str(result)[:1000]}...\n"
    
    user_prompt = render_template(
        "chat_assistant_user",
        query=query,
        repo_context=repo_context,
        tool_context=tool_context
    )
    
    response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
    return response
