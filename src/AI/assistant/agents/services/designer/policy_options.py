"""Read the access packages and roles that Studio's policy editor offers, from Designer."""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx

from shared.config import get_config
from shared.utils.ttl_cache import TtlCache

config = get_config()

_ACCESS_PACKAGES_PATH = "/designer/api/{org}/{app}/policy/accesspackageoptions"
_ROLES_PATH = "/designer/api/{org}/{app}/policy/subjectoptions"


def _designer_url(path: str, org: str, app: str) -> str:
    return config.DESIGNER_BASE_URL.rstrip("/") + path.format(org=org, app=app)


ACCESS_PACKAGE_ATTRIBUTE = "urn:altinn:accesspackage"
ROLE_CODE_ATTRIBUTE = "urn:altinn:rolecode"
ALTINN2_PROVIDER = "sys-altinn2"

_CACHE_TTL_SECONDS = 60 * 60
_FETCH_TIMEOUT_SECONDS = 20.0
# Enough of an entry to find it in Designer's response.
_ENTRY_EXCERPT_CHARS = 200
_cache: TtlCache[list[Any]] = TtlCache(_CACHE_TTL_SECONDS)

# Most package descriptions end with this disclaimer, which says nothing about the package.
_DISCLAIMER = re.compile(r"^Ved (?:regelverksendringer|innføring|endrede).*endringer i tilganger", re.IGNORECASE)
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-ZÆØÅ])")


class PolicyOptionsError(Exception):
    """Designer did not give the list, or gave something this module cannot read."""


@dataclass(frozen=True)
class AccessPackage:
    code: str
    name: str
    # Without the disclaimer, but otherwise whole, so that a search finds a word in any sentence.
    description: str
    area: str
    group: str
    group_type: str
    usable_in_policy: bool

    @property
    def summary(self) -> str:
        """The first sentence of the description, which says what the package covers."""
        return _SENTENCE_END.split(self.description, maxsplit=1)[0]


@dataclass(frozen=True)
class Role:
    code: str
    attribute: str
    name: str
    description: str
    provider_code: str
    provider_name: str

    @property
    def is_altinn2(self) -> bool:
        """An Altinn 2 role, which stops giving access by the end of 2026."""
        return self.provider_code == ALTINN2_PROVIDER


async def access_packages(org: str, app: str) -> list[AccessPackage]:
    return await _cached(_ACCESS_PACKAGES_PATH, org, app, _parse_access_packages)


async def roles(org: str, app: str) -> list[Role]:
    return await _cached(_ROLES_PATH, org, app, _parse_roles)


async def _cached[T](path: str, org: str, app: str, parse: Callable[[Any], list[T]]) -> list[T]:
    """Keeps only a list that parsed, so that one bad answer does not last for the whole hour."""
    cached = _cache.get(path)
    if cached is not None:
        return cached
    parsed = parse(await _fetch_json(_designer_url(path, org, app)))
    _cache.put(path, parsed)
    return parsed


async def _fetch_json(url: str) -> Any:
    try:
        async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PolicyOptionsError(f"{url} gave no list: {exc}") from exc


def _parse_access_packages(data: Any) -> list[AccessPackage]:
    packages = [
        AccessPackage(
            code=_split_urn(_required_text(package, "urn"), ACCESS_PACKAGE_ATTRIBUTE)[1],
            name=_required_text(package, "name"),
            description=_without_disclaimer(package.get("description")),
            area=_required_text(area, "name"),
            group=_required_text(group, "name"),
            group_type=_required_text(group, "type"),
            usable_in_policy=_required_flag(package, "isResourcePolicyAvailable"),
        )
        for group in _required_list(data, "access package groups")
        for area in _required_list(group.get("areas"), "areas")
        for package in _required_list(area.get("packages"), "access packages")
    ]
    if not packages:
        raise PolicyOptionsError("Designer lists no access packages")
    return packages


def _parse_roles(data: Any) -> list[Role]:
    parsed = []
    for role in _required_list(data, "roles"):
        # Studio's policy editor writes a role with its `legacyUrn`, or with its `urn` when it has none.
        attribute, code = _split_urn(role.get("legacyUrn") or _required_text(role, "urn"))
        provider = role.get("provider")
        if not isinstance(provider, dict) or not provider.get("code"):
            raise PolicyOptionsError(f"the role {role.get('urn')!r} has no provider")
        parsed.append(
            Role(
                code=code,
                attribute=attribute,
                name=_required_text(role, "name"),
                description=_squash(role.get("description")),
                provider_code=provider["code"],
                provider_name=str(provider.get("name") or provider["code"]),
            )
        )
    if not parsed:
        raise PolicyOptionsError("Designer lists no roles")
    return parsed


def _without_disclaimer(description: Any) -> str:
    sentences = _SENTENCE_END.split(_squash(description))
    return " ".join(sentence for sentence in sentences if not _DISCLAIMER.match(sentence))


def _squash(value: Any) -> str:
    """The text with each run of whitespace, line breaks too, as one space."""
    return " ".join(str(value or "").split())


def _split_urn(urn: Any, attribute: str | None = None) -> tuple[str, str]:
    """The AttributeId and the code of `urn:<attribute>:<code>`, split at the last colon as Studio's policy editor does.

    With `attribute`, the URN must have that AttributeId.
    """
    found, _, code = str(urn).rpartition(":")
    if not found.startswith("urn:") or not code or (attribute and found != attribute):
        raise PolicyOptionsError(f"unexpected URN {urn!r}, expected {attribute or 'urn:<attribute>'}:<code>")
    return found, code


def _required_list(data: Any, what: str) -> list[dict[str, Any]]:
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        raise PolicyOptionsError(f"expected a list of {what}, got {type(data).__name__}")
    return data


def _required_text(item: dict[str, Any], key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise PolicyOptionsError(f"an entry has no {key!r}: {str(item)[:_ENTRY_EXCERPT_CHARS]}")
    return _squash(value)


def _required_flag(item: dict[str, Any], key: str) -> bool:
    value = item.get(key)
    if not isinstance(value, bool):
        raise PolicyOptionsError(f"{item.get('urn')!r} has no {key!r}")
    return value
