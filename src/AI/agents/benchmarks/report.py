"""The report's data, assembled from the manifest and the run store."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from benchmarks import manifest
from benchmarks.diff import NOISE_FLOOR, Comparison, compare
from benchmarks.runstore import BehaviorResult, ItemResult, Run, load, series

VERDICT_WORDS = {
    "holding": "holding",
    "improved": "improved",
    "regressed": "regressed",
    "failing": "failing",
    "confirmed": "known defect, still held in place",
    "output-changed": "output changed, score did not",
    "unpinned": "not pinned",
    "not-run": "not run",
    "no-score": "ran but scored nothing",
    "new": "recorded, nothing to compare",
    "variance": "moved by one item on an unchanged model",
}
VERDICT_CLASS = {
    "holding": "hold",
    "improved": "hold",
    "regressed": "broken",
    "failing": "broken",
    "confirmed": "known",
    "output-changed": "moved",
    "variance": "moved",
    "unpinned": "unpinned",
    "not-run": "unknown",
    "no-score": "unknown",
    "new": "unknown",
}

PROMPT_PATH = Path(__file__).parent / "prompts" / "eval_report_judge.md"

# Above this multiple of the noise floor, one item swamps the measurement.
COARSE_MULTIPLE = 5

# Each reference is a full comparison, so the page pays for every one it offers.
MAX_OTHER_REFERENCES = 4


def judge_model() -> str:
    from shared.config import get_config

    return get_config().LLM_MODEL_EVAL_JUDGE


@dataclass(frozen=True)
class ItemRow:
    """One dataset item as the report shows it, whether or not there is a baseline."""

    item_id: str
    value: float | None
    before: float | None
    said: str | None
    sent: str | None
    answered: str | None
    expected: str | None
    label: str | None
    error: str | None
    siblings: tuple[tuple[str, float, str | None], ...]
    trace_url: str | None = None
    seconds: float | None = None
    silent: bool = False

    @property
    def applied(self) -> bool:
        """False means the evaluator does not apply to this item, not that it failed."""
        return self.value is not None

    @property
    def state(self) -> str:
        if self.error:
            return "error"
        if self.value is None:
            return "not-applicable"
        if self.value >= 1.0:
            return "pass"
        if self.value <= 0.0:
            return "fail"
        return "partial"


@dataclass(frozen=True)
class BehaviorView:
    """One behavior, as the report shows it: declaration, series, movement."""

    behavior: manifest.Behavior
    baseline: float | None
    previous: float | None
    current: float | None
    verdict: str
    items: tuple
    evidence: tuple[str, ...]
    model_changed: bool = True
    result: BehaviorResult | None = None
    baseline_result: BehaviorResult | None = None
    previous_result: BehaviorResult | None = None

    @property
    def item_count(self) -> int:
        """Every item the eval ran, applicable or not."""
        return len(self.result.items) if self.result else 0

    @property
    def scored_count(self) -> int:
        """The real denominator behind the score."""
        return len(self.result.scored_items) if self.result else 0

    @property
    def pass_count(self) -> int:
        return len(self.result.passed) if self.result else 0

    @property
    def fail_count(self) -> int:
        return len(self.result.failing) if self.result else 0

    @property
    def scale(self) -> str:
        """What the numbers actually are, rather than what the manifest claims."""
        return "mean" if self._partial_credit else self.behavior.metric

    @property
    def _partial_credit(self) -> bool:
        """A value strictly inside 0..1 proves partial credit. All-or-nothing values
        prove nothing, since a perfect ratio and a rate look identical."""
        if self.result is None:
            return False
        return any(
            0.0 < (i.value(self.result.evaluator) or 0) < 1.0 for i in self.result.scored_items
        )

    @property
    def misdeclared(self) -> bool:
        """Declared a rate, but an item took partial credit. The only direction the
        values can settle on their own."""
        return self._partial_credit and self.behavior.metric == "rate"

    @property
    def item_weight(self) -> float | None:
        """What one item is worth: the most a single item can move the score."""
        return self.result.granularity if self.result else None

    @property
    def floor_applies(self) -> bool:
        """Whether the noise floor can suppress anything at this dataset size."""
        step = self.item_weight
        if step is None:
            return False
        return self.scale != "rate" or step <= NOISE_FLOOR

    @property
    def coarse(self) -> bool:
        """One item moves this score by several times the noise floor."""
        step = self.item_weight
        return step is not None and step > NOISE_FLOOR * COARSE_MULTIPLE

    def sensitivity(self) -> str | None:
        """How finely this score can resolve, in the units it is made of."""
        step = self.item_weight
        if step is None:
            return None
        scored = self.scored_count
        multiple = step / NOISE_FLOOR
        floor = f"{multiple:.1f} times the {NOISE_FLOOR} noise floor"
        if self.scale == "rate":
            line = (
                f"Resolution: {scored} items each score 0 or 1, so this number can only "
                f"move in steps of {step:.3f}, which is {floor}."
            )
            if not self.floor_applies:
                absorbed = (
                    " A single item moving on a model that did not change is treated as "
                    "variance rather than a finding."
                    if step <= NOISE_FLOOR * COARSE_MULTIPLE
                    else " Every single item answering differently is reported as a change."
                )
                return f"{line} No smaller change exists.{absorbed}"
            return line
        return (
            f"Resolution: the mean of {scored} items, so any one of them moves this "
            f"number by at most {step:.3f}, and by less when it takes partial credit. "
            f"That ceiling is {floor}."
        )

    def breakdowns(self) -> tuple[Breakdown, ...]:
        """The score split by every dimension the items declare, widest gap first."""
        if self.result is None:
            return ()
        scored = self.result.scored_items
        if len(scored) < 2:
            return ()
        evaluator = self.result.evaluator
        facets: dict[str, list[tuple[str, float]]] = {}
        for item in scored:
            value = item.value(evaluator)
            if value is None:
                continue
            declared = {
                **{f"expects {k}": v for k, v in _flat_scalars(item.expected).items()},
                **{k: v for k, v in item.meta.items() if not k.startswith("observed_")},
            }
            for dimension, klass in declared.items():
                facets.setdefault(dimension, []).append((klass, value))

        found = []
        for dimension, pairs in facets.items():
            classes = {klass for klass, _ in pairs}
            if not 2 <= len(classes) <= _MAX_CLASSES:
                continue
            if len(pairs) < _MIN_COVERAGE * len(scored):
                continue
            splits = []
            for klass in sorted(classes):
                values = [v for k, v in pairs if k == klass]
                splits.append(
                    Split(
                        value=klass,
                        scored=len(values),
                        passed=sum(1 for v in values if v >= 1.0),
                        mean=sum(values) / len(values),
                    )
                )
            if any(split.scored < _MIN_PER_CLASS for split in splits):
                continue
            found.append(Breakdown(dimension=dimension, splits=tuple(splits)))
        return tuple(_deduplicated(sorted(found, key=lambda b: -b.spread)))

    def rows(self) -> tuple[ItemRow, ...]:
        """Per-item detail, from the run itself rather than from a comparison."""
        if self.result is None:
            return ()
        evaluator = self.result.evaluator
        moved = {i.item_id for i in self.items if getattr(i, "silent", False)}
        rows = []
        for item in self.result.items:
            was = self.baseline_result.item(item.item_id) if self.baseline_result else None
            rows.append(
                ItemRow(
                    item_id=item.item_id,
                    value=item.value(evaluator),
                    before=was.value(evaluator) if was else None,
                    said=item.said(evaluator),
                    sent=readable(item.input, unwrap=True),
                    answered=readable(item.output, unwrap=True),
                    expected=readable(item.expected),
                    label=item.label,
                    error=item.error,
                    siblings=_siblings(item, evaluator),
                    trace_url=trace_url(item.trace_id),
                    seconds=item.seconds,
                    silent=item.item_id in moved,
                )
            )
        return tuple(rows)

    @property
    def delta(self) -> float | None:
        if self.baseline is None or self.current is None:
            return None
        return self.current - self.baseline

    @property
    def prompt(self) -> str:
        return self.behavior.agent_prompt(self.evidence)

    @property
    def attributable(self) -> bool:
        """Whether movement here can be laid at the change under test."""
        return self.model_changed

    def scored_in(self, slot: str) -> int:
        """The denominator of that run, not of this one."""
        source = {
            "baseline": self.baseline_result,
            "previous": self.previous_result,
            "current": self.result,
        }.get(slot, self.result)
        return len(source.scored_items) if source else 0

    def reading(self, value: float | None, item_count: int, *, slot: str = "") -> str:
        """The plain reading of a score, because a bare number says nothing."""
        if value is None:
            if not self.behavior.is_pinned:
                return "nothing pins this"
            if slot == "previous":
                return "no earlier run"
            if slot == "baseline":
                return "no baseline yet"
            if self.verdict == "not-run":
                return "its eval was not run"
            if self.verdict == "no-score":
                return "ran, scored nothing"
            return "not measured"
        if item_count and self.scale == "rate":
            return f"{round(value * item_count)} of {item_count} pass"
        if item_count:
            at_full = self.pass_count if slot in ("", "current") else None
            tail = f", {at_full} of them at full marks" if at_full is not None else ""
            return f"mean of {item_count} items{tail}"
        return f"{value:.3f}"


@dataclass(frozen=True)
class Reference:
    """One run the current one can be read against, compared in Python."""

    name: str
    label: str
    recorded: str
    kind: str
    adopted: bool
    axes: dict[str, str]
    refused: tuple[str, ...]
    counts: dict[str, int]
    behaviors: dict[str, dict]
    components: dict[str, str]
    moved: tuple[str, ...]


@dataclass(frozen=True)
class Report:
    baseline: Run | None
    previous: Run | None
    current: Run
    comparison: Comparison | None
    behaviors: tuple[BehaviorView, ...]
    generated_at: str
    adopted: bool = True
    references: tuple[Reference, ...] = ()

    @property
    def is_refused(self) -> bool:
        return bool(self.comparison and self.comparison.is_refused)

    def of_component(self, component_id: str) -> tuple[BehaviorView, ...]:
        return tuple(v for v in self.behaviors if v.behavior.component == component_id)

    def counts(self) -> dict[str, int]:
        counts = {
            "holding": 0, "moved": 0, "failing": 0, "recorded": 0, "variance": 0,
            "confirmed": 0, "unpinned": 0, "not_run": 0, "no_score": 0,
        }
        for view in self.behaviors:
            if view.verdict == "variance":
                counts["variance"] += 1
            elif view.verdict in ("improved", "regressed", "output-changed"):
                counts["moved"] += 1
            elif view.verdict == "not-run":
                counts["not_run"] += 1
            elif view.verdict == "no-score":
                counts["no_score"] += 1
            elif view.verdict == "new":
                # Counting these as holding read a first run as all-clear.
                counts["recorded"] += 1
            elif view.verdict in counts:
                counts[view.verdict] += 1
        return counts

    def moved_in_this_run(self) -> frozenset[str]:
        """Behaviors whose score moved against the reference by more than noise."""
        return frozenset(
            v.behavior.id
            for v in self.behaviors
            if v.verdict in ("regressed", "improved")
        )

    def short_of_full_marks(self) -> tuple[BehaviorView, ...]:
        """Pinned behaviors not at 1.0, worst first."""
        scored = [v for v in self.behaviors if v.current is not None and v.current < 1.0]
        return tuple(sorted(scored, key=lambda v: (v.current, v.behavior.id)))

    def worst_verdict(self, component_id: str) -> str:
        rank = {
            "failing": 6, "no-score": 5, "regressed": 4, "output-changed": 3,
            "confirmed": 3, "improved": 2, "variance": 2, "unpinned": 1, "not-run": 1,
            "new": 0, "holding": 0,
        }
        views = self.of_component(component_id)
        if not views:
            return "holding"
        return max((v.verdict for v in views), key=lambda verdict: rank.get(verdict, 0))

    def open_work(self) -> tuple[BehaviorView, ...]:
        """Behaviors with something to do, worst first. What the prompts are for."""
        rank = {
            "failing": 0, "no-score": 1, "regressed": 2, "output-changed": 3,
            "confirmed": 4, "unpinned": 5,
        }
        return tuple(
            sorted(
                (v for v in self.behaviors if v.verdict in rank),
                key=lambda view: (rank[view.verdict], not view.attributable),
            )
        )

    def unattributable(self) -> tuple[BehaviorView, ...]:
        """Moved, but not by the change under test."""
        moved = ("regressed", "improved", "output-changed")
        return tuple(v for v in self.behaviors if v.verdict in moved and not v.attributable)


def _model_changed(behavior, baseline: Run | None, current: Run) -> bool:
    if baseline is None:
        return True
    role = manifest.component(behavior.component).role
    before, after = baseline.provenance.models, current.provenance.models
    if role == "mixed":
        return before != after
    return before.get(role) != after.get(role)


def _verdict_for(behavior, result, change) -> str:
    """Three things that all look like a missing score, kept apart on purpose."""
    if not behavior.is_pinned:
        return "unpinned"
    if result is None or (result.score is None and result.skipped):
        return "not-run"
    if result.score is None:
        return "no-score"
    if result.score == 0:
        # An item harvested to hold a defect scores 0 on purpose; that is evidence, not rot.
        return "confirmed" if result.only_declared_regressions_scored_zero else "failing"
    if change is None:
        return "new"
    return change.verdict


# These say which model produced the answer, not what it said.
_ENVELOPE_KEYS = ("model", "prompt_version", "role")

# The raw text duplicates a parsed payload, so it is dropped where one exists.
_PARSED_KEYS = ("verdict", "spec")

# The rendered prompt is long and derived, so the goal it was built from wins.
_RENDERED_FROM_GOAL = "user_message"

_READABLE_MAX_CHARS = 4000


def readable(payload: str | None, *, unwrap: bool = False) -> str | None:
    """One field's value as a person would read it, not as it travels."""
    if not payload:
        return None
    try:
        value = json.loads(payload)
    except (TypeError, ValueError):
        return payload[:_READABLE_MAX_CHARS]
    if unwrap:
        value = _unwrap(value)
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            return value[:_READABLE_MAX_CHARS]
    text = (
        value
        if isinstance(value, str)
        else json.dumps(value, ensure_ascii=False, indent=1, sort_keys=True)
    )
    return text[:_READABLE_MAX_CHARS]


