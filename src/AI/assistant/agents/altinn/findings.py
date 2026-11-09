"""The errors a check finds in an app, and which of them a change caused."""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(frozen=True)
class Finding:
    """One error that a check found.

    `location` names the thing with the error, such as a text resource ID, and never its position,
    such as `resources.60`. Positions shift when a change adds something above, and the same error must
    compare equal before and after the change.
    """

    rule: str
    location: str
    message: str

    def describe(self) -> str:
        return f"{self.location}: {self.message}" if self.location else self.message


@dataclass(frozen=True)
class FindingSplit:
    """The findings a change caused, and the ones that were there before it."""

    new: list[Finding]
    old: list[Finding]


def split_new_and_old(findings: Iterable[Finding], findings_before: Iterable[Finding]) -> FindingSplit:
    """Split the findings by whether the version before the change has them too.

    The two are compared as multisets: each finding before the change matches one finding after it, so a
    second copy of an old error is new.
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
