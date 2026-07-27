"""Assistant node for handling read-only Q&A queries about Altinn applications.

Documentation grounding works skill-style: the curated llms.txt index
(agents/skills/altinn-docs/llms.txt) is given to a small LLM call that
picks the most relevant pages for the question; those pages are fetched
directly from docs.altinn.studio and injected into the response prompt.
No MCP server involved.
"""

from __future__ import annotations

import asyncio
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

import httpx

from shared.utils.langfuse_utils import trace_span
from agents.core.tools.web_fetch_tool import ALLOWED_HOSTS, MAX_RESPONSE_CHARS, _html_to_text
from agents.graph.state import AgentState
from agents.services.repo import discover_repository_context
from agents.services.llm import LLMClient
from agents.services.events import AgentEvent, sink
from agents.prompts import get_prompt_with_langfuse, render_template
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

_LLMS_TXT_PATH = Path(__file__).parents[2] / "skills" / "altinn-docs" / "llms.txt"
_MAX_DOC_PAGES_PER_QUERY = 3
_PER_PAGE_CONTENT_CAP = 20_000  # chars of fetched page fed to the response prompt


async def handle(state: AgentState) -> AgentState:
    """
    Handle a Q&A query without making changes.
    
    This node provides read-only assistance by:
    1. Scanning repository for context
    2. Selecting relevant docs pages from the curated llms.txt index
    3. Fetching those pages from docs.altinn.studio
    4. Generating a helpful response using LLM
    
    Args:
        state: AgentState with user_goal as the question
    
    Returns:
        AgentState with assistant_response populated
    """
    log.info(f"💬 Assistant node: handling query for session {state.session_id}")

    with trace_span(
        "assistant_query",
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
            from agents.services.events import sink as _sink

            def _check_cancelled():
                if _sink.is_cancelled(state.session_id):
                    raise InterruptedError(f"Session {state.session_id} was cancelled")

            # Step 1: Scan repository for context
            log.info("📂 Scanning repository for context...")
            _check_cancelled()
            repo_summary = await _scan_repository(state)

            # Step 2: Pick relevant documentation pages from the curated index
            log.info("🎯 Selecting documentation pages...")
            _check_cancelled()
            selected_pages = await _select_docs_pages(
                state.user_goal,
                state.conversation_history,
            )

            # Step 3: Fetch the selected pages directly from docs.altinn.studio
            tool_results: Dict[str, Any] = {}
            if selected_pages:
                _check_cancelled()
                log.info(f"📖 Fetching {len(selected_pages)} documentation page(s)...")
                pages = await _fetch_docs_pages(selected_pages)
                if pages:
                    tool_results["altinn_docs"] = {"pages": pages}

            # Step 5: Generate response
            log.info("🤖 Generating response...")
            _check_cancelled()
            response = await _generate_response(
                state.user_goal,
                repo_summary,
                tool_results,
                state.attachments,
                state.conversation_history
            )

            # Step 6: Extract all available sources from tool results
            all_sources = _extract_sources(tool_results)
            log.info(f"📚 Extracted {len(all_sources)} sources available: {[s.get('title') for s in all_sources]}")

            # Step 7: Parse which sources LLM actually cited and clean response
            # Only keep sources that have a real URL (not internal tool instructions)
            linkable_sources = [s for s in all_sources if s.get("url")]
            clean_response, cited_sources = _extract_cited_sources_from_response(response, linkable_sources)
            log.info(f"✅ LLM cited {len(cited_sources)}/{len(linkable_sources)} sources: {[s.get('title') for s in cited_sources]}")

            # Set outputs on main span
            main_span.update(output={
                "response": clean_response[:5000],
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
                "mode": "chat",
                "traceId": main_span.trace_id,
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

        except InterruptedError:
            log.info(f"🛑 Assistant query cancelled for session {state.session_id}")
            state.assistant_response = {"cancelled": True}
            return state
        except Exception as e:
            log.error(f"Assistant query failed: {e}")
            main_span.update(metadata={"error": True, "error_message": str(e)})
            raise


async def _scan_repository(state: AgentState) -> Dict[str, Any]:
    """Scan repository and extract context."""
    with trace_span("repository_scan", metadata={"span_type": "TOOL"}) as span:
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


def _load_docs_index() -> str:
    """The curated llms.txt index shipped with the altinn-docs skill."""
    try:
        return _LLMS_TXT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        log.warning("Docs index unavailable (%s) — answering without docs", exc)
        return ""


_PAGE_SELECTION_SYSTEM_PROMPT = """\
You select documentation pages for a question about Altinn Studio app development.

You get an index of available pages (title, URL, one-line description) and the user's question.
Return ONLY a JSON array of the pages most likely to answer the question — at most {max_pages}, fewer if fewer are relevant, `[]` if none are.

Format: [{{"title": "...", "url": "..."}}]
Rules:
- URLs must be copied EXACTLY from the index.
- Prefer one precise page over several vague ones.
- No commentary, no markdown fences — just the JSON array."""



async def _select_docs_pages(
    query: str,
    conversation_history: Optional[List[Any]] = None,
) -> List[Dict[str, str]]:
    """Pick up to N documentation pages for the question via the curated index."""
    with trace_span("docs_page_selection", metadata={"span_type": "AGENT"}) as span:
        span.update(input={"query": query})

        index = _load_docs_index()
        if not index:
            span.update(output={"selected": [], "reason": "no index"})
            return []

        client = LLMClient(role="tool_planner")
        system_prompt = _PAGE_SELECTION_SYSTEM_PROMPT.format(
            max_pages=_MAX_DOC_PAGES_PER_QUERY
        )
        user_prompt = f"DOCUMENTATION INDEX:\n{index}\n\nQUESTION:\n{query}"

        try:
            response = client.call_sync(
                system_prompt,
                user_prompt,
                conversation_history=conversation_history,
            )
            response_clean = response.strip()
            if response_clean.startswith("```"):
                response_clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", response_clean)
            selected = json.loads(response_clean)
        except Exception as exc:  # noqa: BLE001 — selection is best-effort
            log.warning("Docs page selection failed: %s — answering without docs", exc)
            span.update(output={"selected": [], "error": str(exc)})
            return []

        pages: List[Dict[str, str]] = []
        for entry in selected if isinstance(selected, list) else []:
            if not isinstance(entry, dict):
                continue
            url = str(entry.get("url", ""))
            title = str(entry.get("title", "")) or url
            # Only accept URLs that appear verbatim in the index — the
            # selector must pick, not invent.
            if url and url in index:
                pages.append({"title": title, "url": url})
            if len(pages) >= _MAX_DOC_PAGES_PER_QUERY:
                break

        span.update(output={"selected": pages})
        log.info(f"🎯 Selected {len(pages)} docs page(s): {[p['title'] for p in pages]}")
        return pages


async def _fetch_docs_pages(pages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Fetch the selected pages concurrently, reduce to readable text."""
    with trace_span("docs_fetch", metadata={"span_type": "TOOL"}) as span:
        span.update(input={"urls": [p["url"] for p in pages]})

        async def _fetch_one(page: Dict[str, str]) -> Optional[Dict[str, str]]:
            url = page["url"]
            host = httpx.URL(url).host or ""
            if host not in ALLOWED_HOSTS:
                log.warning("Skipping non-allowlisted docs host: %s", host)
                return None
            try:
                async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
                    response = await client.get(url)
                    response.raise_for_status()
            except httpx.HTTPError as exc:
                log.warning("Docs fetch failed for %s: %s", url, exc)
                return None
            text = response.text
            if "html" in response.headers.get("content-type", ""):
                text = _html_to_text(text)
            return {
                "title": page["title"],
                "url": url,
                "content": text[:_PER_PAGE_CONTENT_CAP],
            }

        fetched = await asyncio.gather(*(_fetch_one(p) for p in pages))
        result = [p for p in fetched if p is not None]
        span.update(output={"fetched": [p["url"] for p in result]})
        return result


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
    """Turn fetched documentation pages into frontend source entries.

    Shape matches what the chat UI renders: `{title, url, previewText,
    tool}`.  Only real docs pages become sources — repo context and
    other internal signals are not user-facing citations.
    """
    sources: List[Dict[str, Any]] = []
    docs = tool_results.get("altinn_docs") or {}
    for page in docs.get("pages", []):
        content = page.get("content", "")
        sources.append(
            {
                "title": page.get("title") or page.get("url"),
                "url": page.get("url"),
                "previewText": _clean_documentation_preview(content)[:200],
                "tool": "altinn_docs",
            }
        )
    return sources


async def _generate_response(
    query: str,
    repo_summary: Dict[str, Any],
    tool_results: Dict[str, Any],
    attachments: Optional[List] = None,
    conversation_history: Optional[List[Any]] = None
) -> str:
    """Generate natural language response using LLM."""
    with trace_span("response_generation", metadata={"span_type": "LLM"}) as span:
        span.update(input={
            "query": query,
            "repo_summary": repo_summary,
            "tools_used": list(tool_results.keys()),
            "has_attachments": bool(attachments),
            "has_conversation_history": bool(conversation_history)
        })
        
        # Use assistant role - model config comes from environment
        client = LLMClient(role="assistant")

        system_prompt, lf_prompt_resp = get_prompt_with_langfuse("assistant_response_generation")
        
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
        
        # Build context from fetched documentation pages.  Section titles
        # double as citation handles the model can reference in SOURCES.
        available_sections = []
        tool_context = ""
        docs = tool_results.get("altinn_docs") or {}
        pages = docs.get("pages", [])
        if pages:
            tool_context = "\n\n═══════════════════════════════════════════════════════════════\n"
            tool_context += "RELEVANT DOCUMENTATION\n"
            tool_context += "═══════════════════════════════════════════════════════════════\n"
            for page in pages:
                title = page.get("title") or page.get("url")
                tool_context += f"\n[{title}]({page.get('url')}):\n{page.get('content', '')}\n\n"
                available_sections.append(title)
        
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
            conversation_history=conversation_history,  # Native API support
            langfuse_prompt=lf_prompt_resp,
        )
        
        span.update(output={
            "response": response[:5000],
            "model_used": client.model,
            "temperature_used": client.temperature
        })
        
        log.info(f"🤖 Generated response: {len(response)} chars")
        
        return response