def _unwrap(value: object) -> object:
    """What the model said, with the envelope around it removed."""
    if not isinstance(value, dict):
        return value
    carried = {
        k: v for k, v in value.items() if k not in _ENVELOPE_KEYS and v is not None
    }
    if any(key in carried for key in _PARSED_KEYS):
        carried.pop("text", None)
    if "goal" in carried:
        carried.pop(_RENDERED_FROM_GOAL, None)
    if len(carried) == 1:
        return next(iter(carried.values()))
    return carried or value


def trace_url(trace_id: str | None) -> str | None:
    """A link to the trace, or nothing rather than a link that goes nowhere."""
    if not trace_id:
        return None
    host = os.environ.get("LANGFUSE_HOST") or os.environ.get("LANGFUSE_BASE_URL") or ""
    host = host.rstrip("/")
    return f"{host}/trace/{trace_id}" if host else None


# Wider than this is an item id by another name, and tells a reader nothing.
_MAX_CLASSES = 4
_MIN_COVERAGE = 0.8

# A class of one item is that item, not a class.
_MIN_PER_CLASS = 2


@dataclass(frozen=True)
class Split:
    """One class of a dataset, scored on its own."""

    value: str
    scored: int
    passed: int
    mean: float

    @property
    def reading(self) -> str:
        return f"{self.passed} of {self.scored}"


