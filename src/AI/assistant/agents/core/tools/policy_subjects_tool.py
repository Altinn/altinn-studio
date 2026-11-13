"""`altinn_policy_subjects` — the access packages and roles a policy can name, as Studio's policy editor offers them.

The studio-policy skill says what the lists are and where they live, without naming this tool.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Iterable
from operator import attrgetter
from typing import Literal

from pydantic import BaseModel, Field

from agents.core.tool import LoopContext, Tool, ToolResult
from agents.services.designer import policy_options
from agents.services.designer.policy_options import (
    ACCESS_PACKAGE_ATTRIBUTE,
    ROLE_CODE_ATTRIBUTE,
    AccessPackage,
    PolicyOptionsError,
    Role,
)

from .utils.text_parts import part_chars

_PACKAGES_SOURCE = {
    "title": "Tilgangspakker fra Altinn Autorisasjon",
    "url": "https://docs.altinn.studio/nb/authorization/what-do-you-get/accesspackages/",
    "kind": "docs",
}
# The concept page has a section on roles. The access package page only mentions them.
_ROLES_SOURCE = {
    "title": "Roller fra Altinn Autorisasjon",
    "url": "https://docs.altinn.studio/nb/authorization/about/detailed/",
    "kind": "docs",
}

ALTINN2_PROVIDER = "sys-altinn2"
# Enhetsregisteret first, since those are the roles a service for organizations uses.
_PROVIDER_ORDER = {"sys-ccr": 0, "sys-altinn3": 1}
# Codes are ASCII, names are Norwegian. Folding both lets `regnskapsforer` find `Regnskapsfører`.
_ASCII_FOLD = str.maketrans({"æ": "ae", "ø": "o", "å": "a"})
# Sorts æ, ø and å after z, in that order.
_SORT_FOLD = str.maketrans({"æ": "{0", "ø": "{1", "å": "{2"})


class PolicySubjectsArgs(BaseModel):
    kind: Literal["access_packages", "roles", "altinn2_roles"] = Field(
        default="access_packages",
        description=(
            "`access_packages`; `roles`, the roles Studio's policy editor offers apart from Altinn 2 roles, such as "
            "`dagl` and `priv`; or `altinn2_roles`, the Altinn 2 roles it offers, which stop giving access at the end "
            "of 2026."
        ),
    )
    search: str | None = Field(
        default=None,
        description=(
            "Return only entries whose code, name, description or area contains every word, ignoring case. The "
            "lists are in Norwegian bokmål, so search with one or two Norwegian words, such as `regnskap` or `lønn`."
        ),
    )
    group: str | None = Field(
        default=None,
        description=(
            "Access packages only: list one group: `Allment`, `Bransje`, `Særskilt`, `Innbygger` or `Vergemål`."
        ),
    )


class PolicySubjectsTool(Tool[PolicySubjectsArgs]):
    """Access packages and roles for `App/config/authorization/policy.xml`."""

    name = "altinn_policy_subjects"
    description = (
        "Look up the access packages and roles an app's authorization policy can name: the lists Studio's policy "
        "editor offers, with each code, name and description. Use it before you add a package or role to the "
        "policy, and to explain one the policy already has.  For access packages, give `group` or `search`. "
        "Without them you get the groups and areas to choose from."
    )
    input_schema = PolicySubjectsArgs
    is_concurrency_safe = True

    async def run(self, args: PolicySubjectsArgs, ctx: LoopContext) -> ToolResult:
        org, app = ctx.repo_owner, ctx.extras.get("app_name")
        if not org or not app:
            return ToolResult(
                content="Looking up access packages and roles needs the app's org and name, which this session lacks.",
                is_error=True,
            )
        max_chars = part_chars(ctx)
        try:
            if args.kind == "access_packages":
                content = describe_access_packages(
                    await policy_options.access_packages(org, app),
                    search=args.search,
                    group=args.group,
                    max_chars=max_chars,
                )
                source = _PACKAGES_SOURCE
            else:
                content = describe_roles(
                    await policy_options.roles(org, app),
                    search=args.search,
                    altinn2=args.kind == "altinn2_roles",
                    max_chars=max_chars,
                )
                source = _ROLES_SOURCE
        except PolicyOptionsError as exc:
            return ToolResult(
                content=(
                    f"Could not read the list from Designer: {exc}. Tell the user. Do not write a package or role "
                    "code into the policy that you have not seen in the list."
                ),
                is_error=True,
            )
        except UnknownGroupError as exc:
            return ToolResult(content=str(exc), is_error=True)
        # A copy, so that no session can change the dict that every session shares.
        return ToolResult(content=content, metadata={"source": dict(source)})


class UnknownGroupError(Exception):
    """The model asked for an access package group that does not exist."""


def describe_access_packages(
    packages: list[AccessPackage], *, search: str | None, group: str | None, max_chars: int
) -> str:
    """The packages in one group or matching a search, or, with neither, the groups and areas to narrow by."""
    words = _words(search)
    if group:
        in_group = [package for package in packages if _fold(package.group) == _fold(group)]
        if not in_group:
            groups = list(_group_by(packages, attrgetter("group")))
            raise UnknownGroupError(f"No group is called {group!r}. The groups are {_join(groups)}.")
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
        (group_name, [_package_row(package) for package in sorted(rows, key=_area_and_name)])
        for group_name, rows in _group_by(matching, attrgetter("group")).items()
    ]
    if not group:
        narrow = "Narrow the search, or add a group."
    elif words:
        narrow = "Narrow the search."
    else:
        narrow = "Add a search to narrow the group."
    return _tables(intro, ("Code", "Name", "Area", "Description"), sections, narrow=narrow, max_chars=max_chars)


def describe_roles(all_roles: list[Role], *, search: str | None, altinn2: bool, max_chars: int) -> str:
    """The roles Studio's policy editor offers, or the Altinn 2 roles a policy may still name."""
    words = _words(search)
    # Remove `altinn2_roles` on 1 January 2027, together with the skill's references/altinn2-roles.md.
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
    if not selected:
        return (
            "Designer lists no Altinn 2 roles any more, so a policy cannot use them. Use an access package instead."
            if altinn2
            else "Designer lists no roles apart from Altinn 2 roles."
        )
    matching = [
        role for role in selected if _matches(words, role.code, role.name, role.description, role.provider_name)
    ]
    if not matching:
        return f"No role matches {search!r}. Search with fewer or other words."
    matching.sort(
        key=lambda role: (_PROVIDER_ORDER.get(role.provider_code, 99), role.provider_name, _sort_key(role.code))
    )
    sections = [
        (provider_name, [_role_row(role) for role in rows])
        for provider_name, rows in _group_by(matching, attrgetter("provider_name")).items()
    ]
    narrow = "Narrow the search." if words else "Add a search to narrow the list."
    return _tables(intro, ("Code", "Name", "Description"), sections, narrow=narrow, max_chars=max_chars)


def _package_row(package: AccessPackage) -> str:
    description = ("" if package.usable_in_policy else "**Not for service owners.** ") + _cell(package.summary)
    return f"| `{package.code}` | {_cell(package.name)} | {_cell(package.area)} | {description} |"


def _area_and_name(package: AccessPackage) -> tuple[str, str]:
    return _sort_key(package.area), _sort_key(package.name)


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


def _tables(
    intro: str, columns: tuple[str, ...], sections: list[tuple[str, list[str]]], *, narrow: str, max_chars: int
) -> str:
    """`intro`, then a heading and a table for each section, cut after the last row that fits in `max_chars`.

    A cut list ends with `narrow`, which tells the model how to get the rest, since the tool cannot return it in parts.
    """
    lines = [intro]
    size = len(intro)
    left = sum(len(rows) for _, rows in sections)
    for heading, rows in sections:
        start = ["", f"## {heading}", "", f"| {' | '.join(columns)} |", "|" + "---|" * len(columns)]
        for row in rows:
            added = [*start, row]
            size += sum(len(line) + 1 for line in added)
            if size > max_chars:
                return "\n".join([*lines, "", f"{left} more rows. {narrow}"])
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


def _cell(text: str) -> str:
    return text.replace("|", "\\|")
