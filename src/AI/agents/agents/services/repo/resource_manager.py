from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def _parse_locale(path: str) -> Optional[str]:
    match = re.search(r"resource\.([a-z]{2})\.json$", path)
    if match:
        return match.group(1)
    return None


def _humanize_binding(binding: str) -> str:
    suffix = binding.split(".")[-1]
    token = suffix.replace("_", " ").replace("-", " ")
    token = re.sub(r"(?<!^)(?=[A-Z])", " ", token)
    token = " ".join(part for part in token.split() if part)
    if not token:
        return binding
    words = token.split()
    return " ".join(word.capitalize() for word in words)


def _collect_bindings_from_node(node: object, acc: Set[str]) -> None:
    if isinstance(node, dict):
        bindings = node.get("textResourceBindings")
        if isinstance(bindings, dict):
            for value in bindings.values():
                if isinstance(value, str) and value:
                    acc.add(value)
        for value in node.values():
            _collect_bindings_from_node(value, acc)
    elif isinstance(node, list):
        for item in node:
            _collect_bindings_from_node(item, acc)


def collect_text_resource_bindings(patch: Dict[str, object]) -> Set[str]:
    result: Set[str] = set()
    for change in patch.get("changes", []):
        if not isinstance(change, dict):
            continue
        file_path = change.get("file")
        if not isinstance(file_path, str) or "layouts" not in file_path:
            continue
        candidates: List[object] = []
        for key in ("item", "value", "component", "details", "content"):
            if key in change:
                candidates.append(change[key])
        if change.get("op") == "insert_json_property":
            maybe_value = change.get("value")
            if isinstance(maybe_value, dict):
                candidates.append(maybe_value)
        for candidate in candidates:
            _collect_bindings_from_node(candidate, result)
    return result


def load_resource_key_map(repo_path: str, resource_files: Optional[Iterable[str]] = None) -> Dict[str, Set[str]]:
    repo = Path(repo_path)
    file_list = list(resource_files) if resource_files is not None else []
    if not file_list:
        try:
            from .repo_discovery import discover_repository_context

            context = discover_repository_context(repo_path)
            file_list = context.resource_files
        except Exception as exc:
            log.warning("Failed to discover resource files: %s", exc)
            return {}
    key_map: Dict[str, Set[str]] = {}
    for relative_path in file_list:
        locale = _parse_locale(relative_path)
        if not locale:
            continue
        absolute_path = repo / relative_path
        if not absolute_path.exists():
            continue
        try:
            data = json.loads(absolute_path.read_text(encoding="utf-8"))
        except Exception as exc:
            log.warning("Cannot read resource file %s: %s", relative_path, exc)
            continue
        resources = data.get("resources")
        if not isinstance(resources, list):
            continue
        locale_keys = key_map.setdefault(locale, set())
        for item in resources:
            if isinstance(item, dict):
                resource_id = item.get("id")
                if isinstance(resource_id, str) and resource_id:
                    locale_keys.add(resource_id)
    return key_map


def _existing_and_pending_keys(patch: Dict[str, object], locales: Iterable[str], locale_to_file: Dict[str, str], repo_path: str) -> Dict[str, Set[str]]:
    key_map = {locale: set() for locale in locales}
    existing = load_resource_key_map(repo_path, locale_to_file.values())
    for locale, keys in existing.items():
        if locale in key_map:
            key_map[locale].update(keys)
    for change in patch.get("changes", []):
        if not isinstance(change, dict):
            continue
        file_path = change.get("file")
        if not isinstance(file_path, str):
            continue
        locale = _parse_locale(file_path)
        if not locale or locale not in key_map:
            continue
        op = change.get("op") or change.get("operation")
        if op not in {"insert_json_array_item", "add_resource"}:
            continue
        candidate = None
        for key in ("item", "value", "resource", "content", "details"):
            if key in change:
                candidate = change[key]
                break
        if isinstance(candidate, dict):
            resource_id = candidate.get("id") or candidate.get("resource_id")
            if isinstance(resource_id, str) and resource_id:
                key_map[locale].add(resource_id)
    return key_map


def _determine_locales(repo_path: str, resource_files: Optional[Iterable[str]], available_locales: Optional[Iterable[str]]) -> Tuple[List[str], Dict[str, str]]:
    file_list = list(resource_files) if resource_files is not None else []
    locale_to_file: Dict[str, str] = {}
    for path in file_list:
        locale = _parse_locale(path)
        if locale:
            locale_to_file[locale] = path
    locales: List[str]
    if available_locales:
        locales = [locale for locale in available_locales if locale in locale_to_file]
    else:
        locales = sorted(locale_to_file.keys())
    if not locales and not file_list:
        try:
            from .repo_discovery import discover_repository_context

            context = discover_repository_context(repo_path)
            for path in context.resource_files:
                locale = _parse_locale(path)
                if locale:
                    locale_to_file.setdefault(locale, path)
            locales = sorted(context.required_locales or context.available_locales)
        except Exception as exc:
            log.warning("Failed to determine locales: %s", exc)
            locales = []
    return locales, locale_to_file


def ensure_text_resources_in_patch(
    patch: Dict[str, object],
    repo_path: str,
    resource_files: Optional[Iterable[str]] = None,
    available_locales: Optional[Iterable[str]] = None,
) -> List[str]:
    locales, locale_to_file = _determine_locales(repo_path, resource_files, available_locales)
    if not locales or not locale_to_file:
        return []
    bindings = collect_text_resource_bindings(patch)
    if not bindings:
        return []
    key_map = _existing_and_pending_keys(patch, locales, locale_to_file, repo_path)
    added: List[str] = []
    patch.setdefault("files", [])
    patch.setdefault("changes", [])
    for binding in sorted(bindings):
        for locale in locales:
            keys_for_locale = key_map.get(locale)
            if keys_for_locale is None:
                continue
            if binding in keys_for_locale:
                continue
            resource_file = locale_to_file.get(locale)
            if not resource_file:
                continue
            new_item = {"id": binding, "value": _humanize_binding(binding)}
            change = {
                "file": resource_file,
                "op": "insert_json_array_item",
                "operation": "insert_json_array_item",
                "path": ["resources"],
                "item": new_item,
            }
            patch["changes"].append(change)
            if resource_file not in patch["files"]:
                patch["files"].append(resource_file)
            keys_for_locale.add(binding)
            added.append(f"{binding}@{locale}")
            log.info("Added missing text resource %s for locale %s", binding, locale)
    return added
