"""Builds an authenticated httpx client for the Langfuse public REST API."""

import base64

import httpx

from shared.config import get_config

PAGE_SIZE = 50
REQUEST_TIMEOUT_SECONDS = 30


def create_public_api_client() -> httpx.AsyncClient:
    config = get_config()
    auth_header = _basic_auth_header(
        config.LANGFUSE_PUBLIC_KEY, config.LANGFUSE_SECRET_KEY
    )
    return httpx.AsyncClient(
        base_url=config.LANGFUSE_HOST,
        headers={"Authorization": auth_header},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )


def _basic_auth_header(public_key: str | None, secret_key: str | None) -> str:
    if not public_key or not secret_key:
        raise RuntimeError("Langfuse credentials are not configured")
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    return f"Basic {token}"
