"""
altinn_planning - Planning and documentation search tool.

Provides Altinn development guidelines and searches official documentation.
"""

import pathlib
from typing import Dict, Any, Optional
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
    ToolError,
    ToolRecommendation,
)


@register_tool(
    name="altinn_planning",
    description="Get Altinn development guidelines and search official documentation.",
    category=ToolCategory.DOCS,
    mode=OperationMode.ONCE_PER_SESSION,
)
def planning(
    query: Optional[str] = None,
    max_results: int = 3,
    include_context: bool = True,
) -> Dict[str, Any]:
    """Get planning context and search Altinn documentation.
    
    Args:
        query: Optional search query for documentation (e.g., "date picker validation").
        max_results: Maximum number of search results to return.
        include_context: Whether to include the planning context markdown.
    """
    current_dir = pathlib.Path(__file__).parent
    result_parts = []
    
    # Load planning context
    if include_context:
        context_path = current_dir / "planning_context.md"
        if context_path.exists():
            with open(context_path, "r", encoding="utf-8") as f:
                result_parts.append(f.read())
    
    # Search documentation if query provided
    search_results = []
    if query and query.strip():
        try:
            from .doc_search import DocumentationSearch
            
            llms_path = current_dir / "llms-full.txt"
            cache_dir = current_dir / ".doc_cache"
            
            search = DocumentationSearch(str(llms_path), str(cache_dir), cache_days=7)
            search_results = search.search(query, max_results=max_results)
            
            if search_results:
                result_parts.append(f"\n\n---\n\n## Documentation Search: '{query}'\n")
                for i, doc in enumerate(search_results, 1):
                    result_parts.append(f"### {i}. {doc['title']}")
                    result_parts.append(f"**URL:** {doc['url']}")
                    result_parts.append(f"**Relevance:** {doc.get('relevance_score', 0):.2f}")
                    if doc.get('matched_terms'):
                        result_parts.append(f"**Matched Terms:** {', '.join(doc['matched_terms'])}")
                    result_parts.append(f"**Excerpt:** {doc['excerpt']}\n")
        except ImportError:
            result_parts.append(f"\n\n*Documentation search not available (doc_search module missing)*")
        except Exception as e:
            result_parts.append(f"\n\n*Documentation search failed: {str(e)}*")
    
    content = "\n".join(result_parts) if result_parts else "No content available."
    
    result = ToolSuccess(
        content=content,
        next_steps=[
            ToolRecommendation(
                tool="altinn_layout_list",
                reason="Discover available UI components",
            ),
            ToolRecommendation(
                tool="altinn_datamodel_docs",
                reason="Learn about datamodel structure",
            ),
        ],
    ).to_dict()
    
    # Add search results if available
    if search_results:
        result["search_results"] = search_results
    
    return result
