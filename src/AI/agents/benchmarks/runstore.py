"""Runs on disk."""

from __future__ import annotations

import json
import re
import secrets
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from benchmarks.provenance import Provenance

RUNS_DIR = Path(__file__).parent / "runs"
NAME_PATTERN = re.compile(r"^[0-9]{8}T[0-9]{6}Z-[a-z0-9-]+$")


@dataclass(frozen=True)
class ItemResult:
    """One dataset item, as one run saw it."""

    item_id: str
    scores: dict[str, float]
    output: str | None = None
    label: str | None = None
    error: str | None = None
    comments: dict[str, str] = field(default_factory=dict)
    meta: dict[str, str] = field(default_factory=dict)
    input: str | None = None
    expected: str | None = None
    trace_id: str | None = None
    seconds: float | None = None

    @property
    def failed(self) -> bool:
        return self.error is not None

    def value(self, evaluator: str) -> float | None:
        """None means the evaluator did not apply to this item, not that it failed."""
        return self.scores.get(evaluator)

    def said(self, evaluator: str) -> str | None:
        return self.comments.get(evaluator)


@dataclass(frozen=True)
class BehaviorResult:
    """One behavior's score in one run, with the items behind it."""

    behavior: str
    evaluator: str
    score: float | None
    items: tuple[ItemResult, ...]
    skipped: str | None = None

    @property
    def item_count(self) -> int:
        return len(self.items)

    @property
    def scored_items(self) -> tuple[ItemResult, ...]:
        """The items the evaluator actually applied to, which is the real denominator."""
        return tuple(i for i in self.items if i.value(self.evaluator) is not None)

    @property
    def unscored_items(self) -> tuple[ItemResult, ...]:
        return tuple(i for i in self.items if i.value(self.evaluator) is None)

    @property
    def passed(self) -> tuple[ItemResult, ...]:
        return tuple(i for i in self.scored_items if (i.value(self.evaluator) or 0) >= 1.0)

    @property
    def failing(self) -> tuple[ItemResult, ...]:
        return tuple(i for i in self.scored_items if (i.value(self.evaluator) or 0) < 1.0)

    @property
    def granularity(self) -> float | None:
        """The smallest movement one item can cause. Above the noise floor, every
        flip reads as a regression."""
        scored = len(self.scored_items)
        return 1 / scored if scored else None

    def item(self, item_id: str) -> ItemResult | None:
        for result in self.items:
            if result.item_id == item_id:
                return result
        return None


@dataclass(frozen=True)
class Run:
    """Everything one invocation of the harness produced."""

    name: str
    label: str
    provenance: Provenance
    behaviors: tuple[BehaviorResult, ...]
    under_test: tuple[str, ...] = field(default_factory=tuple)
    duration_seconds: float | None = None
    judge_note: str | None = None

    def behavior(self, behavior_id: str) -> BehaviorResult | None:
        for result in self.behaviors:
            if result.behavior == behavior_id:
                return result
        return None

    @property
    def scored(self) -> tuple[BehaviorResult, ...]:
        return tuple(b for b in self.behaviors if b.score is not None)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "label": self.label,
            "provenance": self.provenance.to_dict(),
            "under_test": list(self.under_test),
            "duration_seconds": self.duration_seconds,
            "judge_note": self.judge_note,
            "behaviors": [
                {
                    **asdict(behavior),
                    "items": [asdict(item) for item in behavior.items],
                }
                for behavior in self.behaviors
            ],
        }

    @classmethod
    def from_dict(cls, data: dict) -> Run:
        return cls(
            name=data["name"],
            label=data["label"],
            provenance=Provenance.from_dict(data["provenance"]),
            under_test=tuple(data.get("under_test") or ()),
            duration_seconds=data.get("duration_seconds"),
            judge_note=data.get("judge_note"),
            behaviors=tuple(
                BehaviorResult(
                    behavior=b["behavior"],
                    evaluator=b["evaluator"],
                    score=b["score"],
                    skipped=b.get("skipped"),
                    items=tuple(ItemResult(**item) for item in b["items"]),
                )
                for b in data["behaviors"]
            ),
        )


def _pointer_for(directory: Path | None) -> Path:
    """A run directory carries its own pointer, so a test never reads the real one."""
    from benchmarks import baseline as pointer_file

    return pointer_file.POINTER if directory is None else directory / "BASELINE.json"


