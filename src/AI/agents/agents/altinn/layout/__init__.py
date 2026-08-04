"""Layout schema validation and component-property introspection."""

from __future__ import annotations

import time
from typing import Any

LAYOUT_SCHEMA_URL = (
    "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
)

_SCHEMA_CACHE_TTL_SECONDS = 60 * 60  # schemas change rarely; 1h is generous
_schema_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def get_layout_schema(schema_url: str = LAYOUT_SCHEMA_URL) -> dict[str, Any]:
    """Fetch (and memoize) the official layout schema.

    The underlying loaders refetch on every call; a verify pass over N
    layout files would otherwise hit the CDN N times.  One in-process
    TTL cache serves both the validator and the properties introspector.
    """
    from .schema_validator import load_layout_schema

    now = time.monotonic()
    hit = _schema_cache.get(schema_url)
    if hit and now - hit[0] < _SCHEMA_CACHE_TTL_SECONDS:
        return hit[1]
    schema = load_layout_schema(schema_url)
    _schema_cache[schema_url] = (now, schema)
    return schema
