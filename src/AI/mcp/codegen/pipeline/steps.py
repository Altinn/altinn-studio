"""
Pipeline steps module for the Altinn Studio Code Generator.
Contains individual pipeline steps for finding examples, generating logic, reviewing code, etc.
"""

import os
import re
import json
import time
import traceback
from typing import Dict, List, Any, Optional

# Import LangWatch for monitoring
import langwatch
from langwatch.types import RAGChunk

# Import utilities
from server.config import STUDIO_ASSISTANT_TEST_DIR, VECTOR_STORE_CONFIG
from .state import update_state, PipelineState
from .llm_helpers import generate_code, review_code_with_llm, extract_code_from_response

# Import vector stores
from ..vector_store.store import app_vector_store, app_lib_vector_store

# Get vector store configuration parameters
APP_SIMILARITY_K = VECTOR_STORE_CONFIG["APP_SIMILARITY_K"]
APP_LIB_SIMILARITY_K = VECTOR_STORE_CONFIG["APP_LIB_SIMILARITY_K"]
MAX_EXAMPLES_IN_PROMPT = VECTOR_STORE_CONFIG["MAX_EXAMPLES_IN_PROMPT"]
MAX_EXAMPLE_CHARS = VECTOR_STORE_CONFIG["MAX_EXAMPLE_CHARS"]

def find_similar_examples(state: PipelineState) -> Dict[str, Any]:
    """Find similar examples from the app vector store"""
    print(f"\n==== PIPELINE: STEP 1 - FINDING SIMILAR EXAMPLES ====")
    
    try:
        user_prompt = state["user_prompt"]
        
        # Search in app vector store with LangWatch tracing
        with langwatch.span(type="rag", name="app_vector_search") as span:
            app_results = app_vector_store.vector_store.similarity_search_with_score(user_prompt, k=VECTOR_STORE_CONFIG["APP_SIMILARITY_K"])

            # Format the results for LangWatch with detailed information
            if span:
                # Create a detailed string representation of the results
                top_scores = [f"{score:.4f}" for _, score in app_results[:3]] if app_results else []
                
                # Create a detailed output summary
                result_summary = f"Found {len(app_results)} results from app examples. \n"
                result_summary += f"Vector store: app_vector_store\n"
                result_summary += f"Query length: {len(user_prompt)} characters\n"
                
                if app_results:
                    result_summary += f"Top scores: {', '.join(top_scores[:3])}\n"
                    # Add snippets of top results (first 100 chars)
                    result_summary += "\nTop result snippets:\n"
                    for i, (content, score) in enumerate(app_results[:3]):
                        if i < 3:  # Only show top 3
                            snippet = content.page_content.replace('\n', ' ')[:100] + "..."
                            result_summary += f"[{i+1}] Score {score:.4f}: {snippet}\n"
                
                # Update the span with detailed information
                span.update(input=user_prompt, output=result_summary)
        
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
        
        # Update execution info
        execution_info = state.get("execution_info", {}).copy()
        execution_info["similar_examples_count"] = len(similar_examples)
        execution_info["similar_examples_time"] = time.time()
        
        return update_state(
            state,
            similar_examples=similar_examples,
            execution_info=execution_info
        )
    except Exception as e:
        print(f"Error finding similar examples: {e}")
        traceback.print_exc()
        
        # Create a new state with error information
        error_state = state.copy()
        error_state["error"] = f"Error finding similar examples: {str(e)}"
        error_state["message"] = "Error finding similar examples"
        error_state["status"] = "error"
        
        return error_state

