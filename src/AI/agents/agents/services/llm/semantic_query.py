"""Semantic query extraction for documentation search."""

from __future__ import annotations

from langfuse import get_client
from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def extract_semantic_query(user_input: str, context: str = "general") -> str:
    """
    Extract focused English technical keywords from user input (may be Norwegian).
    
    This function uses an LLM to transform verbose user questions into concise
    technical search queries optimized for TF-IDF semantic search.
    
    Args:
        user_input: User's question or goal (may be in Norwegian)
        context: Context for extraction ("general", "chat", "planning")
    
    Returns:
        Concise English query with 2-5 key technical terms
    
    Example:
        Input: "For noen skjemaer kan det være ønskelig at virksomhet kan fylle ut skjema uavhengig av rolle"
        Output: "authorization policy configuration skip role requirement organization access"
    """
    langfuse = get_client()
    llm = LLMClient(role="planner")
    
    system_prompt = get_prompt_content("semantic_query_extraction")
    user_prompt = render_template("semantic_query_user", user_input=user_input)
    
    with langfuse.start_as_current_observation(
        name="semantic_query_extraction",
        as_type="generation",
        input={
            "user_input": user_input,
            "context": context,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt
        },
        metadata={"context": context}
    ) as span:
        
        try:
            semantic_query = await llm.call_async(system_prompt, user_prompt)
            semantic_query = semantic_query.strip()
            
            span.update(output={
                "semantic_query": semantic_query,
                "query_length": len(semantic_query),
                "original_length": len(user_input)
            })
            
            log.info(f"🔍 Extracted semantic query: '{semantic_query}'")
            return semantic_query
            
        except Exception as e:
            log.warning(f"Semantic query extraction failed: {e}, using original input")
            span.update(output={
                "error": str(e),
                "fallback_query": user_input
            })
            span.update(metadata={"error": True})
            return user_input
