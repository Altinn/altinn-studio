"""
Utility functions for the Altinn Studio Code Generator.
"""

import os
import sys
import io
import subprocess
import traceback
from typing import Any, Dict, List, Optional

from .config import (
    STUDIO_ASSISTANT_TEST_REPO,
    APP_LIB_REPO,
    STUDIO_ASSISTANT_TEST_REPO_DIR,
    STUDIO_ASSISTANT_TEST_DIR,
    APP_LIB_DIR,
    APP_VECTOR_CACHE,
    APP_LIB_VECTOR_CACHE,
    OUTPUT_DIR
)

def setup_io_redirection():
    """
    Set up UTF-8 encoding for stdout/stderr with proper error handling.
    This is safe to call multiple times - it will only redirect once.
    """
    # Set UTF-8 encoding for stdout to handle Unicode characters
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # Force stdout to use utf-8 encoding with error handling
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def sanitize_text(text):
    """Sanitize text with problematic Unicode characters"""
    if isinstance(text, str):
        return text.encode('utf-8', errors='replace').decode('utf-8')
    return text

def ensure_studio_assistant_test_repo():
    """Check if the studio-assistant-test repository exists, and clone it if it doesn't"""
    # Import GitPython here to avoid circular imports
    import git
    
    # Ensure repository directory exists
    if not os.path.exists(os.path.dirname(STUDIO_ASSISTANT_TEST_REPO_DIR)):
        os.makedirs(os.path.dirname(STUDIO_ASSISTANT_TEST_REPO_DIR), exist_ok=True)
    
    # Clone or update the repository
    if not os.path.exists(STUDIO_ASSISTANT_TEST_REPO_DIR):
        print(f"Cloning studio-assistant-test repository to {STUDIO_ASSISTANT_TEST_REPO_DIR}...")
        try:
            # Use GitPython to clone the repository
            git.Repo.clone_from(STUDIO_ASSISTANT_TEST_REPO, STUDIO_ASSISTANT_TEST_REPO_DIR)
            print("Repository cloned successfully")
        except Exception as e:
            print(f"Exception during repository cloning: {str(e)}")
            print(f"Using repository URL: {STUDIO_ASSISTANT_TEST_REPO}")
            raise
    else:
        print(f"Studio Assistant Test repository already exists at: {STUDIO_ASSISTANT_TEST_REPO_DIR}")
        # Pull latest changes
        try:
            print("Pulling latest changes...")
            # Use GitPython to pull the latest changes
            repo = git.Repo(STUDIO_ASSISTANT_TEST_REPO_DIR)
            origin = repo.remotes.origin
            origin.pull()
            print("Repository updated successfully")
        except Exception as e:
            print(f"Warning: Could not update repository: {str(e)}")
            # Continue anyway
    
    # Ensure output directory exists
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Create the output directory for the app
    if not os.path.exists(STUDIO_ASSISTANT_TEST_DIR):
        os.makedirs(STUDIO_ASSISTANT_TEST_DIR, exist_ok=True)
        print(f"Created output directory at: {STUDIO_ASSISTANT_TEST_DIR}")
    else:
        print(f"Output directory already exists at: {STUDIO_ASSISTANT_TEST_DIR}")

def ensure_app_lib_repo():
    """Check if the app-lib-dotnet repository exists, and clone it if it doesn't"""
    # Import GitPython here to avoid circular imports
    import git
    
    if not os.path.exists(os.path.dirname(APP_LIB_DIR)):
        os.makedirs(os.path.dirname(APP_LIB_DIR), exist_ok=True)
    if not os.path.exists(APP_LIB_DIR):
        print(f"Cloning app-lib-dotnet repository to {APP_LIB_DIR}...")
        try:
            # Use GitPython to clone the repository
            git.Repo.clone_from(APP_LIB_REPO, APP_LIB_DIR)
            print("Repository cloned successfully")
        except Exception as e:
            print(f"Exception during repository cloning: {str(e)}")
            print(f"Using repository URL: {APP_LIB_REPO}")
            raise
    else:
        print(f"App-lib-dotnet repository already exists at: {APP_LIB_DIR}")
        # Pull latest changes
        try:
            print("Pulling latest changes...")
            # Use GitPython to pull the latest changes
            repo = git.Repo(APP_LIB_DIR)
            origin = repo.remotes.origin
            origin.pull()
            print("Repository updated successfully")
        except Exception as e:
            print(f"Warning: Could not update repository: {str(e)}")
            # Continue anyway

def force_refresh_vector_stores():
    """Force refresh of vector stores by removing cache files"""
    print("Forcing refresh of vector stores...")
    # Remove cache files if they exist
    if os.path.exists(f"{APP_VECTOR_CACHE}.index"):
        os.remove(f"{APP_VECTOR_CACHE}.index")
    if os.path.exists(f"{APP_VECTOR_CACHE}.pickle"):
        os.remove(f"{APP_VECTOR_CACHE}.pickle")
    if os.path.exists(f"{APP_LIB_VECTOR_CACHE}.index"):
        os.remove(f"{APP_LIB_VECTOR_CACHE}.index")
    if os.path.exists(f"{APP_LIB_VECTOR_CACHE}.pickle"):
        os.remove(f"{APP_LIB_VECTOR_CACHE}.pickle")
    print("Vector store cache files removed")

def handle_exception(func):
    """Decorator to handle exceptions in functions"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"Error in {func.__name__}: {e}")
            traceback.print_exc()
            return None
    return wrapper
