"""What moved between runs."""

from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher

from benchmarks import manifest, outputs
from benchmarks.provenance import blocking_differences
from benchmarks.runstore import Run

# Observed run-to-run variance.
NOISE_FLOOR = 0.02

VERDICTS = (
    "holding",
    "improved",
    "regressed",
    "failing",
    "output-changed",
    "unpinned",
    "not-run",
    "no-score",
    "new",
)


@dataclass(frozen=True)
class ItemChange:
    item_id: str
    label: str | None
    before: float | None
    after: float | None
    output_before: str | None
    output_after: str | None

    @property
    def score_moved(self) -> bool:
        if self.before is None or self.after is None:
            return True
        return abs(self.after - self.before) > NOISE_FLOOR

    @property
    def shape(self) -> outputs.Change:
        return outputs.compare(self.output_before, self.output_after)

    @property
    def output_moved(self) -> bool:
        """The shape changed, not merely the wording."""
        return self.shape.substantive

    @property
    def silent(self) -> bool:
        """Shape changed and the score did not. The case a score cannot report."""
        return self.output_moved and not self.score_moved


@dataclass(frozen=True)
class BehaviorChange:
    behavior: str
    before: float | None
    after: float | None
    verdict: str
    items: tuple[ItemChange, ...]

    @property
    def delta(self) -> float | None:
        if self.before is None or self.after is None:
            return None
        return self.after - self.before

    @property
    def silent_items(self) -> tuple[ItemChange, ...]:
        return tuple(i for i in self.items if i.silent)

    def evidence(self) -> tuple[str, ...]:
        """The lines a prompt cites. Computed, never written by hand."""
        behavior = manifest.by_id(self.behavior)
        lines: list[str] = []
        if not behavior.is_pinned:
            lines.append("nothing pins this behavior, so no run has ever measured it")
            return tuple(lines)
        if self.before is None:
            lines.append(f"{behavior.evaluator} {self.after:.3f}, no baseline to compare against")
        elif self.delta is not None and abs(self.delta) > NOISE_FLOOR:
            lines.append(
                f"{behavior.evaluator} {self.before:.3f} to {self.after:.3f}, "
                f"a change of {self.delta:+.3f}"
            )
        else:
            lines.append(f"{behavior.evaluator} {self.after:.3f}, unchanged past the noise floor")
        if self.after == 0:
            lines.append("zero on every item, so a comparison between two models reports no change")
        moved = [i for i in self.items if i.score_moved and i.before is not None]
        for item in moved[:4]:
            lines.append(f"item {item.item_id} {item.before:.3f} to {item.after:.3f}")
        for item in self.silent_items[:2]:
            shape = item.shape
            lines.append(
                f"item {item.item_id} kept its score and changed shape: {shape.summary}"
            )
            for kind, entry in shape.paths(4):
                lines.append(f"  {kind}: {entry}")
        unstructured = [i for i in self.items if i.shape.changed is None]
        if unstructured and not self.silent_items:
            lines.append(
                f"{len(unstructured)} item(s) produce unstructured output, so a rewording "
                "cannot be told from a real change there"
            )
        return tuple(lines)


@dataclass(frozen=True)
class Comparison:
    baseline: Run
    candidate: Run
    changes: tuple[BehaviorChange, ...]
    refused: tuple[str, ...] = ()

    @property
    def is_refused(self) -> bool:
        return bool(self.refused)

    def by_verdict(self, verdict: str) -> tuple[BehaviorChange, ...]:
        return tuple(c for c in self.changes if c.verdict == verdict)

    def summary(self) -> dict[str, int]:
        return {verdict: len(self.by_verdict(verdict)) for verdict in VERDICTS}

    @property
    def silent_changes(self) -> tuple[BehaviorChange, ...]:
        return tuple(c for c in self.changes if c.silent_items)


def _verdict(before: float | None, after: float | None, items: tuple[ItemChange, ...]) -> str:
    if after is None:
        return "unpinned"
    if after == 0:
        return "failing"
    if before is None:
        return "new"
    delta = after - before
    if delta < -NOISE_FLOOR:
        return "regressed"
    if delta > NOISE_FLOOR:
        return "improved"
    if any(i.silent for i in items):
        return "output-changed"
    return "holding"


def _item_changes(baseline: Run, candidate: Run, behavior_id: str) -> tuple[ItemChange, ...]:
    before = baseline.behavior(behavior_id)
    after = candidate.behavior(behavior_id)
    if after is None:
        return ()
    changes = []
    for item in after.items:
        old = before.item(item.item_id) if before else None
        primary = next(iter(item.scores.values()), None) if item.scores else None
        old_primary = next(iter(old.scores.values()), None) if old and old.scores else None
        changes.append(
            ItemChange(
                item_id=item.item_id,
                label=item.label,
                before=old_primary,
                after=primary,
                output_before=old.output if old else None,
                output_after=item.output,
            )
        )
    return tuple(changes)


def compare(baseline: Run, candidate: Run) -> Comparison:
    """Baseline against candidate, refused when an undeclared axis moved."""
    refused = blocking_differences(baseline.provenance, candidate.provenance, candidate.under_test)
    changes = []
    for behavior in manifest.BEHAVIORS:
        before = baseline.behavior(behavior.id)
        after = candidate.behavior(behavior.id)
        items = _item_changes(baseline, candidate, behavior.id)
        changes.append(
            BehaviorChange(
                behavior=behavior.id,
                before=before.score if before else None,
                after=after.score if after else None,
                verdict=_verdict(before.score if before else None, after.score if after else None, items),
                items=items,
            )
        )
    return Comparison(
        baseline=baseline,
        candidate=candidate,
        changes=tuple(changes),
        refused=refused,
    )


def word_diff(before: str, after: str) -> tuple[tuple[str, str], ...]:
    """Token level diff, as (kind, text) pairs where kind is same, del or add."""
    left, right = before.split(), after.split()
    matcher = SequenceMatcher(None, left, right, autojunk=False)
    out: list[tuple[str, str]] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            out.append(("same", " ".join(left[i1:i2])))
        else:
            if i1 != i2:
                out.append(("del", " ".join(left[i1:i2])))
            if j1 != j2:
                out.append(("add", " ".join(right[j1:j2])))
    return tuple(pair for pair in out if pair[1])
