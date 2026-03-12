"""
API dependencies for authentication and authorization
"""
from fastapi import Header, HTTPException


async def get_api_key(x_api_key: str = Header(..., alias="X-Api-Key")) -> str:
    """
    Extract API key from X-Api-Key header.
    This is a short-lived key created by the Designer backend (AltinityProxyHub)
    for authenticating git operations through the Gitea proxy.
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-Api-Key header")
    return x_api_key
