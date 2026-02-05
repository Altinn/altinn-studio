"""Assistant node for handling read-only Q&A queries about Altinn applications."""

from __future__ import annotations

from langfuse import get_client
import re
import json
from typing import Dict, Any, List, Optional
from agents.graph.state import AgentState
from agents.services.mcp import get_mcp_client
from agents.services.repo import discover_repository_context
from agents.services.llm import LLMClient
from agents.services.events import AgentEvent, sink
from agents.prompts import get_prompt_content, render_template
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """
    Handle a Q&A query without making changes.
    
    This node provides read-only assistance by:
    1. Scanning repository for context
    2. Selecting relevant MCP tools
    3. Calling tools to gather documentation
    4. Generating a helpful response using LLM
    
    Args:
        state: AgentState with user_goal as the question
    
    Returns:
        AgentState with assistant_response populated
    """
    log.info(f"💬 Assistant node: handling query for session {state.session_id}")
    
    langfuse = get_client()
    with langfuse.start_as_current_span(
        name="assistant_query",
        metadata={
            "span_type": "CHAIN",
            "session_id": state.session_id,
            "query_length": len(state.user_goal),
            "has_attachments": bool(state.attachments),
            "attachment_count": len(state.attachments) if state.attachments else 0,
        },
        input={
            "query": state.user_goal,
            "repo_path": state.repo_path,
            "attachments": [
                {"name": att.name, "mime_type": att.mime_type}
                for att in (state.attachments or [])
            ]
        }
    ) as main_span:
        
        try:
            # Step 1: Scan repository for context
            log.info("📂 Scanning repository for context...")
            repo_summary = await _scan_repository(state)
            
            # Step 2: Connect to MCP and get available tools
            log.info("🔧 Connecting to MCP tools...")
            tool_names = await _get_available_tools()
            
            # Step 3: Plan tool execution (LLM-based, always includes planning_tool)
            log.info("🎯 Planning tool execution...")
            tool_plan = await _select_relevant_tools(
                state.user_goal,
                tool_names,
                repo_summary,
                state.conversation_history  # Include conversation history for context
            )
            
            # Step 4: Execute tool plan
            tool_results = {}
            if tool_plan:
                log.info(f"📊 Executing {len(tool_plan)} tools according to plan...")
                tool_results = await _execute_tools(tool_plan)
            
            # Step 5: Generate response
            log.info("🤖 Generating response...")
            response = await _generate_response(
                state.user_goal,
                repo_summary,
                tool_results,
                state.attachments,
                state.conversation_history  # Include conversation history for context
            )
            
            # Step 6: Extract all available sources from tool results
            all_sources = _extract_sources(tool_results)
            log.info(f"📚 Extracted {len(all_sources)} sources available: {[s.get('title') for s in all_sources]}")
            
            # Step 7: Parse which sources LLM actually cited and clean response
            clean_response, cited_sources = _extract_cited_sources_from_response(response, all_sources)
            log.info(f"✅ LLM cited {len(cited_sources)}/{len(all_sources)} sources: {[s.get('title') for s in cited_sources]}")
            
            # Set outputs on main span
            main_span.update(output={
                "response_length": len(clean_response),
                "tools_used": list(tool_results.keys()),
                "repository_summary": repo_summary,
                "sources_count": len(cited_sources),
                "cited_sources": [s.get('title') for s in cited_sources]
            })
            
            # Store result in state
            state.assistant_response = {
                "response": clean_response,
                "repository_summary": repo_summary,
                "tools_used": list(tool_results.keys()),
                "sources": cited_sources,  # Only sources that were actually cited
                "mode": "chat"
            }
            
            # Add this Q&A to conversation history for future context
            from agents.graph.state import ConversationMessage
            state.conversation_history.append(
                ConversationMessage(role="user", content=state.user_goal)
            )
            state.conversation_history.append(
                ConversationMessage(
                    role="assistant",
                    content=clean_response,
                    sources=cited_sources
                )
            )
            log.info(f"✅ Assistant query completed for session {state.session_id} (history: {len(state.conversation_history)} messages)")
            
            # Send event with response
            sink.send(AgentEvent(
                type="assistant_message",
                session_id=state.session_id,
                data=state.assistant_response
            ))
            
            return state
            
        except Exception as e:
            log.error(f"Assistant query failed: {e}")
            main_span.update(metadata={"error": True, "error_message": str(e)})
            raise


