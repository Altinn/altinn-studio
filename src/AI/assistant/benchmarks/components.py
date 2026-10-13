"""Which Altinn components the items exercise, and which nothing ever renders."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from benchmarks import registry

LAYOUT_SCHEMA_PATH = (
    Path(__file__).resolve().parents[3] / "common/ts/layout-contract/schemas/json/layout/layout.schema.v1.json"
)

# A component type in a layout, or a field type in an extracted spec.
_TYPE = re.compile(r'\\?"type\\?":\s*\\?"([A-Z][A-Za-z0-9]+)\\?"')

# Kinds whose runs load the result in a browser, so a runtime break is visible.
RENDERING_KINDS = ("e2e",)


@dataclass(frozen=True)
class Coverage:
    universe: tuple[str, ...]
    by_dataset: dict[str, tuple[str, ...]]
    unavailable: tuple[str, ...]

    @property
    def exercised(self) -> tuple[str, ...]:
        seen = {c for cs in self.by_dataset.values() for c in cs}
        return tuple(sorted(seen & set(self.universe)))

    @property
    def never_exercised(self) -> tuple[str, ...]:
        return tuple(c for c in self.universe if c not in self.exercised)

    @property
    def rendered(self) -> tuple[str, ...]:
        rendering = {e.name for e in registry.live() if e.kind in RENDERING_KINDS}
        seen = {c for name, cs in self.by_dataset.items() if name in rendering for c in cs}
        return tuple(sorted(seen & set(self.universe)))

    @property
    def replay_only(self) -> tuple[str, ...]:
        """Exercised, but never by a run that loads the page."""
        return tuple(c for c in self.exercised if c not in self.rendered)

    def summary(self) -> str:
        return (
            f"{len(self.exercised)}/{len(self.universe)} component types exercised, "
            f"{len(self.rendered)} of them by a run that renders"
        )


def universe() -> tuple[str, ...]:
    """Every component type the agent could emit, from the schemas in this repo."""
    if not LAYOUT_SCHEMA_PATH.is_file():
        return ()
    schema = json.loads(LAYOUT_SCHEMA_PATH.read_text(encoding="utf-8"))
    component_types = schema["definitions"]["AnyComponent"]["properties"]["type"]["enum"]
    return tuple(sorted(component_types))


def _in_file(path: Path) -> tuple[str, ...]:
    return tuple(sorted(set(_TYPE.findall(path.read_text(encoding="utf-8")))))


def collect() -> Coverage:
    """What the version-controlled items exercise, per dataset."""
    by_dataset: dict[str, tuple[str, ...]] = {}
    unavailable: list[str] = []
    for entry in registry.live():
        path = entry.path
        if path is None or not path.exists():
            unavailable.append(entry.name)
            continue
        by_dataset[entry.name] = _in_file(path)
    return Coverage(
        universe=universe(),
        by_dataset=by_dataset,
        unavailable=tuple(sorted(unavailable)),
    )


def render(coverage: Coverage) -> list[str]:
    """The lines `status` prints."""
    if not coverage.universe:
        return ["  component schemas not found, so coverage cannot be computed"]
    out = [f"  {coverage.summary()}"]
    if coverage.replay_only:
        out.append(f"  exercised but never rendered: {', '.join(coverage.replay_only)}")
        out.append("    a runtime break in these cannot show up, because no run loads the page")
    for name in coverage.unavailable:
        entry = registry.by_name(name)
        note = " and it is the only kind that renders" if entry.kind in RENDERING_KINDS else ""
        out.append(f"  {name} has no items in the repo{note}")
    if coverage.never_exercised:
        out.append(f"  never exercised: {len(coverage.never_exercised)} of {len(coverage.universe)}")
        out.append(f"    {', '.join(coverage.never_exercised)}")
    return out


def as_payload(coverage: Coverage) -> dict:
    return {
        "universe": len(coverage.universe),
        "exercised": list(coverage.exercised),
        "rendered": list(coverage.rendered),
        "replay_only": list(coverage.replay_only),
        "never_exercised": list(coverage.never_exercised),
        "datasets_without_items": list(coverage.unavailable),
    }


def _main() -> int:
    coverage = collect()
    print(json.dumps(as_payload(coverage), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
