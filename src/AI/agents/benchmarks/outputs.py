"""Comparing what the agent produced, without comparing how it worded it."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

IDENTIFIER_MAX_CHARS = 64

# Run metadata, not output.
IGNORED_KEYS = ("model",)


def _is_identifier(value: str) -> bool:
    return len(value) <= IDENTIFIER_MAX_CHARS and not any(c.isspace() for c in value)


def _walk(node: object, path: str, out: list[str]) -> None:
    if isinstance(node, dict):
        for key in sorted(node):
            if key in IGNORED_KEYS:
                continue
            _walk(node[key], f"{path}.{key}" if path else key, out)
        return
    if isinstance(node, list):
        for index, item in enumerate(node):
            _walk(item, f"{path}[{index}]", out)
        return
    if isinstance(node, str):
        out.append(f"{path}={node}" if _is_identifier(node) else f"{path}:text")
        return
    if isinstance(node, bool):
        out.append(f"{path}={str(node).lower()}")
        return
    if node is None:
        out.append(f"{path}=null")
        return
    # Numbers compared by type only.
    out.append(f"{path}:number")


_INDEX = re.compile(r"\[\d+\]")


def unindexed(entries: tuple[str, ...]) -> tuple[str, ...]:
    """The same signature with list positions dropped."""
    return tuple(sorted(_INDEX.sub("[]", entry) for entry in entries))


def signature(text: str | None) -> tuple[str, ...] | None:
    """The shape of an output, or None when it is not structured."""
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        return None
    if not isinstance(parsed, (dict, list)):
        return None
    out: list[str] = []
    _walk(parsed, "", out)
    return tuple(sorted(out))


@dataclass(frozen=True)
class Change:
    """What moved between two outputs, at the level of shape."""

    added: tuple[str, ...]
    removed: tuple[str, ...]
    reordered: bool
    comparable: bool

    @property
    def changed(self) -> bool | None:
        """True, False, or None when the outputs cannot be compared structurally."""
        if not self.comparable:
            return None
        return bool(self.added or self.removed or self.reordered)

    @property
    def substantive(self) -> bool:
        """A different thing appeared, as opposed to the same things rearranged."""
        return bool(self.added or self.removed)

    @property
    def summary(self) -> str:
        if not self.comparable:
            return "not structured, so a rewording cannot be told from a real change"
        parts = []
        if self.removed:
            parts.append(f"{len(self.removed)} gone")
        if self.added:
            parts.append(f"{len(self.added)} new")
        if not parts:
            if self.reordered:
                return "same fields, different order"
            return "same shape, wording may differ"
        if self.reordered:
            parts.append("and reordered")
        return ", ".join(parts)

    def paths(self, limit: int = 12) -> tuple[tuple[str, str], ...]:
        """The changed entries as (kind, entry), removals first, capped for a report."""
        rows = [("removed", entry) for entry in self.removed[:limit]]
        rows += [("added", entry) for entry in self.added[:limit]]
        return tuple(rows)


def compare(before: str | None, after: str | None) -> Change:
    left, right = signature(before), signature(after)
    if left is None or right is None:
        return Change(added=(), removed=(), reordered=False, comparable=False)
    left_flat, right_flat = set(unindexed(left)), set(unindexed(right))
    return Change(
        added=tuple(sorted(right_flat - left_flat)),
        removed=tuple(sorted(left_flat - right_flat)),
        reordered=left_flat == right_flat and set(left) != set(right),
        comparable=True,
    )