@dataclass(frozen=True)
class Breakdown:
    """A mean split by a dimension the items already declare."""

    dimension: str
    splits: tuple[Split, ...]

    @property
    def weakest(self) -> Split:
        return min(self.splits, key=lambda s: s.mean)

    @property
    def spread(self) -> float:
        return max(s.mean for s in self.splits) - min(s.mean for s in self.splits)


def _deduplicated(found: list[Breakdown]) -> list[Breakdown]:
    """One split per shape. Some items declare the same class twice under two
    names, and showing both says it twice."""
    seen: set[tuple] = set()
    out = []
    for breakdown in found:
        shape = tuple((s.scored, round(s.mean, 6)) for s in breakdown.splits)
        if shape in seen:
            continue
        seen.add(shape)
        out.append(breakdown)
    return out


def _flat_scalars(payload: str | None) -> dict[str, str]:
    """Scalar leaves of a small JSON object, one level of nesting flattened."""
    if not payload:
        return {}
    try:
        value = json.loads(payload)
    except (TypeError, ValueError):
        return {}
    if not isinstance(value, dict):
        return {}
    out: dict[str, str] = {}
    for key, inner in value.items():
        if isinstance(inner, (bool, int, float, str)):
            out[key] = str(inner)
        elif isinstance(inner, dict):
            for sub, leaf in inner.items():
                if isinstance(leaf, (bool, int, float, str)):
                    out[f"{key}.{sub}"] = str(leaf)
    return out


