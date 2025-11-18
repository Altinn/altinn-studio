"""
Core pipeline module for the Altinn Studio Code Generator.
Contains the main pipeline orchestration and graph definition.
"""

import os
import sys
import time
import traceback
import uuid
from typing import Dict, List, Any, Optional

from ..core.utils import ensure_studio_assistant_test_repo, ensure_app_lib_repo
from ..vector_store.loader import initialize_vector_stores
from ..repositories.app_fetcher import get_available_apps, get_recommended_app_dirs, download_recommended_apps
from .state import PipelineState, update_state

# Import LangWatch for monitoring
import langwatch
from langwatch.types import RAGChunk

# Import langgraph components
from langgraph.graph import StateGraph, END

# Import utilities
from server.config import (
    LANGWATCH_API_KEY,
    LANGWATCH_PROJECT_ID,
    LANGWATCH_ENABLED,
    LANGWATCH_LABELS,
)

# Initialize LangWatch if enabled
if LANGWATCH_ENABLED and LANGWATCH_API_KEY:
    langwatch.api_key = LANGWATCH_API_KEY
    # Project ID is automatically used when creating spans

# Import pipeline steps dynamically to avoid circular imports
def import_pipeline_steps():
    """Import pipeline steps dynamically to avoid circular imports"""
    from .steps import (
        find_similar_examples,
        find_app_lib_examples,
        generate_logic,
        review_code,
        write_files
    )
    return {
        "find_similar_examples": find_similar_examples,
        "find_app_lib_examples": find_app_lib_examples,
        "generate_logic": generate_logic,
        "review_code": review_code,
        "write_files": write_files
    }

# Error handling function
def handle_error(state: PipelineState) -> Dict[str, Any]:
    """Handle errors in the pipeline"""
    print(f"\n==== PIPELINE: ERROR HANDLING ====")
    print(f"Error: {state.get('error', 'Unknown error')}")
    
    return state

# Create the pipeline graph
def create_pipeline_graph() -> Any:
    """Create the pipeline graph using langgraph"""
    # Import pipeline steps dynamically
    steps = import_pipeline_steps()
    
    # Initialize the graph
    graph = StateGraph(PipelineState)
    
    # Add nodes for each step
    graph.add_node("find_similar_examples", steps["find_similar_examples"])
    graph.add_node("find_app_lib_examples", steps["find_app_lib_examples"])
    graph.add_node("generate_logic", steps["generate_logic"])
    graph.add_node("review_code", steps["review_code"])
    graph.add_node("write_files", steps["write_files"])
    graph.add_node("handle_error", handle_error)
    
    # Define the normal flow
    graph.add_edge("find_similar_examples", "find_app_lib_examples")
    graph.add_edge("find_app_lib_examples", "generate_logic")
    graph.add_edge("generate_logic", "review_code")
    graph.add_edge("review_code", "write_files")
    graph.add_edge("write_files", END)
    
    # Add conditional edges for error handling
    graph.add_conditional_edges(
        "find_similar_examples",
        lambda state: "handle_error" if state.get("status") == "error" else "find_app_lib_examples"
    )
    
    graph.add_conditional_edges(
        "find_app_lib_examples",
        lambda state: "handle_error" if state.get("status") == "error" else "generate_logic"
    )
    
    graph.add_conditional_edges(
        "generate_logic",
        lambda state: "handle_error" if state.get("status") == "error" else "review_code"
    )
    
    graph.add_conditional_edges(
        "review_code",
        lambda state: "handle_error" if state.get("status") == "error" else "write_files"
    )
    
    graph.add_conditional_edges(
        "handle_error",
        lambda state: END
    )
    
    # Set the entry point
    graph.set_entry_point("find_similar_examples")
    
    # Compile the graph
    return graph.compile()