async def _scan_repository(state: AgentState) -> Dict[str, Any]:
    """Scan repository and extract context."""
    langfuse = get_client()
    with langfuse.start_as_current_span(name="repository_scan", metadata={"span_type": "TOOL"}) as span:
        span.update(input={"repo_path": state.repo_path})
        
        repo_context = discover_repository_context(state.repo_path)
        repo_summary = {
            "layouts": repo_context.layout_pages,
            "models": repo_context.model_files,
            "resources": repo_context.resource_files,
            "locales": repo_context.available_locales,
        }
        
        span.update(output={"summary": repo_summary})
        log.info(f"📂 Repository: {len(repo_summary['layouts'])} layouts, {len(repo_summary['locales'])} locales")
        
        return repo_summary


async def _get_available_tools() -> List[str]:
    """Connect to MCP and get available tools."""
    langfuse = get_client()
    with langfuse.start_as_current_span(name="mcp_connection", metadata={"span_type": "TOOL"}) as span:
        mcp_client = get_mcp_client()
        await mcp_client.connect()
        
        available_tools = mcp_client._available_tools or []
        tool_names = [
            tool.get("name") if isinstance(tool, dict) else tool
            for tool in available_tools
        ]
        
        span.update(output={"tool_count": len(tool_names), "tools": tool_names})
        log.info(f"🔧 Connected to MCP: {len(tool_names)} tools available")
        
        return tool_names


async def _select_relevant_tools(
    query: str,
    tool_names: List[str],
    repo_summary: Dict[str, Any],
    conversation_history: List[Any] = None
) -> List[Dict[str, Any]]:
    """Use LLM to intelligently select relevant tools, always starting with planning_tool."""
    langfuse = get_client()
    with langfuse.start_as_current_span(name="tool_selection", metadata={"span_type": "AGENT"}) as span:
        span.update(input={
            "query": query,
            "available_tools": tool_names,
            "has_conversation_history": bool(conversation_history)
        })
        
        from agents.services.llm import LLMClient, extract_semantic_query
        import json
        
        # STEP 1: Generate semantic query from user's question using shared utility
        semantic_query = await extract_semantic_query(query, context="chat")
        
        # STEP 2: Use tool planner to select tools (with semantic query for planning_tool)
        client = LLMClient(role="tool_planner")
        
        system_prompt = get_prompt_content("assistant_tool_orchestration")
        
        repo_context = f"""Repository: {repo_summary.get('layouts', []).__len__()} layouts, {repo_summary.get('locales', []).__len__()} locales"""
        
        # Add conversation history context if available
        history_context = ""
        if conversation_history and len(conversation_history) > 0:
            # Include last 3 messages for context
            recent_history = conversation_history[-3:]
            history_lines = []
            for msg in recent_history:
                role = "User" if msg.role == "user" else "Assistant"
                history_lines.append(f"{role}: {msg.content[:200]}")  # Truncate long messages
            history_context = "CONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n\n"
        user_prompt = render_template(
            "assistant_tool_selection_user",
            history_context=history_context,
            query=query,
            semantic_query=semantic_query,
            repo_context=repo_context,
            tool_names=', '.join(tool_names)
        )

        span.update(input={
            "system_prompt": system_prompt,
            "user_prompt": user_prompt[:500] + "...",
            "semantic_query": semantic_query
        })
        
        try:
            response = client.call_sync(system_prompt, user_prompt)
            
            # Parse JSON response
            response_clean = response.strip()
            if response_clean.startswith("```json"):
                response_clean = response_clean[7:]
            if response_clean.startswith("```"):
                response_clean = response_clean[3:]
            if response_clean.endswith("```"):
                response_clean = response_clean[:-3]
            
            tool_plan = json.loads(response_clean.strip())
            
            # Ensure planning_tool is first with semantic query
            planning_tool_exists = False
            for tool_spec in tool_plan:
                if tool_spec.get("tool") == "planning_tool":
                    # Update with semantic query
                    tool_spec["query"] = semantic_query
                    planning_tool_exists = True
                    break
            
            if not planning_tool_exists:
                tool_plan.insert(0, {
                    "tool": "planning_tool",
                    "query": semantic_query,
                    "objective": "Search documentation for relevant information"
                })
            
            span.update(output={
                "selected_tools": [t["tool"] for t in tool_plan],
                "tool_plan": tool_plan,
                "selection_strategy": "llm_based",
                "semantic_query_used": semantic_query
            })
            
            log.info(f"🎯 LLM selected {len(tool_plan)} tools: {', '.join([t['tool'] for t in tool_plan])}")
            return tool_plan
            
        except Exception as e:
            log.warning(f"Tool planning failed: {e}, falling back to planning_tool with semantic query")
            fallback = [{"tool": "planning_tool", "query": semantic_query or query, "objective": "Search documentation"}]
            span.update(output={
                "selected_tools": ["planning_tool"],
                "selection_strategy": "fallback",
                "error": str(e)
            })
            return fallback


