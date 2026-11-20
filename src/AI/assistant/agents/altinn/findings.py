"""The errors that a check finds in an app, and which of them a change caused."""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(frozen=True)
class Finding:
    """One error that a check found.

    `location` is the name of the item that has the error, for example a text resource ID. It is not the
    position of the item, for example `resources.60`. The position changes when a change adds an item above
    it, and an error must be equal before and after the change.
    """

    rule: str
    location: str
    message: str

    def describe(self) -> str:
        return f"{self.location}: {self.message}" if self.location else self.message


@dataclass(frozen=True)
class FindingSplit:
    """The findings that a change caused, and the findings that were there before the change."""

    new: list[Finding]
    old: list[Finding]


def split_new_and_old(findings: Iterable[Finding], findings_before: Iterable[Finding]) -> FindingSplit:
    """Split the findings into new and old. A finding is old if the version before the change has it too.

    The comparison is a multiset comparison. Each finding before the change agrees with one finding after
    the change, so a second copy of an old error is new.
    """
    unmatched = Counter(findings_before)
    new: list[Finding] = []
    old: list[Finding] = []
    for finding in findings:
        if unmatched[finding] > 0:
            unmatched[finding] -= 1
            old.append(finding)
        else:
            new.append(finding)
    return FindingSplit(new=new, old=old)
