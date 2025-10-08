"""
Document loading utilities for the Altinn Studio Code Generator.
"""

import os
import glob
import json
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Tuple

from server.config import (
    APP_LIB_DIR,
    APP_VECTOR_CACHE,
    APP_LIB_VECTOR_CACHE,
    STUDIO_APPS_DIR,
)
from .store import EmbeddingStore, app_vector_store, app_lib_vector_store
from .chunker import chunk_code_file

def load_app_documents(app_directories: List[str] = None) -> List[Dict[str, Any]]:
    """
    Load documents from the studio-apps directory containing example Altinn Studio applications.
    
    Args:
        app_directories: Optional list of specific app directories to load from.
                        If None, all apps in the studio-apps directory will be loaded.
    
    Returns:
        List of documents with metadata
    """
    documents = []
    
    # Check if the studio-apps directory exists
    if not os.path.exists(STUDIO_APPS_DIR):
        print(f"Studio apps directory not found at {STUDIO_APPS_DIR}")
        return documents
    
    print(f"Loading example apps from: {STUDIO_APPS_DIR}")
    
    # Get app directories to process
    if app_directories:
        # Use the provided list of app directories
        app_dirs = [os.path.basename(d) for d in app_directories if os.path.isdir(d)]
        print(f"Using {len(app_dirs)} filtered app directories")
    else:
        # Get all app directories in studio-apps
        app_dirs = [d for d in os.listdir(STUDIO_APPS_DIR) 
                  if os.path.isdir(os.path.join(STUDIO_APPS_DIR, d))]
        print(f"Found {len(app_dirs)} app directories in studio-apps")
    
    # Process each app directory
    for app_dir_name in app_dirs:
        app_path = os.path.join(STUDIO_APPS_DIR, app_dir_name)
        app_cs_files = glob.glob(f"{app_path}/App/**/*.cs", recursive=True)
        
        # Get app ID if available
        app_id = app_dir_name  # Default to directory name
        metadata_path = os.path.join(app_path, "App/config/applicationmetadata.json")
        if os.path.exists(metadata_path):
            try:
                # Use utf-8-sig to handle UTF-8 BOM
                with open(metadata_path, 'r', encoding='utf-8-sig') as f:
                    metadata = json.load(f)
                    if "id" in metadata:
                        app_id = metadata["id"]
            except Exception as e:
                print(f"Error reading metadata for {app_dir_name}: {e}")
        
        print(f"Found {len(app_cs_files)} C# files in app {app_id}")
        
        # Process each file from this app
        for file_path in app_cs_files:
            try:
                # Try multiple encodings to handle Nordic characters
                content = None
                encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
                
                for encoding in encodings:
                    try:
                        with open(file_path, "r", encoding=encoding) as f:
                            content = f.read()
                        break  # If successful, break the loop
                    except UnicodeDecodeError:
                        continue
                
                if content is None:
                    print(f"Warning: Could not decode file {file_path} with any encoding")
                    continue
                
                # Skip empty or minimal files
                if len(content.strip()) < 50:
                    continue
                
                # Get relative path for display
                rel_path = os.path.relpath(file_path, app_path)
                
                # Chunk the file
                chunks = chunk_code_file(rel_path, content)
                
                # Add each chunk as a document with app metadata
                for chunk in chunks:
                    # Add app metadata to chunk metadata
                    chunk['metadata'].update({
                        "app_id": app_id,
                        "app_name": app_dir_name,  # Keep original directory name for reference
                        "file_path": rel_path,
                        "source": "studio-apps"
                    })
                    
                    # Add the chunk as a document
                    documents.append({
                        "content": chunk['content'],
                        "metadata": chunk['metadata']
                    })
            except Exception as e:
                print(f"Error processing file {file_path}: {e}")
    
    print(f"Loaded {len(documents)} documents from {len(app_dirs)} apps")
    return documents

def load_app_lib_documents() -> List[Dict[str, Any]]:
    """
    Load documents from the app-lib-dotnet repository.
    
    Returns:
        List of documents with metadata
    """
    documents = []
    
    # Check if the repository exists
    if not os.path.exists(APP_LIB_DIR):
        print(f"Repository not found at {APP_LIB_DIR}")
        return documents
    
    # Find all C# files in the repository
    cs_files = glob.glob(f"{APP_LIB_DIR}/**/*.cs", recursive=True)
    print(f"Found {len(cs_files)} C# files in {APP_LIB_DIR}")
    
    # Process each file
    for file_path in cs_files:
        try:
            # Try multiple encodings to handle Nordic characters
            content = None
            encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
            
            for encoding in encodings:
                try:
                    with open(file_path, "r", encoding=encoding) as f:
                        content = f.read()
                    break  # If successful, break the loop
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                print(f"Warning: Could not decode file {file_path} with any encoding")
                continue
            
            # Skip empty or minimal files
            if len(content.strip()) < 50:
                continue
            
            # Get relative path for display
            rel_path = os.path.relpath(file_path, APP_LIB_DIR)
            
            # Chunk the file
            chunks = chunk_code_file(rel_path, content)
            
            # Add each chunk as a document
            for chunk in chunks:
                # Add source metadata
                chunk['metadata'].update({
                    "file_path": rel_path,
                    "source": "app-lib-dotnet"
                })
                
                documents.append({
                    "content": chunk['content'],
                    "metadata": chunk['metadata']
                })
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
    
    return documents