async def _execute_tools(tool_plan: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Execute selected MCP tools according to the plan."""
    langfuse = get_client()
    with langfuse.start_as_current_span(name="tool_execution", metadata={"span_type": "TOOL"}) as span:
        span.update(input={"tool_plan": tool_plan})
        
        mcp_client = get_mcp_client()
        tool_results = {}
        
        for tool_spec in tool_plan:
            tool_name = tool_spec.get("tool")
            query = tool_spec.get("query", "")
            objective = tool_spec.get("objective", "")
            
            # Skip validation tools - they require specific file content, not queries
            if tool_name and ("validator" in tool_name.lower() or tool_name in {"schema_validator_tool", "resource_validator_tool", "policy_validation_tool"}):
                log.warning(f"Skipping {tool_name} - validation tools not available in chat mode")
                continue
            
            # Prepare arguments based on tool type
            if tool_name in {"datamodel_tool", "prefill_tool", "dynamic_expression", "policy_tool"}:
                # Documentation tools - no parameters
                arguments = {}
            elif tool_name == "layout_properties_tool":
                # Layout properties tool requires component_type and schema_url
                # Extract from tool_spec or skip if not provided
                arguments = {
                    "component_type": tool_spec.get("component_type", ""),
                    "schema_url": tool_spec.get("schema_url", "")
                }
                if not arguments["component_type"] or not arguments["schema_url"]:
                    log.warning(f"Skipping {tool_name} - missing required parameters")
                    continue
            else:
                # All other tools require query parameter (may be empty string)
                # layout_components_tool, resource_tool, planning_tool, etc.
                arguments = {"query": query or ""}
            
            with langfuse.start_as_current_span(name=f"call_{tool_name}", metadata={"span_type": "TOOL"}) as tool_span:
                tool_span.update(input={
                    "tool": tool_name,
                    "arguments": arguments,
                    "objective": objective
                })
                
                try:
                    result = await mcp_client.call_tool(tool_name, arguments)

                    # Handle CallToolResult objects
                    extracted = None
                    if hasattr(result, 'structured_content') and result.structured_content:
                        extracted = result.structured_content
                        tool_results[tool_name] = extracted
                    elif hasattr(result, 'content'):
                        content = result.content
                        if isinstance(content, list) and len(content) > 0:
                            first_item = content[0]
                            if hasattr(first_item, 'text'):
                                extracted = {"text": first_item.text}
                            else:
                                extracted = first_item
                        elif isinstance(content, str):
                            extracted = {"text": content}
                        else:
                            extracted = content
                        tool_results[tool_name] = extracted
                    else:
                        extracted = result
                        tool_results[tool_name] = result

                    result_size = len(str(extracted)) if extracted else 0
                    
                    # Extract text content for markdown display
                    full_text = None
                    if isinstance(extracted, dict) and "text" in extracted:
                        full_text = extracted["text"]
                    elif isinstance(extracted, str):
                        full_text = extracted
                    else:
                        full_text = str(extracted)
                    
                    tool_span.update(output={
                        "success": True,
                        "result_size": result_size,
                        "response_markdown": full_text  # Full response as markdown (no truncation)
                    })
                    log.info(f"✅ {tool_name}: {result_size} chars")
                    
                except Exception as e:
                    log.error(f"❌ Failed to call {tool_name}: {e}")
                    tool_results[tool_name] = {"error": str(e)}
                    tool_span.update(metadata={"error": True, "error_message": str(e)})
                    tool_span.update(output={"success": False, "error": str(e)})
        
        success_count = sum(
            1 for r in tool_results.values()
            if not (isinstance(r, dict) and "error" in r)
        )
        
        span.update(output={
            "tools_called": list(tool_results.keys()),
            "success_count": success_count,
            "total_count": len(tool_results)
        })
        
        return tool_results


def _extract_cited_sources_from_response(response: str, all_sources: List[Dict[str, Any]]) -> tuple:
    """
    Extract which sources were cited by the LLM and remove the SOURCES line from response.
    
    Looks for:
    SOURCES: Dynamic expressions, Data elements
    
    Returns: (clean_response, cited_sources_list)
    """
    # Look for SOURCES: line
    sources_match = re.search(r'\n+SOURCES:\s*(.+?)(?:\n|$)', response, re.IGNORECASE)
    
    if not sources_match:
        # No sources line found, return all sources
        return response, all_sources
    
    # Extract cited titles
    sources_line = sources_match.group(1)
    cited_titles = [title.strip() for title in sources_line.split(',')]
    
    # Match to actual sources with better fuzzy matching
    cited_sources = []
    for cited in cited_titles:
        cited_lower = cited.lower().strip()
        
        # Try to find matching source
        for source in all_sources:
            source_title = source.get('title', '').lower().strip()
            
            # Exact match or partial match (either direction)
            if (cited_lower == source_title or 
                cited_lower in source_title or 
                source_title in cited_lower or
                # Handle plurals/variations
                cited_lower.rstrip('s') == source_title.rstrip('s')):
                
                if source not in cited_sources:  # Avoid duplicates
                    cited_sources.append(source)
                break
    
    # Remove SOURCES line from response
    clean_response = response[:sources_match.start()].rstrip()
    
    # If no matches found, log for debugging and return all sources
    if not cited_sources:
        log.warning(f"No sources matched. LLM cited: {cited_titles}, Available: {[s.get('title') for s in all_sources]}")
        return clean_response, all_sources
    
    return clean_response, cited_sources


def _clean_documentation_preview(text: str) -> str:
    """
    Clean documentation text to extract meaningful preview content.
    
    Removes:
    - JSON wrappers ({"status": "success", "content": "..."})
    - YAML frontmatter (--- ... ---)
    - Warning/info panels
    - Metadata lines and headers
    - Escaped newlines and formatting
    
    Returns first meaningful paragraph as preview.
    """
    # Step 1: Try to parse JSON structure and extract content
    if text.strip().startswith('{'):
        try:
            parsed = json.loads(text)
            # Look for common content fields
            for key in ['content', 'text', 'expressions', 'documentation', 'data']:
                if key in parsed:
                    text = parsed[key]
                    break
        except:
            pass
    
    # Step 2: Replace escaped newlines with actual newlines
    text = text.replace('\\n', '\n').replace('\\r', '')
    
    # Step 3: Remove YAML frontmatter
    text = re.sub(r'^---\s*\n.*?\n---\s*\n', '', text, flags=re.DOTALL | re.MULTILINE)
    
    # Step 4: Remove Hugo shortcode panels and special formatting
    text = re.sub(r'\{\{%.*?%\}\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\{\{<.*?>\}\}', '', text, flags=re.DOTALL)
    
    # Step 5: Remove metadata lines
    text = re.sub(r'^(Content Length|Headings|Full Content|Matched Terms|URL):.*$', '', text, flags=re.MULTILINE)
    
    # Step 6: Remove symbols and emphasis markers
    text = text.replace('⚠️', '').replace('ℹ️', '').replace('🔗', '')
    text = text.replace('**', '').replace('##', '')
    
    # Step 7: Split into lines and extract first meaningful content
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    meaningful_lines = []
    for line in lines:
        # Skip markdown headers (# Header)
        if re.match(r'^#+\s+', line):
            continue
        # Skip lines that are just metadata markers
        if line.startswith('URL:') or line.startswith('Relevance:') or line.startswith('Matched Terms:'):
            continue
        # Skip lines with just numbers/symbols
        if re.match(r'^[\d\s\-,\.]+$', line):
            continue
        # Skip lines that are section separators
        if re.match(r'^[=\-]{3,}$', line):
            continue
            
        meaningful_lines.append(line)
        
        # Stop when we have enough content
        if len(' '.join(meaningful_lines)) > 180:
            break
    
    # Join lines into preview
    if meaningful_lines:
        preview = ' '.join(meaningful_lines)
        # Truncate to 200 chars at word boundary
        if len(preview) > 200:
            preview = preview[:200].rsplit(' ', 1)[0] + '...'
        return preview.strip()
    
    # Fallback: take first 200 chars of cleaned text
    cleaned = ' '.join([line.strip() for line in text.split('\n') if line.strip()])
    if len(cleaned) > 200:
        return cleaned[:200].rsplit(' ', 1)[0] + '...'
    return cleaned.strip() if cleaned else "No preview available"


def _extract_sources(tool_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract source citations from tool results for frontend display.
    
    Parses structured documentation responses (especially from planning_tool)
    to extract individual doc sections with URLs.
    
    Returns list of sources with:
    - title: Document title from heading
    - url: Direct link to documentation
    - preview: Short preview of content
    - relevance: Relevance score (if available)
    - matched_terms: Search terms that matched
    """
    sources = []
    
    for tool_name, result in tool_results.items():
        if isinstance(result, dict) and "error" in result:
            continue
        
        # Extract text content
        text_content = None
        if isinstance(result, dict):
            if "text" in result:
                text_content = result["text"]
                if tool_name == "planning_tool":
                    log.info(f"Planning tool result type: dict with 'text' key, length: {len(text_content)}")
            elif "content" in result:
                text_content = str(result["content"]) if not isinstance(result["content"], str) else result["content"]
            else:
                text_content = str(result)
        elif hasattr(result, 'text'):
            text_content = result.text
            if tool_name == "planning_tool":
                log.info(f"Planning tool result type: object with .text, length: {len(text_content)}")
        else:
            text_content = str(result)
        
        if not text_content:
            continue
        
        # Special handling for planning_tool - extract from "## Relevant Documentation" section
        if tool_name == "planning_tool":
            # Find the "## Relevant Documentation" section
            # Handle both real newlines and escaped newlines (\\n in the string)
            relevant_doc_match = re.search(r'##\s+Relevant Documentation(?:\\n|\n)(?:\\n|\n)(.+)', text_content, re.DOTALL)
            
            if relevant_doc_match:
                relevant_section = relevant_doc_match.group(1)
                
                # Extract individual numbered sections from the relevant documentation
                # The format from MCP has escaped newlines: \\n\\n
                # Example: "### 1. Data elements\\n\\n**URL:** https://...\\n\\n**Relevance:** 1.00\\n\\n**Matched Terms:** json, xml"
                section_pattern = r'###\s+(\d+)\.\s+(.+?)\\n\\n\*\*URL:\*\*\s+(.+?)\\n\\n\*\*Relevance:\*\*\s+([\d.]+)\\n\\n\*\*Matched Terms:\*\*\s+(.+?)\\n'
                sections = re.finditer(section_pattern, relevant_section)
                
                sections_found = 0
                for match in sections:
                    sections_found += 1
                    section_num = match.group(1)
                    section_title_raw = match.group(2).strip()
                    url = match.group(3).strip()
                    relevance = match.group(4).strip()
                    matched_terms = match.group(5).strip()
                    
                    # Clean section title - remove subsection details
                    # "Dynamic expressions – Introduction, Structure and syntax, Use Cases..."
                    # becomes "Dynamic expressions"
                    section_title = section_title_raw.split('–')[0].split('-')[0].strip()
                    
                    # Extract preview text after the header, skipping metadata
                    section_start = match.end()
                    # Find next section or end of text
                    next_section = relevant_section.find("\n### ", section_start)
                    if next_section == -1:
                        section_text = relevant_section[section_start:section_start + 2000]
                    else:
                        section_text = relevant_section[section_start:min(section_start + 2000, next_section)]
                    
                    # Clean the preview - skip frontmatter, metadata, and warnings
                    preview = _clean_documentation_preview(section_text)
                    
                    sources.append({
                        "title": section_title,
                        "url": url,
                        "preview": preview,
                        "relevance": float(relevance),
                        "matched_terms": matched_terms,
                        "tool": tool_name
                    })
                
                if sections_found > 0:
                    log.info(f"📖 Extracted {sections_found} sections from planning_tool")
                else:
                    log.warning(f"⚠️ No numbered sections found in Relevant Documentation section")
            else:
                log.warning(f"⚠️ No '## Relevant Documentation' section found in planning_tool (length: {len(text_content)})")
        
        # Special handling for dynamic_expression - extract clean content
        elif tool_name == "dynamic_expression":
            # Parse JSON if it's wrapped
            try:
                if text_content.strip().startswith("{"):
                    parsed = json.loads(text_content)
                    if "expressions" in parsed:
                        text_content = parsed["expressions"]
            except:
                pass
            
            # Extract title from markdown frontmatter or content
            title_match = re.search(r'(?:title:|##\s+)(.+?)(?:\n|$)', text_content, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else "Dynamic Expression Documentation"
            
            # Extract URL from markdown frontmatter or inline
            # Try multiple patterns: frontmatter (url:), inline (**URL:**), or link format
            url = None
            url_patterns = [
                r'url:\s*(.+?)(?:\n|$)',  # Frontmatter: url: https://...
                r'\*\*URL:\*\*\s*(.+?)(?:\n|$)',  # Inline: **URL:** https://...
                r'\[.+?\]\((.+?)\)',  # Markdown link: [text](url)
            ]
            for pattern in url_patterns:
                url_match = re.search(pattern, text_content, re.IGNORECASE)
                if url_match:
                    url = url_match.group(1).strip()
                    break
            
            # Create clean preview from content
            preview = _clean_documentation_preview(text_content)
            
            source_entry = {
                "title": title,
                "preview": preview,
                "tool": tool_name
            }
            if url:
                source_entry["url"] = url
            
            sources.append(source_entry)
        
        # Generic handling for other tools
        else:
            title_map = {
                "datamodel_tool": "Data Model Documentation",
                "prefill_tool": "Prefill Documentation",
                "policy_tool": "Authorization Policy Documentation",
                "layout_components_tool": "Layout Components",
                "resource_tool": "Text Resources",
                "layout_properties_tool": "Component Properties"
            }
            
            title = title_map.get(tool_name, tool_name.replace("_", " ").title())
            
            # Use cleaning function for consistent preview extraction
            preview = _clean_documentation_preview(text_content)
            
            sources.append({
                "title": title,
                "preview": preview,
                "tool": tool_name
            })
    
    return sources


async def _generate_response(
    query: str,
    repo_summary: Dict[str, Any],
    tool_results: Dict[str, Any],
    attachments: Optional[List] = None,
    conversation_history: Optional[List[Any]] = None
) -> str:
    """Generate natural language response using LLM."""
    langfuse = get_client()
    with langfuse.start_as_current_span(name="response_generation", metadata={"span_type": "LLM"}) as span:
        span.update(input={
            "query": query,
            "repo_summary": repo_summary,
            "tools_used": list(tool_results.keys()),
            "has_attachments": bool(attachments),
            "has_conversation_history": bool(conversation_history)
        })
        
        # Use assistant role - model config comes from environment
        client = LLMClient(role="assistant")
        
        system_prompt = get_prompt_content("assistant_response_generation")
        
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
        
        # Build context from tool results - include full documentation
        # Also extract available section titles for citation
        available_sections = []
        tool_context = ""
        if tool_results:
            tool_context = "\n\n═══════════════════════════════════════════════════════════════\n"
            tool_context += "RELEVANT DOCUMENTATION\n"
            tool_context += "═══════════════════════════════════════════════════════════════\n"
            for tool_name, result in tool_results.items():
                if isinstance(result, dict):
                    if "error" in result:
                        continue
                    if "text" in result:
                        text_content = result['text']
                        tool_context += f"\n[{tool_name}]:\n{text_content}\n\n"
                        
                        # Extract section titles from planning_tool
                        if tool_name == "planning_tool":
                            section_pattern = r'###\s+\d+\.\s+(.+?)\n\nURL:'
                            for match in re.finditer(section_pattern, text_content, re.MULTILINE):
                                # Clean title
                                raw_title = match.group(1).strip()
                                clean_title = raw_title.split('–')[0].split('-')[0].strip()
                                available_sections.append(clean_title)
                        
                        # Extract title from other documentation tools
                        elif tool_name == "dynamic_expression":
                            available_sections.append("Dynamic expressions")
                        elif tool_name == "datamodel_tool":
                            available_sections.append("Data Model")
                        elif tool_name == "prefill_tool":
                            available_sections.append("Prefill")
                        elif tool_name == "policy_tool":
                            available_sections.append("Authorization policies")
                                
                    elif "content" in result:
                        content_str = str(result['content']) if not isinstance(result['content'], str) else result['content']
                        tool_context += f"\n[{tool_name}]:\n{content_str}\n\n"
                    else:
                        tool_context += f"\n[{tool_name}]:\n{str(result)}\n\n"
                elif hasattr(result, 'text'):
                    tool_context += f"\n[{tool_name}]:\n{result.text}\n\n"
                else:
                    tool_context += f"\n[{tool_name}]:\n{str(result)}\n\n"
        
        # Add list of available sections for citation
        citation_note = ""
        if available_sections:
            sections_list = ", ".join(available_sections[:8])
            citation_note = f"\n\nAvailable sources: {sections_list}"
        
        user_prompt = render_template(
            "assistant_response_user",
            query=query,
            repo_context=repo_context,
            tool_context=tool_context,
            citation_note=citation_note
        )

        span.update(input={
            "system_prompt": system_prompt,
            "user_prompt": user_prompt[:500] + "...",  # Truncate for logging
            "model": client.model,
            "temperature": client.temperature,
            "conversation_history_length": len(conversation_history) if conversation_history else 0
        })
        
        # Pass conversation history directly to LLM API (uses native messages array)
        response = client.call_sync(
            system_prompt, 
            user_prompt.strip(), 
            attachments=attachments,
            conversation_history=conversation_history  # Native API support
        )
        
        span.update(output={
            "response_length": len(response),
            "model_used": client.model,
            "temperature_used": client.temperature
        })
        
        log.info(f"🤖 Generated response: {len(response)} chars")
        
        return response
