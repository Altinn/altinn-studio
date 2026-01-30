"""
API dependencies for authentication and authorization
"""
from fastapi import Header, HTTPException


async def get_user_token(x_user_token: str = Header(..., alias="X-User-Token")) -> str:
    """
    Extract user token from X-User-Token header.
    This token is passed by the Designer backend (AltinityProxyHub) and contains
    the user's Gitea access token for repository operations.
    """
    if not x_user_token:
        raise HTTPException(status_code=401, detail="Missing X-User-Token header")
    return x_user_token