def find_app_lib_examples(state: PipelineState) -> Dict[str, Any]:
    """Find similar examples from the app-lib vector store"""
    print(f"\n==== PIPELINE: STEP 2 - FINDING APP-LIB EXAMPLES ====")
    
    try:
        user_prompt = state["user_prompt"]
        
        # Search in app-lib vector store with LangWatch tracing
        with langwatch.span(type="rag", name="app_lib_vector_search") as span:
            app_lib_results = app_lib_vector_store.vector_store.similarity_search_with_score(user_prompt, k=VECTOR_STORE_CONFIG["APP_LIB_SIMILARITY_K"])
            
            # Format the results for LangWatch with detailed information
            if span:
                # Create a detailed string representation of the results
                top_scores = [f"{score:.4f}" for _, score in app_lib_results[:3]] if app_lib_results else []
                
                # Create a detailed output summary
                result_summary = f"Found {len(app_lib_results)} results from app-lib examples. \n"
                result_summary += f"Vector store: app_lib_vector_store\n"
                result_summary += f"Query length: {len(user_prompt)} characters\n"
                
                if app_lib_results:
                    result_summary += f"Top scores: {', '.join(top_scores[:3])}\n"
                    # Add snippets of top results (first 100 chars)
                    result_summary += "\nTop result snippets:\n"
                    for i, (doc, score) in enumerate(app_lib_results[:3]):
                        if i < 3:  # Only show top 3
                            snippet = doc.page_content.replace('\n', ' ')[:100] + "..."
                            result_summary += f"[{i+1}] Score {score:.4f}: {snippet}\n"
                
                # Update the span with detailed information
                span.update(input=user_prompt, output=result_summary)
        
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
        
        # Update execution info
        execution_info = state.get("execution_info", {}).copy()
        execution_info["app_lib_examples_count"] = len(app_lib_examples)
        execution_info["app_lib_examples_time"] = time.time()
        
        return update_state(
            state,
            app_lib_examples=app_lib_examples,
            execution_info=execution_info
        )
    except Exception as e:
        print(f"Error finding app-lib examples: {e}")
        traceback.print_exc()
        
        # Create a new state with error information
        error_state = state.copy()
        error_state["error"] = f"Error finding app-lib examples: {str(e)}"
        error_state["message"] = "Error finding app-lib examples"
        error_state["status"] = "error"
        
        return error_state

def generate_logic(state: PipelineState) -> Dict[str, Any]:
    """Generate logic files based on similar examples"""
    print(f"\n==== PIPELINE: STEP 3 - GENERATING LOGIC ====")
    
    try:
        # Get the user prompt and examples from previous steps
        user_prompt = state["user_prompt"]
        similar_examples = state["similar_examples"]
        app_lib_examples = state["app_lib_examples"]
        
        # Count unique apps to provide more accurate information
        unique_apps = set(example.get("app_name", example.get("app_id", "Unknown")) 
                         for example in similar_examples)
        
        print(f"Generating logic based on {len(similar_examples)} code snippets from {len(unique_apps)} example apps and {len(app_lib_examples)} app-lib code snippets")
        
        # Prepare examples for the prompt
        examples_text = ""
        for i, example in enumerate(similar_examples[:MAX_EXAMPLES_IN_PROMPT], 1):
            content = example["content"]
            score = example["score"]
            file_name = example.get("file_name", "Unknown")
            examples_text += f"\n\n--- EXAMPLE {i} ({file_name}, Similarity: {score:.2f}) ---\n{content[:MAX_EXAMPLE_CHARS]}..."
        
        # Add app-lib examples
        for i, example in enumerate(app_lib_examples[:MAX_EXAMPLES_IN_PROMPT-1], 1):
            content = example["content"]
            score = example["score"]
            file_name = example.get("file_name", "Unknown")
            examples_text += f"\n\n--- APP-LIB EXAMPLE {i} ({file_name}, Similarity: {score:.2f}) ---\n{content[:MAX_EXAMPLE_CHARS]}..."
        
        # Generate code using the helper function
        response = generate_code(user_prompt, examples_text)
        
        # Parse the response to extract file objects
        generated_files = extract_code_from_response(response)
        
        if not generated_files:
            return update_state(
                state,
                status="error",
                message="Failed to generate any valid files",
                error="No valid files were generated"
            )
        
        # Update execution info
        execution_info = state.get("execution_info", {}).copy()
        execution_info["generated_files_count"] = len(generated_files)
        execution_info["generated_files_time"] = time.time()
        
        return update_state(
            state,
            generated_files=generated_files,
            execution_info=execution_info
        )
    except Exception as e:
        print(f"Error generating logic: {e}")
        traceback.print_exc()
        
        # Create a new state with error information
        error_state = state.copy()
        error_state["error"] = f"Error generating logic: {str(e)}"
        error_state["message"] = "Error generating logic"
        error_state["status"] = "error"
        
        return error_state

