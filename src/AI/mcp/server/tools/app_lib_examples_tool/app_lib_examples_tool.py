from server.tools import register_tool
from codegen.vector_store.loader import initialize_vector_stores
from codegen.vector_store.store import app_lib_vector_store
from server.config import VECTOR_STORE_CONFIG
import traceback
import langwatch
from mcp.types import ToolAnnotations

@register_tool(
    name="app_lib_examples_tool",
    description="""
    Fetch C# files from the Altinn App library based on the query.
    These files are the core logic behind the altinn environment, but can be highly relevant to use as a guide for writing custom C# logic. 
    """,
    title="App Library Examples Tool",
    annotations=ToolAnnotations(
        title = "App Library Examples Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def app_lib_examples_tool(query: str) -> dict:
    """Fetch example files from the Altinn App library based on the query.
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
    return find_app_lib_examples(query)


def find_app_lib_examples(query: str, refresh_vector_store: bool = False, use_all_apps: bool = False, download_apps: bool = False, max_examples: int = 3) -> dict:
    
    try:
        initialize_vector_stores(refresh=refresh_vector_store)
        # Search in app-lib vector store with LangWatch tracing
        with langwatch.span(type="rag", name="app_lib_vector_search") as span:
            app_lib_results = app_lib_vector_store.vector_store.similarity_search_with_score(query, k=VECTOR_STORE_CONFIG["APP_LIB_SIMILARITY_K"])
            
            # Format the results for LangWatch with detailed information
            if span:
                # Create a detailed string representation of the results
                top_scores = [f"{score:.4f}" for _, score in app_lib_results[:3]] if app_lib_results else []
                
                # Create a detailed output summary
                result_summary = f"Found {len(app_lib_results)} results from app-lib examples. \n"
                result_summary += f"Vector store: app_lib_vector_store\n"
                result_summary += f"Query length: {len(query)} characters\n"
                
                if app_lib_results:
                    result_summary += f"Top scores: {', '.join(top_scores[:3])}\n"
                    # Add snippets of top results (first 100 chars)
                    result_summary += "\nTop result snippets:\n"
                    for i, (doc, score) in enumerate(app_lib_results[:3]):
                        if i < 3:  # Only show top 3
                            snippet = doc.page_content.replace('\n', ' ')[:100] + "..."
                            result_summary += f"[{i+1}] Score {score:.4f}: {snippet}\n"
                
                # Update the span with detailed information
                span.update(input=query, output=result_summary)
        
        # Format results
        app_lib_examples = []
        
        print(f"Found {len(app_lib_results)} potential code snippets from app-lib-dotnet")
        for i, (doc, score) in enumerate(app_lib_results):
            if score > VECTOR_STORE_CONFIG["SIMILARITY_THRESHOLD"]:  # Only include relevant results
                # Get metadata from the vector store
                metadata = doc.metadata
                
                # Extract file name from metadata
                file_name = metadata.get("file_path", "Unknown")
                
                # Set app_id for app-lib examples
                app_id = "app-lib-dotnet"
                
                app_lib_examples.append({
                    "content": doc.page_content,
                    "score": score,
                    "source": "app-lib",
                    "file_name": file_name,
                    "app_id": app_id
                })
                print(f"  - Example {i+1}: {app_id} - {file_name} (Similarity: {score:.2f})")
        
        if not app_lib_examples:
            print("  No relevant examples found above similarity threshold (0.4)")
        
        if len(app_lib_examples) > max_examples:
            app_lib_examples = app_lib_examples[:max_examples]
            print(f"  Limited to {max_examples} examples")
        return {
            "status": "success",
            "message": f"Found {len(app_lib_examples)} relevant examples",
            "examples": app_lib_examples
        }
    except Exception as e:
        print(f"Error finding app-lib examples: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Error finding app-lib examples: {str(e)}"
        }