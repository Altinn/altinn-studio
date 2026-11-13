"""Read the access packages and roles that Studio's policy editor offers, from Designer.

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
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx

from shared.config import get_config

config = get_config()

ACCESS_PACKAGE_ATTRIBUTE = "urn:altinn:accesspackage"
ROLE_CODE_ATTRIBUTE = "urn:altinn:rolecode"

_CACHE_TTL_SECONDS = 60 * 60
_FETCH_TIMEOUT_SECONDS = 20.0
_cache: dict[str, tuple[float, list[Any]]] = {}

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


async def access_packages(org: str, app: str) -> list[AccessPackage]:
    return await _cached("accesspackageoptions", org, app, parse_access_packages)


async def roles(org: str, app: str) -> list[Role]:
    return await _cached("subjectoptions", org, app, parse_roles)


async def _cached[T](options: str, org: str, app: str, parse: Callable[[Any], list[T]]) -> list[T]:
    """Keeps only a list that parsed, so that one bad answer does not last for the whole hour."""
    now = time.monotonic()
    hit = _cache.get(options)
    if hit and now - hit[0] < _CACHE_TTL_SECONDS:
        return hit[1]
    url = f"{config.DESIGNER_BASE_URL.rstrip('/')}/designer/api/{org}/{app}/policy/{options}"
    parsed = parse(await _fetch_json(url))
    _cache[options] = (now, parsed)
    return parsed


async def _fetch_json(url: str) -> Any:
    try:
        async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PolicyOptionsError(f"{url} gave no list: {exc}") from exc


def parse_access_packages(data: Any) -> list[AccessPackage]:
    packages = [
        AccessPackage(
            code=_code(package, ACCESS_PACKAGE_ATTRIBUTE),
            name=_text(package, "name"),
            description=_without_disclaimer(package.get("description")),
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
        raise PolicyOptionsError("Designer lists no access packages")
    return packages


def parse_roles(data: Any) -> list[Role]:
    parsed = []
    for role in _list(data, "roles"):
        attribute, code = _role_attribute_and_code(role)
        provider = role.get("provider")
        if not isinstance(provider, dict) or not provider.get("code"):
            raise PolicyOptionsError(f"the role {role.get('urn')!r} has no provider")
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
        raise PolicyOptionsError("Designer lists no roles")
    return parsed


def _without_disclaimer(description: Any) -> str:
    sentences = _SENTENCE_END.split(_squash(description))
    return " ".join(sentence for sentence in sentences if not _DISCLAIMER.match(sentence))


def _squash(value: Any) -> str:
    """The text with each run of whitespace, line breaks too, as one space."""
    return " ".join(str(value or "").split())


def _list(data: Any, what: str) -> list[dict[str, Any]]:
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        raise PolicyOptionsError(f"expected a list of {what}, got {type(data).__name__}")
    return data


def _text(item: dict[str, Any], key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise PolicyOptionsError(f"an entry has no {key!r}: {str(item)[:200]}")
    return _squash(value)


def _flag(item: dict[str, Any], key: str) -> bool:
    value = item.get(key)
    if not isinstance(value, bool):
        raise PolicyOptionsError(f"{item.get('urn')!r} has no {key!r}")
    return value


def _role_attribute_and_code(role: dict[str, Any]) -> tuple[str, str]:
    """The AttributeId and the code of a role, from its `legacyUrn`, or from its `urn` when it has none.

    Studio's policy editor writes a role into the policy the same way.
    """
    urn = role.get("legacyUrn") or _text(role, "urn")
    attribute, _, code = str(urn).rpartition(":")
    if not attribute.startswith("urn:") or not code:
        raise PolicyOptionsError(f"unexpected role URN {urn!r}, expected urn:<attribute>:<code>")
    return attribute, code


def _code(item: dict[str, Any], attribute: str) -> str:
    urn = _text(item, "urn")
    prefix, _, code = urn.rpartition(":")
    if prefix != attribute or not code:
        raise PolicyOptionsError(f"unexpected URN {urn!r}, expected {attribute}:<code>")
    return code