def _siblings(
    item: ItemResult, evaluator: str
) -> tuple[tuple[str, float, str | None], ...]:
    """The other scores the same item received, which often explain the claimed one."""
    return tuple(
        (name, value, item.comments.get(name))
        for name, value in sorted(item.scores.items())
        if name != evaluator
    )


def _evidence_for(verdict: str, change) -> tuple[str, ...]:
    if verdict == "not-run":
        return ("this behavior's eval was not run, so nothing was measured",)
    if verdict == "no-score":
        return (
            "the eval ran and its evaluator emitted no score for this behavior, so the "
            "evaluator name is wrong or the evaluator is not registered",
        )
    if change is None:
        return ("no baseline on disk, so nothing has been compared yet",)
    return change.evidence()


def _variance_or_not(verdict: str, result, base_result) -> str:
    """One item flipping on an unchanged model is noise, unless the set is coarse."""
    if result is None or base_result is None:
        return verdict
    if result.score is None or base_result.score is None:
        return verdict
    step = result.granularity
    if step is None or step > NOISE_FLOOR * COARSE_MULTIPLE:
        return verdict
    return "variance" if abs(result.score - base_result.score) <= step + 1e-9 else verdict


def _references(
    current: Run,
    adopted: Run | None,
    previous: Run | None,
    *,
    directory: Path | None,
    pointer: Path | None,
) -> tuple[Reference, ...]:
    """Every run the page can be read against, newest first."""
    from benchmarks.runstore import all_runs

    others = [r for r in all_runs(directory=directory) if r.name != current.name]
    kinds = {}
    if adopted:
        kinds[adopted.name] = "baseline"
    prior = previous or next((r for r in others if r.name not in kinds), None)
    if prior and prior.name not in kinds:
        kinds[prior.name] = "previous"
    named = [r for r in others if r.name in kinds]
    recent = [r for r in others if r.name not in kinds][:MAX_OTHER_REFERENCES]
    chosen = sorted(named + recent, key=lambda r: r.name, reverse=True)
    built = []
    for run in chosen:
        one = build(
            current=current,
            directory=directory,
            pointer=pointer,
            baseline_run=run.name,
            with_references=False,
        )
        built.append(
            _as_reference(
                one,
                kinds.get(run.name, "other"),
                adopted=adopted is not None and run.name == adopted.name,
            )
        )
    return tuple(built)