# Main function to run the pipeline
# Custom trace decorator that formats input and output properly
def custom_trace_decorator(func):
    # Get the original trace decorator
    original_decorator = langwatch.trace(metadata={
        "user_id": os.getenv("USER", "unknown-user"), 
        "thread_id": f"thread-{uuid.uuid4()}", 
        "labels": LANGWATCH_LABELS
    })
    
    # Apply it to the function
    decorated_func = original_decorator(func)
    
    # Create a wrapper that formats input and output
    def wrapper(*args, **kwargs):
        # Format the input as a simple prompt string
        if args and isinstance(args[0], str):
            user_prompt = args[0]
            # Try to get the current trace and set the input
            try:
                current_trace = langwatch.get_current_trace()
                if current_trace:
                    current_trace.update(input=user_prompt)
            except Exception as e:
                print(f"Warning: Could not update LangWatch trace input: {e}")
        
        # Call the original decorated function
        result = decorated_func(*args, **kwargs)
        
        # Format the output to show the generated files
        if isinstance(result, dict) and "files" in result and result.get("status") == "success":
            try:
                # Extract file contents for display
                files_output = ""
                for file_info in result["files"]:
                    file_path = file_info.get("path", "")
                    if "content" in file_info:
                        files_output += f"\n\n--- {os.path.basename(file_path)} ---\n\n"
                        files_output += file_info["content"]
                
                # Set the output to be the generated files
                if files_output:
                    current_trace = langwatch.get_current_trace()
                    if current_trace:
                        current_trace.update(output=files_output.strip())
            except Exception as e:
                print(f"Warning: Could not update LangWatch trace output: {e}")
        
        return result
    
    return wrapper

@custom_trace_decorator
def run_pipeline(user_prompt: str, refresh_vector_store: bool = False, use_all_apps: bool = False, download_apps: bool = False) -> Dict[str, Any]:
    """Run the pipeline from user prompt to generated logic files
    
    Args:
        user_prompt: The user prompt for logic generation
        refresh_vector_store: Whether to force refresh the vector stores
        use_all_apps: Whether to use all available apps instead of fetching recommendations
        download_apps: Whether to download recommended apps from Gitea
        
    Returns:
        Dictionary with pipeline results
    """
    # Print the initial message immediately so the user knows the pipeline is starting
    print(f"\n==== PIPELINE: STARTING PIPELINE WITH USER PROMPT ====\n")
    print(f"User prompt: {user_prompt}")
    
    try:
        # Ensure repositories are available
        ensure_studio_assistant_test_repo()
        ensure_app_lib_repo()
        
        # Handle app selection based on parameters
        print("\n==== SELECTING APPS FOR PROCESSING ====")
        
        if download_apps:
            # Download recommended apps from Gitea
            print("Downloading recommended apps based on prompt...")
            available_apps = download_recommended_apps(user_prompt)
            print(f"Downloaded {len(available_apps)} example apps successfully")
        elif use_all_apps:
            # Just use all available apps without contacting the embedding API
            print("Using all available apps as requested...")
            available_apps = get_available_apps()
            print(f"Using {len(available_apps)} existing example apps")
        else:
            # Default behavior: Get recommendations but only use locally available apps
            print("Fetching app recommendations based on prompt (default behavior)...")
            available_apps = get_recommended_app_dirs(user_prompt)
            print(f"Found {len(available_apps)} recommended apps locally")
        
        # Initialize vector stores if needed
        print("\n==== INITIALIZING VECTOR STORES ====")
        if refresh_vector_store:
            # Force refresh if explicitly requested
            print("Refreshing vector stores as requested")
            initialize_vector_stores(refresh=True, app_directories=available_apps)
        else:
            # Always initialize vector stores but don't force refresh
            initialize_vector_stores(refresh=False, app_directories=available_apps)
            
        print("Vector stores initialized successfully\n")
        
        # Create the pipeline graph
        pipeline = create_pipeline_graph()
        
        # Create the initial state
        initial_state = {
            "user_prompt": user_prompt,
            "app_name": "studio-assistant-test",
            "similar_examples": [],
            "app_lib_examples": [],
            "generated_files": [],
            "reviewed_files": [],
            "written_files": [],
            "status": "running",
            "message": "",
            "error": None,
            "execution_info": {
                "pipeline_start_time": time.time()
            }
        }
        
        # Run the pipeline
        result = pipeline.invoke(initial_state)
        
        # Format the result for return
        return {
            "status": result.get("status", "error"),
            "message": result.get("message", "Unknown error"),
            "files": result.get("written_files", []),
            "elapsed_time": result.get("execution_info", {}).get("elapsed_time", "N/A"),
            "execution_info": result.get("execution_info", {})
        }
    except Exception as e:
        print(f"Error in pipeline: {e}")
        traceback.print_exc()
        
        return {
            "status": "error",
            "message": f"Error in pipeline: {str(e)}",
            "files": [],
            "elapsed_time": "N/A",
            "execution_info": {}
        }
