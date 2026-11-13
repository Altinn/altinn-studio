"""The access packages and roles that an app's authorization policy can name, as Studio's policy editor offers them.

Designer serves the editor's lists at `policy/accesspackageoptions` and `policy/subjectoptions`. It reads them from
Altinn Access Management in the environment that its `PlatformSettings` name, and keeps only the roles a policy can use.
Reading the lists from Designer gives the assistant the same lists as the editor. Access Management changes them without
a release of this service, so they are read when a tool needs them and kept for an hour.

The requests carry no API key. Designer refuses an API key on an action without `[AllowApiKey]`, and these two actions
answer without one. Designer ignores the org and the app in their path, so one copy of each list serves every app.

The parsers fail on a response they cannot read, rather than return a partial list that would make the model pick a
package or role that does not exist.
"""

from __future__ import annotations

import re
import time
from collections import Counter
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from operator import attrgetter
from typing import Any
from urllib.parse import quote

import httpx

from shared.config import get_config

config = get_config()

ACCESS_PACKAGE_OPTIONS = "accesspackageoptions"
SUBJECT_OPTIONS = "subjectoptions"

ACCESS_PACKAGE_ATTRIBUTE = "urn:altinn:accesspackage"
ROLE_CODE_ATTRIBUTE = "urn:altinn:rolecode"
ALTINN2_PROVIDER = "sys-altinn2"

# Enhetsregisteret first, since those are the roles a service for organizations uses.
_PROVIDER_ORDER = {"sys-ccr": 0, "sys-altinn3": 1}
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
    """Designer did not give the list, or gave something this module cannot read."""


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


async def access_packages(org: str, app: str) -> list[AccessPackage]:
    return await _cached(ACCESS_PACKAGE_OPTIONS, org, app, parse_access_packages)


async def roles(org: str, app: str) -> list[Role]:
    return await _cached(SUBJECT_OPTIONS, org, app, parse_roles)


async def _cached[T](options: str, org: str, app: str, parse: Callable[[Any], list[T]]) -> list[T]:
    """Keeps only a list that parsed, so that one bad answer does not last for the whole hour."""
    now = time.monotonic()
    hit = _cache.get(options)
    if hit and now - hit[0] < _CACHE_TTL_SECONDS:
        return hit[1]
    parsed = parse(await _fetch_json(options_url(org, app, options)))
    _cache[options] = (now, parsed)
    return parsed


def options_url(org: str, app: str, options: str) -> str:
    base = config.DESIGNER_BASE_URL.rstrip("/")
    return f"{base}/designer/api/{quote(org, safe='')}/{quote(app, safe='')}/policy/{options}"


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
        for area in _list(group.get("areas"), "areas")
        for package in _list(area.get("packages"), "access packages")
    ]
    if not packages:
        raise AccessManagementError("Designer lists no access packages")
    return packages


def parse_roles(data: Any) -> list[Role]:
    parsed = []
    for role in _list(data, "roles"):
        attribute, code = _role_attribute_and_code(role)
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
            )
        )
    if not parsed:
        raise AccessManagementError("Designer lists no roles")
    return parsed


def describe_access_packages(
    packages: list[AccessPackage], *, search: str | None, group: str | None, max_chars: int
) -> str:
    """The packages in one group or matching a search, or, with neither, the groups and areas to narrow by."""
    words = _words(search)
    if group:
        in_group = [package for package in packages if _fold(package.group) == _fold(group)]
        if not in_group:
            groups = list(_group_by(packages, attrgetter("group")))
            raise ValueError(f"No group is called {group!r}. The groups are {_join(groups)}.")
        packages = in_group
    elif not words:
        return _package_index(packages)
    matching = [
        package
        for package in packages
        if _matches(words, package.code, package.name, package.description, package.area, package.group)
    ]
    if not matching:
        return f"No access package matches {search!r}. Search with fewer or other words, or list a group."
    intro = (
        f'Put the code in a subject match with `AttributeId="{ACCESS_PACKAGE_ATTRIBUTE}"`. A package marked '
        "**Not for service owners** cannot be used in a policy, and Studio does not offer it."
    )
    sections = [
        (
            group_name,
            [
                f"| `{package.code}` | {_cell(package.name)} | {_cell(package.area)} | "
                f"{'' if package.usable_in_policy else '**Not for service owners.** '}{_cell(package.description)} |"
                for package in sorted(in_group, key=lambda package: (_sort_key(package.area), _sort_key(package.name)))
            ],
        )
        for group_name, in_group in _group_by(matching, attrgetter("group")).items()
    ]
    return _tables(intro, ("Code", "Name", "Area", "Description"), sections, max_chars=max_chars)


