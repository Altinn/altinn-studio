from server.tools import register_tool
from codegen.repositories.app_fetcher import get_available_apps, get_recommended_app_dirs, download_recommended_apps
import langwatch
import traceback

from codegen.vector_store.store import app_vector_store
from server.config import VECTOR_STORE_CONFIG
from codegen.vector_store.loader import initialize_vector_stores
from mcp.types import ToolAnnotations

@register_tool(
    name="studio_examples_tool",
    description="""
    Fetch example logic files from existing Altinn Studio applications based on the query.
    Can be used to retrieve relevant C# logic from existing Altinn Studio apps, to use as a guide for writing custom logic. 
    """,
    title="Studio Examples Tool",
    annotations=ToolAnnotations(
        title = "Studio Examples Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def studio_examples_tool(query: str) -> dict:
    """Fetch example files from existing Altinn Studio applications based on the query.
     A vector store is used to select the most relevant files based on the query. 
     
    Args:
        query: The user query for example selection

    Returns:
        A dictionary containing the relevant example files based on LLM relevance matching.
        The dictionary contains the following keys:
        - status: The status of the request (possible error)
        - message: A detailed message (error message if error)
        - examples: A list of selected example files with relevance scores (may be empty if error)
    """
    return find_similar_examples(query)

def find_similar_examples(query: str, refresh_vector_store: bool = False, use_all_apps: bool = False, download_apps: bool = False, max_examples: int = 3) -> dict:
    available_apps = []
    if download_apps:
            # Download recommended apps from Gitea
            print("Downloading recommended apps based on prompt...")
            available_apps = download_recommended_apps(query)
            print(f"Downloaded {len(available_apps)} example apps successfully")
    elif use_all_apps:
        # Just use all available apps without contacting the embedding API
        print("Using all available apps as requested...")
        available_apps = get_available_apps()
        print(f"Using {len(available_apps)} existing example apps")
    else:
        # Default behavior: Get recommendations but only use locally available apps
        print("Fetching app recommendations based on prompt (default behavior)...")
        available_apps = get_recommended_app_dirs(query)
        print(f"Found {len(available_apps)} recommended apps locally")

    if available_apps == []:
        return {
            "status": "error",
            "message": "No apps found"
        }

    # Initialize vector stores if needed
    try:
        initialize_vector_stores(refresh=refresh_vector_store, app_directories=available_apps)
        print("Vector stores initialized successfully\n")
        with langwatch.span(type="rag", name="app_vector_search") as span:
            app_results = app_vector_store.vector_store.similarity_search_with_score(query, k=VECTOR_STORE_CONFIG["APP_SIMILARITY_K"])

            # Format the results for LangWatch with detailed information
            if span:
                # Create a detailed string representation of the results
                top_scores = [f"{score:.4f}" for _, score in app_results[:3]] if app_results else []
                
                # Create a detailed output summary
                result_summary = f"Found {len(app_results)} results from app examples. \n"
                result_summary += f"Vector store: app_vector_store\n"
                result_summary += f"Query length: {len(query)} characters\n"
                
                if app_results:
                    result_summary += f"Top scores: {', '.join(top_scores[:3])}\n"
                    # Add snippets of top results (first 100 chars)
                    result_summary += "\nTop result snippets:\n"
                    for i, (content, score) in enumerate(app_results[:3]):
                        if i < 3:  # Only show top 3
                            snippet = content.page_content.replace('\n', ' ')[:100] + "..."
                            result_summary += f"[{i+1}] Score {score:.4f}: {snippet}\n"
                
                # Update the span with detailed information
                span.update(input=query, output=result_summary)
        
        # Format results
        similar_examples = []
        
        print(f"Found {len(app_results)} potential code snippets from example apps")
        for i, (content, score) in enumerate(app_results):
            if score > VECTOR_STORE_CONFIG["SIMILARITY_THRESHOLD"]:  # Only include relevant results
                # Get metadata from the vector store
                metadata = content.metadata
                
                # Extract file name and app ID from metadata
                file_name = metadata.get("file_path", "Unknown")
                app_id = metadata.get("app_id", "Unknown")
                app_name = metadata.get("app_name", app_id)
                
                similar_examples.append({
                    "content": content.page_content,
                    "score": score,
                    "source": "app",
                    "file_name": file_name,
                    "app_id": app_id,
                    "app_name": app_name
                })
                print(f"  - Example {i+1}: {app_name} - {file_name} (Similarity: {score:.2f})")
        
        if not similar_examples:
            print("  No relevant examples found above similarity threshold (0.4)")
        if len(similar_examples) > max_examples:
            similar_examples = similar_examples[:max_examples]
            print(f"  Limited to {max_examples} examples")
        return {
            "status": "success",
            "message": f"Found {len(similar_examples)} relevant examples",
            "examples": similar_examples
        }
    except Exception as e:
        print(f"Error finding similar examples: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Error finding similar examples: {str(e)}"
        }
