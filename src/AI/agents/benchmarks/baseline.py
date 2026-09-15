"""Which run is the baseline."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

POINTER = Path(__file__).parent / "BASELINE.json"


@dataclass(frozen=True)
class Pointer:
    check_id: str
    label: str
    recorded_at: str
    why: str
    axes: dict[str, str]

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, sort_keys=True) + "\n"


def read(*, path: Path | None = None) -> Pointer | None:
    target = path or POINTER
    if not target.exists():
        return None
    data = json.loads(target.read_text(encoding="utf-8"))
    return Pointer(
        check_id=data["check_id"],
        label=data.get("label", data["check_id"]),
        recorded_at=data.get("recorded_at", ""),
        why=data.get("why", ""),
        axes=data.get("axes", {}),
    )


def write(pointer: Pointer, *, path: Path | None = None) -> Path:
    target = path or POINTER
    target.write_text(pointer.to_json(), encoding="utf-8")
    return target


def from_run(run, why: str) -> Pointer:
    """A pointer to a run, carrying the axes it recorded so drift is detectable."""
    assert why.strip(), "a baseline records why it was adopted, so that is required"
    return Pointer(
        check_id=run.name,
        label=run.label,
        recorded_at=run.provenance.recorded_at,
        why=why.strip(),
        axes={k: _flat(v) for k, v in run.provenance.axes().items()},
    )


def _flat(value: object) -> str:
    if value is None:
        return "not recorded"
    if isinstance(value, dict):
        return ", ".join(f"{k} {v}" for k, v in sorted(value.items())) or "not recorded"
    return str(value)


def drifted(pointer: Pointer, run) -> tuple[str, ...]:
    """Axes where the committed pointer disagrees with the run Langfuse returns."""
    if not pointer.axes:
        return ()
    actual = {k: _flat(v) for k, v in run.provenance.axes().items()}
    return tuple(
        name
        for name, recorded in sorted(pointer.axes.items())
        if _comparable(name, actual.get(name, "")) != _comparable(name, recorded)
    )


def _comparable(axis: str, value: str) -> str:
    """The code axis carries a dirty flag that moves on its own; the rest do not."""
    return value.split()[0] if axis == "code" and value else value
