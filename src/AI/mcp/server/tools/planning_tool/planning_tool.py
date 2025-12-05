"""Tool to provide planning instructions for Windsurf client."""
import os
import pathlib
from server.tools import register_tool
from mcp.types import (
    ToolAnnotations,
)
from .doc_search import DocumentationSearch
# Global search instance (initialized lazily)
_doc_search = None

def _get_search_instance():
    """Get or create the documentation search instance."""
    global _doc_search
    if _doc_search is None:
        current_dir = pathlib.Path(__file__).parent.absolute()
        llms_full_path = os.path.join(current_dir, "llms-full.txt")
        cache_dir = os.path.join(current_dir, ".doc_cache")
        _doc_search = DocumentationSearch(llms_full_path, cache_dir, cache_days=7)
    return _doc_search


def initialize_documentation_search(verbose: bool = False):
    """Pre-initialize documentation search (for server startup).
    
    This fetches and indexes all documentation at server startup instead of
    on first query, providing better UX with no delay on first use.
    
    Args:
        verbose: If True, log progress to stderr. Default False for stdio mode.
    """
    search = _get_search_instance()
    if not search._initialized:
        search.initialize(max_docs=None, rate_limit=0.05, verbose=verbose)  # Fetch all docs
    return search

@register_tool(
    name="planning_tool",
    description="""
⚠️ MANDATORY FIRST TOOL - Call this BEFORE any other tool in every session.

## Why This Must Be First
This tool provides essential Altinn domain knowledge that ALL other tools depend on:
- Altinn-specific conventions and patterns
- Correct file structure and locations
- Required relationships between components, datamodels, and resources
- Platform constraints and best practices

Without this context, you will make mistakes that require rework.

## What It Returns
- `planning_context`: Critical guidelines for Altinn development workflow
- `search_results`: Relevant official documentation for your task
- `content`: Combined context optimized for your specific query

## Parameters
- `query` (optional but recommended): Describe your task (e.g., "create form with date field and navigation")
- `max_results` (optional): Number of docs to return (default: 3)
- `include_planning_context` (optional): Include planning docs (default: true)
- `include_full_content` (optional): Full content vs excerpts (default: true)

## Correct Workflow
```
1. planning_tool(query="<describe task>")  ← ALWAYS START HERE
2. layout_components_tool()                 ← Then get components
3. Other tools as needed...
```

## ❌ WRONG: Skipping This Tool
Do NOT call `layout_components_tool`, `datamodel_tool`, or any other tool first.
You will miss critical context about:
- How Altinn forms are structured
- Required file relationships
- Platform-specific patterns

## Example Queries
- "create form with input fields and navigation button"
- "date picker component with validation"
- "multi-page form with submit"
""",
    title="Planning Tool",
    annotations=ToolAnnotations(
        readOnlyHint=True,
        idempotentHint=True
    )
)
def planning_tool(
    user_goal: str,
    query: str = "", 
    max_results: int = 3, 
    include_planning_context: bool = True, 
    include_full_content: bool = True,
    force_refresh: bool = False
) -> dict:
    """Returns planning documentation and searches relevant Altinn Studio documentation.
    The starting point for any use of MCP tools for Altinn application development.
    Gives guidelines on how to structure plans and what tools to use.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
        query: Technical search query (preprocessed by MAS) with terms like
               "conditional rendering hidden expressions" or "RadioButtons datamodel bindings"
        max_results: Maximum number of documentation results to return (default: 3)
        include_planning_context: Whether to include the planning context markdown (default: True)
        include_full_content: Whether to include full document content in results (default: True).
                            If False, only excerpts are included for faster/lighter responses.
        force_refresh: Force rebuild of documentation cache (default: False)
    
    Returns:
        A dictionary containing search results and optionally the planning instructions.
        When include_full_content=True, each search result includes the full document body text.
    """
    try:
        # Get search instance
        search = _get_search_instance()
        
        # Force refresh if requested
        if force_refresh:
            search.force_refresh()
        
        result = {"status": "success"}
        
        # Load planning context if requested
        if include_planning_context:
            current_dir = pathlib.Path(__file__).parent.absolute()
            instructions_path = os.path.join(current_dir, "planning_context.md")
            with open(instructions_path, "r", encoding="utf-8") as f:
                instructions = f.read()
            result["planning_context"] = instructions
        
        # Search documentation if query provided
        if query and query.strip():
            search_results = search.search(
                query, 
                max_results=max_results, 
                include_full_content=include_full_content
            )
            
            if search_results:
                # Format search results as markdown
                docs_markdown = "\n\n---\n\n## Relevant Documentation\n\n"
                docs_markdown += f"*Found {len(search_results)} relevant documents for query: '{query}'*\n\n"
                
                for i, doc in enumerate(search_results, 1):
                    docs_markdown += f"### {i}. {doc['title']}\n\n"
                    docs_markdown += f"**URL:** {doc['url']}\n\n"
                    docs_markdown += f"**Relevance:** {doc['relevance_score']:.2f}\n\n"
                    docs_markdown += f"**Matched Terms:** {', '.join(doc['matched_terms'])}\n\n"
                    
                    # Include full content or just excerpt
                    if include_full_content and 'full_content' in doc:
                        docs_markdown += f"**Content Length:** {doc['content_length']:,} characters\n\n"
                        if doc.get('headings'):
                            docs_markdown += f"**Headings:** {', '.join(doc['headings'][:5])}"
                            if len(doc['headings']) > 5:
                                docs_markdown += f" (+{len(doc['headings']) - 5} more)"
                            docs_markdown += "\n\n"
                        docs_markdown += "**Full Content:**\n\n"
                        docs_markdown += f"```\n{doc['full_content']}\n```\n\n"
                    else:
                        docs_markdown += f"**Excerpt:** {doc['excerpt']}\n\n"
                    
                    docs_markdown += "---\n\n"
                
                # Combine with planning context if included
                if include_planning_context:
                    result["content"] = instructions + docs_markdown
                else:
                    result["content"] = docs_markdown
                
                result["search_results"] = search_results
            else:
                result["message"] = f"No relevant documentation found for query: '{query}'"
                if include_planning_context:
                    result["content"] = instructions
        else:
            # No query provided, just return planning context if requested
            if include_planning_context:
                result["content"] = instructions
        
        return result
    
    except Exception as e:
        import traceback
        return {
            "status": "error", 
            "message": str(e),
            "traceback": traceback.format_exc()
        }
