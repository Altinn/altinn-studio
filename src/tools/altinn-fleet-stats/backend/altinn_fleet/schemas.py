"""Fetch and parse Altinn JSON schemas to enrich settings stats with descriptions.

Schemas are cached on disk under `<data_dir>/.cache/schemas/`. We refresh once
per week — schemas change rarely.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

# Map (scope) → schema URL
SCHEMA_URLS = {
    "layout_set": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
    "application_metadata": "https://altinncdn.no/schemas/json/application/application-metadata.schema.v1.json",
    "layout_sets_root": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout-sets.schema.v1.json",
}

CACHE_TTL_SECONDS = 7 * 24 * 3600  # 1 week


def _cache_path(data_dir: Path, scope: str) -> Path:
    return data_dir / ".cache" / "schemas" / f"{scope}.json"


def _fetch(url: str) -> Optional[dict]:
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError):
        return None


def load_schema(data_dir: Path, scope: str) -> Optional[dict]:
    """Return the parsed schema for a scope, fetching and caching if needed."""
    url = SCHEMA_URLS.get(scope)
    if not url:
        return None
    cache = _cache_path(data_dir, scope)
    if cache.exists():
        age = time.time() - cache.stat().st_mtime
        if age < CACHE_TTL_SECONDS:
            try:
                return json.loads(cache.read_text())
            except json.JSONDecodeError:
                pass
    schema = _fetch(url)
    if schema is None:
        if cache.exists():
            # Stale-but-OK fallback
            try:
                return json.loads(cache.read_text())
            except json.JSONDecodeError:
                return None
        return None
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(schema))
    return schema


def _resolve_ref(schema: dict, ref: str) -> Optional[dict]:
    """Resolve `#/definitions/Foo` style $refs against the root schema."""
    if not ref.startswith("#/"):
        return None
    parts = ref[2:].split("/")
    node: dict | list | None = schema
    for p in parts:
        if isinstance(node, dict):
            node = node.get(p)
        else:
            return None
    return node if isinstance(node, dict) else None


def build_description_map(schema: dict) -> dict[str, str]:
    """Return a dotted-path → description map by walking the schema.

    Follows $refs (up to a max depth) so e.g. `pages.order` works even if
    the root references definitions/IPagesBaseSettings.
    """
    if not isinstance(schema, dict):
        return {}

    result: dict[str, str] = {}
    seen: set[tuple[int, str]] = set()  # (id(node), path) cycle guard
    max_depth = 12

    def walk(node, path: str, depth: int):
        if depth > max_depth:
            return
        if not isinstance(node, dict):
            return
        key = (id(node), path)
        if key in seen:
            return
        seen.add(key)

        # Resolve $ref before reading other fields
        if "$ref" in node and isinstance(node["$ref"], str):
            resolved = _resolve_ref(schema, node["$ref"])
            if resolved is not None:
                walk(resolved, path, depth + 1)
                return

        if isinstance(node.get("description"), str) and path:
            existing = result.get(path)
            # Prefer non-empty descriptions, keep the first encountered
            if not existing:
                result[path] = node["description"].strip()

        # Walk properties
        props = node.get("properties")
        if isinstance(props, dict):
            for k, v in props.items():
                walk(v, f"{path}.{k}" if path else k, depth + 1)

        # Walk patternProperties (rare but exists)
        pp = node.get("patternProperties")
        if isinstance(pp, dict):
            for v in pp.values():
                walk(v, path, depth + 1)

        # Walk additionalProperties if dict
        ap = node.get("additionalProperties")
        if isinstance(ap, dict):
            walk(ap, path, depth + 1)

        # Walk items (for arrays)
        items = node.get("items")
        if isinstance(items, dict):
            walk(items, path, depth + 1)
        elif isinstance(items, list):
            for v in items:
                walk(v, path, depth + 1)

        # Walk allOf/oneOf/anyOf
        for combinator in ("allOf", "oneOf", "anyOf"):
            arr = node.get(combinator)
            if isinstance(arr, list):
                for v in arr:
                    walk(v, path, depth + 1)

    walk(schema, "", 0)
    return result


_MAP_CACHE: dict[tuple[Path, str], dict[str, str]] = {}


def get_descriptions(data_dir: Path, scope: str) -> dict[str, str]:
    """Memoized accessor for the description map of a given scope."""
    cache_key = (data_dir, scope)
    if cache_key in _MAP_CACHE:
        return _MAP_CACHE[cache_key]
    schema = load_schema(data_dir, scope)
    if not schema:
        _MAP_CACHE[cache_key] = {}
        return {}
    m = build_description_map(schema)
    _MAP_CACHE[cache_key] = m
    return m


def lookup(data_dir: Path, scope: str, key_path: str) -> Optional[str]:
    """Try to find a description for a settings-key by exact match or suffix."""
    m = get_descriptions(data_dir, scope)
    if not m:
        return None
    if key_path in m:
        return m[key_path]
    # The user's settings_keys may have paths like `pages.order` whereas the
    # schema uses `definitions.IPagesBaseSettings.properties.order`.
    # Try to match by the final segment cascading up.
    parts = key_path.split(".")
    while parts:
        suffix = ".".join(parts)
        for path, desc in m.items():
            if path.endswith("." + suffix) or path == suffix:
                return desc
        parts = parts[1:]
    return None