def initialize_vector_stores(refresh: bool = False, app_directories: List[str] = None) -> Tuple[EmbeddingStore, EmbeddingStore]:
    """Initialize vector stores with documents from repositories
    
    Args:
        refresh: Whether to force refresh the vector stores
        app_directories: Optional list of specific app directories to load from
        
    Returns:
        Tuple of (app_vector_store, app_lib_vector_store)
    """
    print("Initializing vector stores...")
    
    if refresh:
        print("Forcing refresh of vector stores as requested")
    
    # Check if vector stores already exist in either format (file or directory)
    app_cache_file_exists = os.path.exists(f"{APP_VECTOR_CACHE}.index") and os.path.exists(f"{APP_VECTOR_CACHE}.pickle")
    app_cache_dir_exists = os.path.isdir(APP_VECTOR_CACHE) and os.path.exists(f"{APP_VECTOR_CACHE}.pickle")
    app_lib_cache_file_exists = os.path.exists(f"{APP_LIB_VECTOR_CACHE}.index") and os.path.exists(f"{APP_LIB_VECTOR_CACHE}.pickle")
    app_lib_cache_dir_exists = os.path.isdir(APP_LIB_VECTOR_CACHE) and os.path.exists(f"{APP_LIB_VECTOR_CACHE}.pickle")
    
    # Combine the checks
    app_cache_exists = app_cache_file_exists or app_cache_dir_exists
    app_lib_cache_exists = app_lib_cache_file_exists or app_lib_cache_dir_exists
    
    # If refresh is True, always rebuild the vector stores
    if refresh:
        print("Rebuilding app vector store from scratch due to refresh flag")
        app_documents = load_app_documents(app_directories)
    elif app_cache_exists:
        cache_format = "directory" if app_cache_dir_exists else "file"
        print(f"App vector store cache found in {cache_format} format at: {APP_VECTOR_CACHE}")
        try:
            # Try to load existing vector store
            app_vector_store.load_or_create(texts=["Test document"], metadatas=[{"test": True}])
            print("Successfully loaded existing app vector store")
            # No need to load documents if cache exists and loads successfully
            app_documents = []
            # Set the vector store as initialized to avoid rebuilding
            app_vector_store.initialized = True
        except Exception as e:
            print(f"Error loading existing app vector store: {e}")
            print("Will rebuild app vector store from scratch")
            app_documents = load_app_documents(app_directories)
    else:
        print("No existing app vector store cache found - building from scratch")
        app_documents = load_app_documents(app_directories)
    
    # Load app documents if needed
    if app_documents:
        print(f"Loading {len(app_documents)} app documents into vector store...")
        app_vector_store.load_or_create(
            texts=[doc["content"] for doc in app_documents],
            metadatas=[doc["metadata"] for doc in app_documents]
        )
        print("App vector store initialized successfully")
    elif not app_cache_exists:
        print("No app documents found to initialize vector store")
    
    # Similar logic for app-lib vector store
    if refresh:
        print("Rebuilding app-lib vector store from scratch due to refresh flag")
        app_lib_documents = load_app_lib_documents()
    elif app_lib_cache_exists:
        cache_format = "directory" if app_lib_cache_dir_exists else "file"
        print(f"App-lib vector store cache found in {cache_format} format at: {APP_LIB_VECTOR_CACHE}")
        try:
            # Try to load existing vector store
            app_lib_vector_store.load_or_create(texts=["Test document"], metadatas=[{"test": True}])
            print("Successfully loaded existing app-lib vector store")
            # No need to load documents if cache exists and loads successfully
            app_lib_documents = []
            # Set the vector store as initialized to avoid rebuilding
            app_lib_vector_store.initialized = True
        except Exception as e:
            print(f"Error loading existing app-lib vector store: {e}")
            print("Will rebuild app-lib vector store from scratch")
            app_lib_documents = load_app_lib_documents()
    else:
        print("No existing app-lib vector store cache found - building from scratch")
        app_lib_documents = load_app_lib_documents()
    
    # Load app-lib documents if needed
    if app_lib_documents:
        print(f"Loading {len(app_lib_documents)} app-lib documents into vector store...")
        app_lib_vector_store.load_or_create(
            texts=[doc["content"] for doc in app_lib_documents],
            metadatas=[doc["metadata"] for doc in app_lib_documents]
        )
        print("App-lib vector store initialized successfully")
    elif not app_lib_cache_exists:
        print("No app-lib documents found to initialize vector store")