def review_code(state: PipelineState) -> Dict[str, Any]:
    """Review generated code for quality and correctness"""
    print(f"\n==== PIPELINE: STEP 4 - REVIEWING CODE ====")
    
    try:
        generated_files = state["generated_files"]
        
        if not generated_files:
            print("No files to review")
            return update_state(
                state,
                reviewed_files=[],
                status="error",
                message="No files to review",
                error="No generated files to review"
            )
        
        reviewed_files = []
        print(f"Reviewing {len(generated_files)} generated files:")
        
        for file_index, file_info in enumerate(generated_files):
            try:
                file_path = file_info["path"]
                content = file_info["content"]
                
                print(f"\n  Reviewing file {file_index+1}: {file_path}")
                print(f"  File size: {len(content)} characters")
                
                # Review the code using the helper function
                review_result = review_code_with_llm(file_path, content)
                
                # Add review information to the file info
                file_info["review"] = review_result["review"]
                
                # Update content if improvements were suggested
                if review_result["improved_content"]:
                    file_info["content"] = review_result["improved_content"]
                    print(f"  - Applied improvements to the file")
                    
                    # Show what changed (first few lines)
                    if review_result["diff_lines"]:
                        print("  - Sample changes:")
                        for line in review_result["diff_lines"]:
                            print(line)
                
                reviewed_files.append(file_info)
            except Exception as e:
                print(f"  Error in code review: {e}")
                traceback.print_exc()
                reviewed_files.append(file_info)  # Keep the original file
        
        # Update execution info
        execution_info = state.get("execution_info", {}).copy()
        execution_info["reviewed_files_count"] = len(reviewed_files)
        execution_info["reviewed_files_time"] = time.time()
        
        # Store the reviewed files in the state
        # Instead of directly updating the reviewed_files key, we'll add it to the execution_info
        # to avoid LangGraph's limitation of one value per key
        execution_info["reviewed_files"] = reviewed_files
        
        return update_state(
            state,
            execution_info=execution_info
        )
    except Exception as e:
        print(f"Error reviewing code: {e}")
        traceback.print_exc()
        
        # Create a new state with error information
        error_state = state.copy()
        error_state["error"] = f"Error reviewing code: {str(e)}"
        error_state["message"] = "Error reviewing code"
        error_state["status"] = "error"
        
        return error_state

def write_files(state: PipelineState) -> Dict[str, Any]:
    """Write the generated files to disk"""
    print(f"\n==== PIPELINE: STEP 5 - WRITING FILES ====")
    
    try:
        # Get the reviewed files from the execution_info instead of directly from the state
        execution_info = state.get("execution_info", {})
        reviewed_files = execution_info.get("reviewed_files", [])
        
        if not reviewed_files:
            print("No files to write")
            # Create a new state with error information
            error_state = state.copy()
            error_state["written_files"] = []
            error_state["error"] = "No reviewed files to write"
            error_state["message"] = "No files to write"
            error_state["status"] = "error"
            return error_state
        
        # Setup the app directory
        app_dir = os.path.join(STUDIO_ASSISTANT_TEST_DIR, "App")
        os.makedirs(app_dir, exist_ok=True)
        
        # Write the files
        written_files = []
        print(f"Writing {len(reviewed_files)} files to {app_dir}:")
        
        for file_info in reviewed_files:
            file_path = file_info.get("path", "")
            content = file_info.get("content", "")
            
            if file_path and content:
                # Fix the file path to prevent duplicate App folders
                if file_path.startswith('App/'):
                    file_path = file_path[4:]  # Remove 'App/' prefix
                
                # Ensure the path uses the correct case for 'logic' to match sample apps
                file_path = file_path.replace('Logic/', 'logic/')
                
                full_path = os.path.join(app_dir, file_path)
                
                # Create the directory and write the file
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w") as f:
                    f.write(content)
                
                # Trace file generation with LangWatch
                with langwatch.span(type="tool", name="file_generation") as span:
                    if span:
                        # Simplified tracing
                        span.update(input=f"Generating file: {file_path}", output=f"Generated {len(content)} bytes")
                
                # Get file size
                file_size = len(content)
                line_count = content.count('\n') + 1
                
                print(f"[OK] File written: {full_path}")
                print(f"  - Size: {file_size} characters, {line_count} lines")
                
                # Show if the file was improved during review
                if file_info.get("review", {}).get("issues_found", False):
                    print(f"  - File was improved during code review")
                
                written_files.append({
                    "path": full_path,
                    "review": file_info.get("review", {}),
                    "size": file_size,
                    "lines": line_count
                })
        
        # Update execution info
        execution_info = state.get("execution_info", {}).copy()
        execution_info["written_files_count"] = len(written_files)
        execution_info["written_files_time"] = time.time()
        execution_info["pipeline_end_time"] = time.time()
        
        # Calculate elapsed time
        if "pipeline_start_time" in execution_info:
            elapsed_seconds = execution_info["pipeline_end_time"] - execution_info["pipeline_start_time"]
            minutes, seconds = divmod(elapsed_seconds, 60)
            execution_info["elapsed_time"] = f"{int(minutes)}m {int(seconds)}s"
        
        return update_state(
            state,
            written_files=written_files,
            status="success",
            message=f"Generated {len(written_files)} logic files for the existing app",
            execution_info=execution_info
        )
    except Exception as e:
        print(f"Error writing files: {e}")
        traceback.print_exc()
        
        # Create a new state with error information
        error_state = state.copy()
        error_state["error"] = f"Error writing files: {str(e)}"
        error_state["message"] = "Error writing files"
        error_state["status"] = "error"
        
        return error_state
