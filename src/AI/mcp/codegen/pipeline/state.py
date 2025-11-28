"""
State management module for the Altinn Studio Code Generator pipeline.
Contains the state schema and helper functions for state updates.
"""

from typing import Dict, List, Any, Optional, TypedDict

# Define the state schema
class PipelineState(TypedDict):
    """State schema for the pipeline"""
    user_prompt: str
    app_name: str
    similar_examples: List[Dict[str, Any]]
    app_lib_examples: List[Dict[str, Any]]
    generated_files: List[Dict[str, Any]]
    # reviewed_files moved to execution_info to avoid LangGraph channel limitations
    written_files: List[Dict[str, Any]]
    status: str
    message: str
    error: Optional[str]
    execution_info: Dict[str, Any]

# Helper function for state updates
def update_state(state: PipelineState, **kwargs) -> Dict[str, Any]:
    """Update state with new values, returning only the fields that changed"""
    # Only return the fields that were updated
    return kwargs
