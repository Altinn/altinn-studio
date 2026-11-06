"""The access packages and roles that an app's authorization policy can name, read from Altinn Access Management.

These are the lists Studio's policy editor offers, from the URLs Designer reads (`PlatformSettings.AccessPackagesUrl`
and `PlatformSettings.RolesUrl` in `src/Designer/backend/src/Designer/appsettings.json`). Access Management changes them
without a release of this service, so they are read when a tool needs them and kept for an hour.

The parsers fail on a response they cannot read, rather than return a partial list that would make the model pick a
package or role that does not exist.
"""

from __future__ import annotations

import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx

ACCESS_PACKAGES_URL = "https://platform.altinn.no/accessmanagement/api/v1/meta/info/accesspackages/export"
ROLES_URL = "https://platform.altinn.no/accessmanagement/api/v1/meta/info/roles/"

ACCESS_PACKAGE_ATTRIBUTE = "urn:altinn:accesspackage"
ROLE_CODE_ATTRIBUTE = "urn:altinn:rolecode"
ALTINN2_PROVIDER = "sys-altinn2"

# Enhetsregisteret first, since those are the roles a service for organizations uses.
_PROVIDER_ORDER = {"sys-ccr": 0, "sys-altinn3": 1}
_MAX_ROWS = 100
_CACHE_TTL_SECONDS = 60 * 60
_FETCH_TIMEOUT_SECONDS = 20.0
_cache: dict[str, tuple[float, list[Any]]] = {}

# Most package descriptions end with this disclaimer, which says nothing about the package.
_DISCLAIMER = re.compile(r"^Ved (?:regelverksendringer|innføring|endrede).*endringer i tilganger", re.IGNORECASE)
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-ZÆØÅ])")
# Codes are ASCII, names are Norwegian. Folding both lets `regnskapsforer` find `Regnskapsfører`.
_ASCII_FOLD = str.maketrans({"æ": "ae", "ø": "o", "å": "a"})
# Sorts æ, ø and å after z, in that order.
_SORT_FOLD = str.maketrans({"æ": "{0", "ø": "{1", "å": "{2"})


class AccessManagementError(Exception):
    """Access Management did not answer, or answered with something this module cannot read."""


@dataclass(frozen=True)
class AccessPackage:
    code: str
    name: str
    description: str
    area: str
    group: str
    group_type: str
    usable_in_policy: bool


@dataclass(frozen=True)
class Role:
    code: str
    attribute: str
    name: str
    description: str
    provider_code: str
    provider_name: str
    usable_in_policy: bool


async def access_packages() -> list[AccessPackage]:
    return await _cached(ACCESS_PACKAGES_URL, parse_access_packages)


async def roles() -> list[Role]:
    return await _cached(ROLES_URL, parse_roles)


async def _cached[T](url: str, parse: Callable[[Any], list[T]]) -> list[T]:
    """Keeps only a list that parsed, so that one bad answer does not last for the whole hour."""
    now = time.monotonic()
    hit = _cache.get(url)
    if hit and now - hit[0] < _CACHE_TTL_SECONDS:
        return hit[1]
    parsed = parse(await _fetch_json(url))
    _cache[url] = (now, parsed)
    return parsed


async def _fetch_json(url: str) -> Any:
    try:
        async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AccessManagementError(f"{url} gave no list: {exc}") from exc


def parse_access_packages(data: Any) -> list[AccessPackage]:
    packages = [
        AccessPackage(
            code=_code(package, ACCESS_PACKAGE_ATTRIBUTE),
            name=_text(package, "name"),
            description=_short_description(package.get("description")),
            area=_text(area, "name"),
            group=_text(group, "name"),
            group_type=str(group.get("type") or ""),
            usable_in_policy=_flag(package, "isResourcePolicyAvailable"),
        )
        for group in _list(data, "access package groups")
        for area in group.get("areas") or []
        for package in area.get("packages") or []
    ]
    if not packages:
        raise AccessManagementError(f"{ACCESS_PACKAGES_URL} lists no access packages")
    return packages


def parse_roles(data: Any) -> list[Role]:
    parsed = []
    for role in _list(data, "roles"):
        attribute, _, code = (role.get("legacyUrn") or _text(role, "urn")).rpartition(":")
        provider = role.get("provider")
        if not isinstance(provider, dict) or not provider.get("code"):
            raise AccessManagementError(f"the role {role.get('urn')!r} has no provider")
        parsed.append(
            Role(
                code=code,
                attribute=attribute,
                name=_text(role, "name"),
                description=_squash(role.get("description")),
                provider_code=provider["code"],
                provider_name=str(provider.get("name") or provider["code"]),
                usable_in_policy=_flag(role, "isResourcePolicyAvailable"),
            )
        )
    if not parsed:
        raise AccessManagementError(f"{ROLES_URL} lists no roles")
    return parsed


