"""
API dependencies for authentication and authorization
"""
from fastapi import Depends
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-Api-Key")


async def get_api_key(x_api_key: str = Depends(api_key_header)) -> str:
    """
    Extract API key from X-Api-Key header.
    This is a short-lived key created by the Designer backend
    for authenticating git operations through the Gitea proxy.

    APIKeyHeader returns 401 if the header is missing or empty.
    """
    return x_api_key
