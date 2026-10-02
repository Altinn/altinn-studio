"""The catalog of public interfaces exposed by the Altinn.App libraries.

The catalog ships with the image as `data/interface_catalog.json`, generated from
the library's committed public-API snapshots by
`backend/scripts/generate_interface_catalog.py`. It is the "what exists" half of
the interface view; the scanner supplies the "who uses it" half.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

CATALOG_PATH = Path(__file__).parent / "data" / "interface_catalog.json"


@lru_cache(maxsize=1)
def load_catalog() -> dict:
    """Return the catalog, or an empty one if it is missing or unreadable."""
    try:
        data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"generated_at": "", "source": {}, "interfaces": []}
    if not isinstance(data, dict) or not isinstance(data.get("interfaces"), list):
        return {"generated_at": "", "source": {}, "interfaces": []}
    return data


@lru_cache(maxsize=1)
def base_class_map() -> dict[str, tuple[str, ...]]:
    """Library base classes mapped to the interfaces they implement for an app.

    An app that extends `GenericFormDataValidator<T>` implements `IFormDataValidator`
    just as surely as one that names the interface, and both must count.
    """
    raw = load_catalog().get("base_classes", {})
    if not isinstance(raw, dict):
        return {}
    return {
        name: tuple(ifaces)
        for name, ifaces in raw.items()
        if isinstance(ifaces, list) and ifaces
    }


@lru_cache(maxsize=1)
def catalog_names() -> frozenset[str]:
    """Names of every public interface in the library."""
    return frozenset(i["name"] for i in load_catalog()["interfaces"] if i.get("name"))


def catalog_meta() -> dict:
    """Provenance of the catalog, for display next to the numbers it explains."""
    catalog = load_catalog()
    source = catalog.get("source", {}) or {}
    return {
        "generated_at": catalog.get("generated_at", ""),
        "lib_version": source.get("lib_version", ""),
        "commit": source.get("commit", ""),
        "interface_count": len(catalog.get("interfaces", [])),
        "base_class_count": len(catalog.get("base_classes", {}) or {}),
    }
