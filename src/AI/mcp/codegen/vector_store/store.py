"""
Vector store implementation for the Altinn Studio Code Generator.
"""

import os
import pickle
import logging
import time
from typing import List, Tuple, Optional, Any

import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings

from server.config import (
    AZURE_ENDPOINT,
    API_KEY,
    EMBEDDING_DEPLOYMENT_NAME,
    APP_VECTOR_CACHE,
    APP_LIB_VECTOR_CACHE,
    VECTOR_STORE_CONFIG,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("embedding_store")

# Set logging level for httpx to WARNING to suppress HTTP request logs
logging.getLogger("httpx").setLevel(logging.WARNING)

# Set logging level for this module to be less verbose
logger.setLevel(logging.WARNING)

class EmbeddingStore:
    """
    A class to handle vector embeddings and similarity search.
    """
    
    def __init__(self, cache_path: str):
        """
        Initialize the embedding store with a cache path.
        
        Args:
            cache_path: Path to the cache file
        """
        self.cache_path = cache_path
        self.embeddings = AzureOpenAIEmbeddings(
            azure_endpoint=AZURE_ENDPOINT,
            api_key=API_KEY,
            api_version=VECTOR_STORE_CONFIG["API_VERSION"],
            deployment=EMBEDDING_DEPLOYMENT_NAME
        )
        logger.info(f"Using Azure OpenAI for embeddings with deployment: {EMBEDDING_DEPLOYMENT_NAME}")
        self.vector_store = None
        self.initialized = False
        
    def load_or_create(self, texts: List[str], metadatas: Optional[List[dict]] = None) -> FAISS:
        """
        Load the vector store from cache or create a new one.
        
        Args:
            texts: List of texts to embed
            metadatas: Optional metadata for each text
            
        Returns:
            The loaded or created vector store
        """
        # Try to load from cache - check both formats (file.index and directory)  
        index_file_exists = os.path.exists(f"{self.cache_path}.index")
        pickle_file_exists = os.path.exists(f"{self.cache_path}.pickle")
        dir_exists = os.path.isdir(self.cache_path)
        
        logger.info(f"Checking cache: index file exists: {index_file_exists}, pickle file exists: {pickle_file_exists}, directory exists: {dir_exists}")
        
        # Case 1: Traditional format with .index and .pickle files
        if index_file_exists and pickle_file_exists:
            try:
                with open(f"{self.cache_path}.pickle", "rb") as f:
                    index_to_docstore_id = pickle.load(f)
                    
                vector_store = FAISS.load_local(
                    self.cache_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded vector store from {self.cache_path} with {len(vector_store.index_to_docstore_id)} documents")
                self.vector_store = vector_store
                self.initialized = True
                return vector_store
            except Exception as e:
                logger.warning(f"Failed to load vector store from cache files: {e}")
        
        # Case 2: Directory format with pickle file
        elif dir_exists and pickle_file_exists:
            try:
                with open(f"{self.cache_path}.pickle", "rb") as f:
                    index_to_docstore_id = pickle.load(f)
                
                # Try loading using the directory path
                vector_store = FAISS.load_local(
                    self.cache_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded vector store from directory {self.cache_path} with {len(vector_store.index_to_docstore_id)} documents")
                self.vector_store = vector_store
                self.initialized = True
                return vector_store
            except Exception as e:
                logger.warning(f"Failed to load vector store from directory: {e}")
        
        # Create new vector store
        if not texts:
            raise ValueError("No texts provided to create vector store")
        
        # Handle rate limits by processing in smaller batches
        batch_size = VECTOR_STORE_CONFIG["EMBEDDING_BATCH_SIZE"]  # Use batch size from config
        
        if len(texts) > batch_size:
            logger.info(f"Processing {len(texts)} documents in batches of {batch_size} to avoid rate limits")
            
            # Process first batch
            first_batch_texts = texts[:batch_size]
            first_batch_metadatas = metadatas[:batch_size] if metadatas else None
            
            # Create initial vector store with first batch
            vector_store = FAISS.from_texts(first_batch_texts, self.embeddings, metadatas=first_batch_metadatas)
            
            # Process remaining batches
            for i in range(batch_size, len(texts), batch_size):
                end_idx = min(i + batch_size, len(texts))
                batch_texts = texts[i:end_idx]
                batch_metadatas = metadatas[i:end_idx] if metadatas else None
                
                logger.info(f"Processing batch {i//batch_size + 1} of {(len(texts) + batch_size - 1)//batch_size}")
                
                # Add a delay to avoid rate limits
                time.sleep(1.0)  # 1 second delay between batches
                
                # Create temporary vector store for this batch
                try:
                    batch_embeddings = self.embeddings.embed_documents(batch_texts)
                    vector_store.add_embeddings(
                        text_embeddings=list(zip(batch_texts, batch_embeddings)),
                        metadatas=batch_metadatas
                    )
                except Exception as e:
                    logger.warning(f"Error processing batch {i//batch_size + 1}: {e}")
                    logger.warning("Waiting 60 seconds before retrying...")
                    time.sleep(60)  # Wait longer if we hit a rate limit
                    
                    # Try again with a smaller batch
                    try:
                        half_batch = len(batch_texts) // 2
                        if half_batch > 0:
                            logger.info(f"Retrying with smaller batch size: {half_batch}")
                            
                            # First half
                            batch_embeddings = self.embeddings.embed_documents(batch_texts[:half_batch])
                            vector_store.add_embeddings(
                                text_embeddings=list(zip(batch_texts[:half_batch], batch_embeddings)),
                                metadatas=batch_metadatas[:half_batch] if batch_metadatas else None
                            )
                            time.sleep(2.0)  # Wait between half-batches
                            
                            # Second half
                            batch_embeddings = self.embeddings.embed_documents(batch_texts[half_batch:])
                            vector_store.add_embeddings(
                                text_embeddings=list(zip(batch_texts[half_batch:], batch_embeddings)),
                                metadatas=batch_metadatas[half_batch:] if batch_metadatas else None
                            )
                    except Exception as retry_error:
                        logger.error(f"Failed to process batch even with retry: {retry_error}")
        else:
            # Small enough to process in one go
            vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
        
        # Save to cache
        os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)
        vector_store.save_local(self.cache_path)
        with open(f"{self.cache_path}.pickle", "wb") as f:
            pickle.dump(vector_store.index_to_docstore_id, f)
            
        logger.info(f"Created new vector store with {len(texts)} documents")
        self.vector_store = vector_store
        return vector_store
    
    def similar_texts(self, query: str, k: int = 5) -> List[str]:
        """
        Find similar texts to the query.
        
        Args:
            query: The query text
            k: Number of results to return
            
        Returns:
            List of similar texts
        """
        if not self.vector_store:
            raise ValueError("Vector store not initialized")
            
        docs = self.vector_store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
    
    def similar_texts_with_scores(self, query: str, k: int = 5) -> List[Tuple[str, float]]:
        """
        Find similar texts to the query with similarity scores.
        
        Args:
            query: The query text
            k: Number of results to return
            
        Returns:
            List of tuples (text, score)
        """
        if not self.vector_store:
            raise ValueError("Vector store not initialized")
            
        docs_and_scores = self.vector_store.similarity_search_with_score(query, k=k)
        return [(doc.page_content, score) for doc, score in docs_and_scores]

# Initialize vector stores
app_vector_store = EmbeddingStore(APP_VECTOR_CACHE)
app_lib_vector_store = EmbeddingStore(APP_LIB_VECTOR_CACHE)
