"""Authentication helpers for per-request token handling in multi-tenant deployments."""

from typing import Optional
import os
from server.config import GITEA_API_KEY as FALLBACK_GITEA_TOKEN


def get_request_token(headers: dict) -> Optional[str]:
    """Extract token from Authorization header.

    Supports multiple authorization schemes:
    - Bearer <token> (OAuth 2.0 standard)
    - token <token> (Gitea/GitHub style)

    Args:
        headers: HTTP headers dictionary from the request

    Returns:
        The token string without prefix, or None if not found

    Examples:
        Authorization: Bearer ghp_abc123 -> Returns: ghp_abc123
        Authorization: token ghp_abc123 -> Returns: ghp_abc123
    """
    auth_header = headers.get("authorization", "")

    # Support Bearer token (OAuth 2.0 standard)
    if auth_header.startswith("Bearer "):
        return auth_header[7:]  # Remove "Bearer " prefix (7 chars)
    elif auth_header.startswith("bearer "):
        return auth_header[7:]  # Case insensitive

    # Support token prefix (Gitea/GitHub style)
    elif auth_header.startswith("token "):
        return auth_header[6:]  # Remove "token " prefix (6 chars)
    elif auth_header.startswith("Token "):
        return auth_header[6:]  # Case insensitive

    return None


def get_gitea_token_with_fallback(headers: Optional[dict] = None) -> str:
    """Get Gitea API token from request headers with fallback to environment.

    This function implements the multi-tenant token strategy:
    1. First, try to get token from Authorization header (per-request)
    2. If not found, fall back to environment variable (local dev/single-tenant)

    Args:
        headers: Optional HTTP headers dictionary. If None, will try to get from FastMCP context

    Returns:
        The Gitea API token string

    Raises:
        ValueError: If no token is available from either source
    """
    # Try to get headers from FastMCP context if not provided
    if headers is None:
        try:
            from fastmcp.server.dependencies import get_http_headers
            headers = get_http_headers()
        except Exception:
            # Not in an HTTP request context (e.g., stdio transport or testing)
            headers = {}

    # Try to get token from request header first (multi-tenant mode)
    request_token = get_request_token(headers)
    if request_token:
        return request_token

    # Fall back to environment variable (single-tenant mode / local dev)
    if FALLBACK_GITEA_TOKEN:
        return FALLBACK_GITEA_TOKEN

    raise ValueError(
        "No Gitea API token found. Either:\n"
        "1. Include 'Authorization: Bearer <token>' header in your request (multi-tenant), or\n"
        "2. Set GITEA_API_KEY in .env file (single-tenant/local dev)"
    )


def get_gitea_token_or_none(headers: Optional[dict] = None) -> Optional[str]:
    """Get Gitea API token without raising an error if not found.

    Args:
        headers: Optional HTTP headers dictionary

    Returns:
        The token string or None if not available
    """
    try:
        return get_gitea_token_with_fallback(headers)
    except ValueError:
        return None