def describe_access_packages(packages: list[AccessPackage], *, search: str | None, group: str | None) -> str:
    """The packages in one group or matching a search, or, with neither, the groups and areas to narrow by."""
    if group:
        in_group = [package for package in packages if _fold(package.group) == _fold(group)]
        if not in_group:
            raise ValueError(f"No group is called {group!r}. The groups are {_join(_groups(packages))}.")
        packages = in_group
    elif not _words(search):
        return _package_index(packages)
    matching = [
        package
        for package in packages
        if _matches(search, package.code, package.name, package.description, package.area, package.group)
    ]
    if not matching:
        return f"No access package matches {search!r}. Search with fewer or other words, or list a group."
    lines = [
        f'Put the code in a subject match with `AttributeId="{ACCESS_PACKAGE_ATTRIBUTE}"`. A package marked '
        "**Not for service owners** cannot be used in a policy, and Studio does not offer it.",
    ]
    for group_name in _groups(matching):
        rows = sorted(
            (package for package in matching if package.group == group_name),
            key=lambda package: (_sort_key(package.area), _sort_key(package.name)),
        )
        lines += ["", f"## {group_name}", "", "| Code | Name | Area | Description |", "|---|---|---|---|"]
        lines += [
            f"| `{package.code}` | {_cell(package.name)} | {_cell(package.area)} | "
            f"{'' if package.usable_in_policy else '**Not for service owners.** '}{_cell(package.description)} |"
            for package in rows
        ]
    return _capped(lines)


def describe_roles(all_roles: list[Role], *, search: str | None, altinn2: bool) -> str:
    """The roles Studio's policy editor offers, or the Altinn 2 roles a policy may still name."""
    if altinn2:
        selected = [role for role in all_roles if role.provider_code == ALTINN2_PROVIDER]
        intro = (
            "Altinn 2 roles stop giving access by 31 December 2026. In a policy they appear as "
            f'`AttributeId="{ROLE_CODE_ATTRIBUTE}"`, in any letter case.'
        )
    else:
        selected = [role for role in all_roles if role.usable_in_policy and role.provider_code != ALTINN2_PROVIDER]
        intro = (
            "The roles Studio's policy editor offers, without Altinn 2 roles. Put the code in a subject match with "
            f'`AttributeId="{ROLE_CODE_ATTRIBUTE}"`. A code with another AttributeId names it in brackets.'
        )
    matching = [
        role for role in selected if _matches(search, role.code, role.name, role.description, role.provider_name)
    ]
    if not matching:
        return f"No role matches {search!r}. Search with fewer or other words."
    lines = [intro]
    providers = sorted(
        {role.provider_code: role.provider_name for role in matching}.items(),
        key=lambda provider: (_PROVIDER_ORDER.get(provider[0], 99), provider[1]),
    )
    for provider_code, provider_name in providers:
        rows = sorted(
            (role for role in matching if role.provider_code == provider_code), key=lambda role: _sort_key(role.code)
        )
        lines += ["", f"## {provider_name}", "", "| Code | Name | Description |", "|---|---|---|"]
        for role in rows:
            code = f"`{role.code}`" if role.attribute == ROLE_CODE_ATTRIBUTE else f"`{role.code}` (`{role.attribute}`)"
            lines.append(f"| {code} | {_cell(role.name)} | {_cell(role.description)} |")
    return _capped(lines)


def _package_index(packages: list[AccessPackage]) -> str:
    lines = ["Access packages, by group and area. List one group, or search, to get the codes."]
    for group_name in _groups(packages):
        in_group = [package for package in packages if package.group == group_name]
        lines += ["", f"## {group_name} ({in_group[0].group_type.lower()})", ""]
        for area in sorted({package.area for package in in_group}, key=_sort_key):
            count = sum(package.area == area for package in in_group)
            lines.append(f"- {area}: {count} packages")
    return "\n".join(lines)


def _groups(items: list[AccessPackage]) -> list[str]:
    return list(dict.fromkeys(item.group for item in items))


def _capped(lines: list[str]) -> str:
    rows = [index for index, line in enumerate(lines) if line.startswith("| ") and not line.startswith("| Code ")]
    if len(rows) <= _MAX_ROWS:
        return "\n".join(lines)
    kept = lines[: rows[_MAX_ROWS - 1] + 1]
    return "\n".join([*kept, "", f"{len(rows) - _MAX_ROWS} more rows. Narrow the search, or list one group."])


def _matches(search: str | None, *fields: str) -> bool:
    text = _fold(" ".join(fields))
    return all(word in text for word in _words(search))


def _words(search: str | None) -> list[str]:
    return [_fold(word) for word in (search or "").split()]


def _fold(text: str) -> str:
    return text.casefold().translate(_ASCII_FOLD)


def _sort_key(text: str) -> str:
    return text.casefold().translate(_SORT_FOLD)


def _join(names: list[str]) -> str:
    return ", ".join(names[:-1]) + f" and {names[-1]}" if len(names) > 1 else "".join(names)


def _short_description(description: Any) -> str:
    sentences = [sentence for sentence in _SENTENCE_END.split(_squash(description)) if not _DISCLAIMER.match(sentence)]
    return sentences[0] if sentences else ""


def _squash(value: Any) -> str:
    """The text with each run of whitespace, line breaks too, as one space."""
    return " ".join(str(value or "").split())


def _cell(text: str) -> str:
    return text.replace("|", "\\|")


def _list(data: Any, what: str) -> list[dict[str, Any]]:
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        raise AccessManagementError(f"expected a list of {what}, got {type(data).__name__}")
    return data


def _text(item: dict[str, Any], key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise AccessManagementError(f"an entry has no {key!r}: {str(item)[:200]}")
    return _squash(value)


def _flag(item: dict[str, Any], key: str) -> bool:
    value = item.get(key)
    if not isinstance(value, bool):
        raise AccessManagementError(f"{item.get('urn')!r} has no {key!r}")
    return value


def _code(item: dict[str, Any], attribute: str) -> str:
    urn = _text(item, "urn")
    prefix, _, code = urn.rpartition(":")
    if prefix != attribute or not code:
        raise AccessManagementError(f"unexpected URN {urn!r}, expected {attribute}:<code>")
    return code
