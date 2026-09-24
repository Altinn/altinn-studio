"""Layout schema validation and component-property introspection."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

_SCHEMA_CACHE_TTL_SECONDS = 60 * 60  # schemas change rarely; 1h is generous
_REMOTE_SCHEMA_PREFIX = "https://"
_SIBLING_SCHEMA_GLOB_PATTERN = "*.schema.v1.json"
_schema_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def get_layout_schema(schema_location: str) -> dict[str, Any]:
    """Load (and memoize) a layout schema from a URL or a file path.

    The underlying loaders refetch on every call; a verify pass over N
    layout files would otherwise hit the CDN N times.  One in-process
    TTL cache serves both the validator and the properties introspector.
    """
    now = time.monotonic()
    hit = _schema_cache.get(schema_location)
    if hit and now - hit[0] < _SCHEMA_CACHE_TTL_SECONDS:
        return hit[1]
    schema = _load_schema(schema_location)
    _schema_cache[schema_location] = (now, schema)
    return schema


def get_referenced_schemas(schema_location: str) -> dict[str, dict[str, Any]]:
    """The schemas next to a layout schema file, keyed by `$id`.

    Registered with the validator so the file's `$ref`s resolve from disk.
    Otherwise they resolve against the CDN copies, which lag the in-repo
    schemas.  A remote schema's references still resolve over the network.
    """
    if _is_remote(schema_location):
        return {}
    sibling_paths = sorted(Path(schema_location).parent.glob(_SIBLING_SCHEMA_GLOB_PATTERN))
    sibling_schemas = [get_layout_schema(str(path)) for path in sibling_paths]
    return {schema["$id"]: schema for schema in sibling_schemas if "$id" in schema}


def _load_schema(schema_location: str) -> dict[str, Any]:
    from .schema_validator import load_layout_schema

    if _is_remote(schema_location):
        return load_layout_schema(schema_location)
    return json.loads(Path(schema_location).read_text(encoding="utf-8"))


def _is_remote(schema_location: str) -> bool:
    return schema_location.startswith(_REMOTE_SCHEMA_PREFIX)
