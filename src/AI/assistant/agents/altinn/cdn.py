"""Fetch the JSON schemas that altinncdn.no serves."""

from typing import Any
from urllib.parse import urlparse

import httpx

_CDN_HOST = "altinncdn.no"
_CDN_SCHEME = "https"
_FETCH_TIMEOUT_SECONDS = 10


def fetch_cdn_schema(schema_url: str) -> dict[str, Any]:
    """Fetch a schema from altinncdn.no over HTTPS. After redirects, the URL must still be on altinncdn.no."""
    _check_cdn_url(schema_url)
    response = httpx.get(schema_url, follow_redirects=True, timeout=_FETCH_TIMEOUT_SECONDS)
    _check_cdn_url(str(response.url))
    response.raise_for_status()
    return response.json()


def _check_cdn_url(url: str) -> None:
    parsed_url = urlparse(url)
    if parsed_url.netloc != _CDN_HOST:
        raise ValueError(
            f"INVALID_DOMAIN: Schema URL must be from {_CDN_HOST} domain, got: '{parsed_url.netloc}'. "
            f"Valid example: https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json. "
            f"This is a security restriction - only official Altinn schemas are supported. "
            f"DO NOT RETRY with the same URL."
        )
    if parsed_url.scheme != _CDN_SCHEME:
        raise ValueError(
            f"INVALID_PROTOCOL: Schema URL must use HTTPS, got: '{parsed_url.scheme}'. "
            f"Change the URL to use https:// instead of {parsed_url.scheme}://. "
            f"DO NOT RETRY with the same URL."
        )