def new_name(label: str) -> str:
    """Unique by construction, so two runs cannot merge."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "run"
    return f"{stamp}-{slug}-{secrets.token_hex(2)}"


def save(run: Run, *, directory: Path | None = None, overwrite: bool = False) -> Path:
    """A saved run is evidence, so overwriting one is opt-in."""
    assert NAME_PATTERN.match(run.name), f"{run.name!r} is not a run name"
    target = (directory or RUNS_DIR)
    target.mkdir(parents=True, exist_ok=True)
    path = target / f"{run.name}.json"
    assert overwrite or not path.exists(), f"{path} already exists, so a run would be overwritten"
    path.write_text(
        json.dumps(run.to_dict(), indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return path


def attach_judge_note(run: Run, note: str | None, *, directory: Path | None = None) -> Run:
    """Keep the review beside the scores it reviewed, so a re-render keeps it."""
    import dataclasses

    if note is None:
        return run
    kept = dataclasses.replace(run, judge_note=note)
    save(kept, directory=directory, overwrite=True)
    return kept


def load(name: str, *, directory: Path | None = None) -> Run:
    path = (directory or RUNS_DIR) / f"{name}.json"
    return Run.from_dict(json.loads(path.read_text(encoding="utf-8")))


def all_runs(*, directory: Path | None = None) -> tuple[Run, ...]:
    """Newest first. The name sorts chronologically, so no file needs opening to order them."""
    target = directory or RUNS_DIR
    if not target.exists():
        return ()
    runs = []
    for path in sorted(target.glob("*.json"), reverse=True):
        try:
            runs.append(Run.from_dict(json.loads(path.read_text(encoding="utf-8"))))
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError):
            continue
    return tuple(runs)


def baseline(*, directory: Path | None = None, pointer: Path | None = None) -> Run | None:
    """The run the committed pointer names."""
    from benchmarks import baseline as pointer_file

    found = pointer_file.read(path=pointer or _pointer_for(directory))
    if found is None:
        return None
    target = directory or RUNS_DIR
    if (target / f"{found.check_id}.json").exists():
        return load(found.check_id, directory=target)
    try:
        from benchmarks import remote

        return remote.fetch(found.check_id)
    except Exception:  # noqa: BLE001
        return None


def previous(
    current: Run | None, *, directory: Path | None = None, pointer: Path | None = None
) -> Run | None:
    """The candidate before this one, from the local cache only."""
    from benchmarks import baseline as pointer_file

    found = pointer_file.read(path=pointer or _pointer_for(directory))
    excluded = {current.name if current else "", found.check_id if found else ""}
    for run in all_runs(directory=directory):
        if run.name not in excluded:
            return run
    return None


def incomplete(run: Run) -> tuple[str, ...]:
    """Pinned behaviors this run did not score."""
    from benchmarks import manifest

    missing = []
    for behavior in manifest.pinned():
        result = run.behavior(behavior.id)
        if result is None or result.score is None:
            missing.append(behavior.id)
    return tuple(missing)


def set_baseline(
    name: str,
    *,
    directory: Path | None = None,
    pointer: Path | None = None,
    why: str = "",
    force: bool = False,
) -> Path:
    """Adopt a run as the baseline by writing the committed pointer."""
    from benchmarks import baseline as pointer_file

    target = directory or RUNS_DIR
    if (target / f"{name}.json").exists():
        run = load(name, directory=target)
    else:
        from benchmarks import remote

        try:
            run = remote.fetch(name)
        except LookupError as missing:
            raise SystemExit(str(missing)) from missing

    holes = incomplete(run)
    if holes and not force:
        raise SystemExit(
            f"{name} did not score {len(holes)} pinned behavior(s), so it would be a "
            "baseline with holes and every later comparison would inherit them:\n  "
            + "\n  ".join(holes)
            + "\nRun a full check and adopt that, or pass --force if you mean it."
        )
    return pointer_file.write(
        pointer_file.from_run(run, why or "adopted as the baseline"),
        path=pointer or _pointer_for(directory),
    )


def series(
    *, directory: Path | None = None, pointer: Path | None = None
) -> tuple[Run | None, Run | None, Run | None]:
    """Baseline, previous candidate, current candidate."""
    local = all_runs(directory=directory)
    current = local[0] if local else None
    base = baseline(directory=directory, pointer=pointer)
    if current is None:
        return base, None, base
    if base and base.name == current.name:
        return base, None, base
    return base, previous(current, directory=directory, pointer=pointer), current