def describe_roles(all_roles: list[Role], *, search: str | None, altinn2: bool, max_chars: int) -> str:
    """The roles Studio's policy editor offers, or the Altinn 2 roles a policy may still name."""
    words = _words(search)
    if altinn2:
        selected = [role for role in all_roles if role.provider_code == ALTINN2_PROVIDER]
        intro = (
            "Altinn 2 roles stop giving access by 31 December 2026. In a policy they appear as "
            f'`AttributeId="{ROLE_CODE_ATTRIBUTE}"`, in any letter case.'
        )
    else:
        selected = [role for role in all_roles if role.provider_code != ALTINN2_PROVIDER]
        intro = (
            "The roles Studio's policy editor offers, without Altinn 2 roles. Put the code in a subject match with "
            f'`AttributeId="{ROLE_CODE_ATTRIBUTE}"`. A code with another AttributeId names it in brackets.'
        )
    matching = [
        role for role in selected if _matches(words, role.code, role.name, role.description, role.provider_name)
    ]
    if not matching:
        return f"No role matches {search!r}. Search with fewer or other words."
    providers = sorted(
        _group_by(matching, attrgetter("provider_code")).values(),
        key=lambda rows: (_PROVIDER_ORDER.get(rows[0].provider_code, 99), rows[0].provider_name),
    )
    sections = [
        (rows[0].provider_name, [_role_row(role) for role in sorted(rows, key=lambda role: _sort_key(role.code))])
        for rows in providers
    ]
    return _tables(intro, ("Code", "Name", "Description"), sections, max_chars=max_chars)


def _role_row(role: Role) -> str:
    code = f"`{role.code}`" if role.attribute == ROLE_CODE_ATTRIBUTE else f"`{role.code}` (`{role.attribute}`)"
    return f"| {code} | {_cell(role.name)} | {_cell(role.description)} |"


def _package_index(packages: list[AccessPackage]) -> str:
    lines = ["Access packages, by group and area. List one group, or search, to get the codes."]
    for group_name, in_group in _group_by(packages, attrgetter("group")).items():
        lines += ["", f"## {group_name} ({in_group[0].group_type.lower()})", ""]
        counts = Counter(package.area for package in in_group)
        lines += [f"- {area}: {counts[area]} packages" for area in sorted(counts, key=_sort_key)]
    return "\n".join(lines)


def _group_by[T](items: Iterable[T], key: Callable[[T], str]) -> dict[str, list[T]]:
    """The items by key, with the keys in the order they first appear."""
    groups: dict[str, list[T]] = {}
    for item in items:
        groups.setdefault(key(item), []).append(item)
    return groups


def _tables(intro: str, columns: tuple[str, ...], sections: list[tuple[str, list[str]]], *, max_chars: int) -> str:
    """`intro`, then a heading and a table for each section, cut after the last row that fits in `max_chars`."""
    lines = [intro]
    size = len(intro)
    left = sum(len(rows) for _, rows in sections)
    for heading, rows in sections:
        start = ["", f"## {heading}", "", f"| {' | '.join(columns)} |", "|" + "---|" * len(columns)]
        for row in rows:
            added = [*start, row]
            size += sum(len(line) + 1 for line in added)
            if size > max_chars:
                return "\n".join([*lines, "", f"{left} more rows. Narrow the search, or list one group."])
            lines += added
            left -= 1
            start = []
    return "\n".join(lines)


def _matches(words: list[str], *fields: str) -> bool:
    text = _fold(" ".join(fields))
    return all(word in text for word in words)


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


def _role_attribute_and_code(role: dict[str, Any]) -> tuple[str, str]:
    """The AttributeId and the code of a role, from its `legacyUrn`, or from its `urn` when it has none."""
    urn = role.get("legacyUrn") or _text(role, "urn")
    attribute, _, code = str(urn).rpartition(":")
    if not attribute.startswith("urn:") or not code:
        raise AccessManagementError(f"unexpected role URN {urn!r}, expected urn:<attribute>:<code>")
    return attribute, code


def _code(item: dict[str, Any], attribute: str) -> str:
    urn = _text(item, "urn")
    prefix, _, code = urn.rpartition(":")
    if prefix != attribute or not code:
        raise AccessManagementError(f"unexpected URN {urn!r}, expected {attribute}:<code>")
    return code