def shape_of(item) -> dict | None:
    """What moved in one item's output, as paths rather than as two walls of JSON."""
    change = item.shape
    if change.changed is None:
        return {"comparable": False, "summary": change.summary, "rows": []}
    if not change.changed:
        return None
    return {
        "comparable": True,
        "summary": change.summary,
        "reordered": change.reordered,
        "removed": list(change.removed[:40]),
        "added": list(change.added[:40]),
        "total": len(change.removed) + len(change.added),
        "rows": [
            {"kind": kind, "path": path.split("=")[0].split(":")[0], "entry": path}
            for kind, path in change.paths(40)
        ],
    }


def _as_reference(built: Report, kind: str, *, adopted: bool) -> Reference:
    """A built comparison, reduced to what switching reference has to change."""
    reference = built.baseline
    assert reference is not None
    behaviors = {}
    for view in built.behaviors:
        shapes = {item.item_id: shape_of(item) for item in view.items}
        behaviors[view.behavior.id] = {
            "baseline": view.baseline,
            "delta": view.delta,
            "verdict": view.verdict,
            "verdict_word": VERDICT_WORDS.get(view.verdict, view.verdict),
            "verdict_class": VERDICT_CLASS.get(view.verdict, "unpinned"),
            "attributable": view.attributable,
            "evidence": list(view.evidence),
            "prompt": view.prompt,
            "reading": view.reading(
                view.baseline, view.scored_in("baseline"), slot="baseline"
            ),
            "items": {
                row.item_id: {
                    "before": row.before,
                    "shape": shapes.get(row.item_id),
                }
                for row in view.rows()
            },
        }
    return Reference(
        name=reference.name,
        label=reference.label,
        recorded=reference.provenance.recorded_at,
        kind=kind,
        adopted=adopted,
        axes={k: _flat_axis(v) for k, v in reference.provenance.axes().items()},
        refused=tuple(built.comparison.refused) if built.comparison else (),
        counts=built.counts(),
        behaviors=behaviors,
        components={c.id: built.worst_verdict(c.id) for c in manifest.COMPONENTS},
        moved=tuple(sorted(built.moved_in_this_run())),
    )


def _flat_axis(value: object) -> str:
    if isinstance(value, dict):
        return ", ".join(f"{k} {v}" for k, v in value.items()) if value else "not recorded"
    return str(value) if value not in (None, "") else "not recorded"


def build(
    *,
    current: Run | None = None,
    directory: Path | None = None,
    pointer: Path | None = None,
    baseline_run: str | None = None,
    with_references: bool = True,
) -> Report:
    """`baseline_run` compares against a named run, leaving the pointer alone."""
    baseline, previous, latest = series(directory=directory, pointer=pointer)
    current = current or latest
    assert current is not None, "no runs on disk, so there is nothing to report"
    if baseline_run:
        if baseline_run == current.name:
            raise SystemExit(f"{current.name} cannot be compared against itself")
        baseline = load(baseline_run, directory=directory)
        previous = None

    comparison = compare(baseline, current) if baseline else None
    views = []
    for behavior in manifest.BEHAVIORS:
        change = None
        if comparison:
            change = next((c for c in comparison.changes if c.behavior == behavior.id), None)
        result = current.behavior(behavior.id)
        base_result = baseline.behavior(behavior.id) if baseline else None
        prev_result = previous.behavior(behavior.id) if previous else None
        verdict = _verdict_for(behavior, result, change)
        model_changed = _model_changed(behavior, baseline, current)
        if verdict == "output-changed" and model_changed:
            verdict = "holding"
        if verdict in ("regressed", "improved") and not model_changed:
            verdict = _variance_or_not(verdict, result, base_result)
        views.append(
            BehaviorView(
                behavior=behavior,
                baseline=base_result.score if base_result else None,
                previous=prev_result.score if prev_result else None,
                current=result.score if result else None,
                verdict=verdict,
                items=change.items if change else (),
                result=result,
                baseline_result=base_result,
                previous_result=prev_result,
                evidence=_evidence_for(verdict, change)
                + (
                    ()
                    if model_changed
                    else (
                        f"the {manifest.component(behavior.component).role} model did not "
                        "change between these runs, so movement here is variance or a code "
                        "change, not evidence about a model",
                    )
                ),
                model_changed=model_changed,
            )
        )
    references: tuple[Reference, ...] = ()
    if with_references:
        references = _references(
            current, baseline, previous, directory=directory, pointer=pointer
        )

    return Report(
        references=references,
        adopted=not baseline_run,
        baseline=baseline,
        previous=previous,
        current=current,
        comparison=comparison,
        behaviors=tuple(views),
        generated_at=timestamp(),
    )


def judge_payload(report: Report) -> dict[str, Any]:
    """What the reviewing model is shown, blind spots included."""
    return {
        "noise_floor": NOISE_FLOOR,
        "runs": {
            "baseline": report.baseline.label if report.baseline else None,
            "previous": report.previous.label if report.previous else None,
            "current": report.current.label,
        },
        "under_test": list(report.current.under_test),
        "provenance": {
            "current": report.current.provenance.axes(),
            "baseline": report.baseline.provenance.axes() if report.baseline else None,
        },
        "refused_axes": list(report.comparison.refused) if report.comparison else [],
        "behaviors": [
            {
                "id": view.behavior.id,
                "text": view.behavior.text,
                "checks": view.behavior.checks,
                "cannot_see": view.behavior.blind,
                "measured_by": view.behavior.measured_by if view.behavior.is_pinned else None,
                "verdict": view.verdict,
                "baseline": view.baseline,
                "previous": view.previous,
                "current": view.current,
                "evidence": list(view.evidence),
            }
            for view in report.behaviors
        ],
    }


async def review(payload: dict[str, Any], model: str | None = None) -> str:
    """The reviewing model's write-up of the evidence above it."""
    from agents.core.messages import UserMessage

    from .generation import adapter_for

    adapter = adapter_for(model or judge_model(), max_tokens=4000)
    reply = await adapter.chat(
        messages=[UserMessage(content=json.dumps(payload, ensure_ascii=False, indent=2))],
        system_prompt=PROMPT_PATH.read_text(encoding="utf-8"),
        tool_schemas=[],
    )
    return "".join(block.text for block in reply.content if getattr(block, "text", None)).strip()


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
