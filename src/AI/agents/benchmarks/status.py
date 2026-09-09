"""What evals exist, what state they are in, and what is missing."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from . import manifest, registry
from .lf_api import LangfuseApi
from .remote import _since

EXPERIMENT_LABEL = "experiment"


@dataclass
class Line:
    name: str
    status: str
    kind: str
    items_local: int | None
    items_remote: int | None
    behaviors: tuple[str, ...]
    runs: list[str]
    problems: list[str]


def _remote_items(lf: LangfuseApi, name: str) -> int | None:
    try:
        rows = lf._get(
            "/api/public/dataset-items", datasetName=name, limit=100
        ).get("data") or []
    except Exception:
        return None
    return len([r for r in rows if r.get("status") != "ARCHIVED"])


def _is_scored(lf: LangfuseApi, experiment_id: str) -> bool:
    """Whether any item in an experiment carries a score."""
    rows = lf._get(
        "/api/public/experiment-items",
        experimentId=experiment_id,
        limit=50,
        fromStartTime=_since(),
    ).get("data") or []
    for row in rows[:5]:
        trace = row.get("traceId")
        if not trace:
            continue
        if lf._get("/api/public/v2/scores", traceId=trace, limit=5).get("data"):
            return True
    return False


def _runs(lf: LangfuseApi, name: str) -> list[str]:
    encoded = name.replace("/", "%2F")
    found: list[str] = []
    try:
        for run in lf._get(f"/api/public/datasets/{encoded}/runs", limit=50).get("data") or []:
            found.append(f"sdk:{run['name']}")
    except Exception:
        pass
    try:
        identity = lf._get(f"/api/public/v2/datasets/{encoded}")
        experiments = lf._get(
            "/api/public/experiments",
            fromStartTime=_since(),
            datasetId=identity.get("id"),
            limit=100,
            fields="core",
        ).get("data") or []
        known = {name.split(":", 1)[1] for name in found}
        for x in experiments:
            label = x.get("name") or ""
            if label in known:
                continue
            marker = "ui" if _is_scored(lf, x["id"]) else "ui-unscored"
            found.append(f"{marker}:{label}")
    except Exception:
        pass
    return found


def survey() -> list[Line]:
    """One line per declared eval, with whatever Langfuse actually has."""
    lf = LangfuseApi()
    lines: list[Line] = []
    for entry in registry.EVALS:
        problems: list[str] = []
        local = len(_read(entry)) if entry.file else None
        remote = _remote_items(lf, entry.name)
        runs = _runs(lf, entry.name)

        if entry.status == "live" and local is not None and remote is not None:
            if local != remote:
                problems.append(
                    f"{local} items here, {remote} in Langfuse; run dataset_sync"
                )
        if entry.status == "live" and not remote:
            problems.append("no active items in Langfuse")
        behaviors = manifest.for_eval(entry.name)
        if entry.status == "live" and not behaviors:
            problems.append("no behavior in manifest.py claims this dataset")
        if behaviors and not any(b.is_pinned for b in behaviors):
            problems.append(
                "runs but nothing scores it, so it is declared as a gap rather than coverage"
            )
        lines.append(
            Line(
                name=entry.name,
                status=entry.status,
                kind=entry.kind,
                items_local=local,
                items_remote=remote,
                behaviors=tuple(b.id for b in manifest.for_eval(entry.name)),
                runs=runs,
                problems=problems,
            )
        )
    return lines


def _read(entry: registry.Eval) -> list[Any]:
    import json

    path = entry.path
    if not path or not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def undeclared(lf: LangfuseApi) -> list[str]:
    """Datasets in Langfuse that the registry does not know about."""
    declared = {entry.name for entry in registry.EVALS}
    rows = lf._get("/api/public/v2/datasets", limit=100).get("data") or []
    return sorted(row["name"] for row in rows if row["name"] not in declared)


def prompt_state(lf: LangfuseApi) -> list[tuple[str, str]]:
    """The label each eval prompt carries."""
    names = sorted({e.prompt for e in registry.EVALS if e.prompt})
    out = []
    for name in names:
        try:
            production = lf._get(f"/api/public/v2/prompts/{name}")
            out.append((name, f"production v{production.get('version')}"))
        except Exception:
            try:
                lf._get(f"/api/public/v2/prompts/{name}", label=EXPERIMENT_LABEL)
                out.append((name, "experiment only, not production"))
            except Exception:
                out.append((name, "not in Langfuse"))
    return out


def render(lines: list[Line], drift: list[str], prompts: list[tuple[str, str]]) -> str:
    """The whole picture as text, because this is what a maintainer reads first."""
    width = max(len(line.name) for line in lines)
    out = ["", "EVALS"]
    unscored: list[str] = []
    for line in lines:
        counts = (
            f"{line.items_local}/{line.items_remote}"
            if line.items_local is not None
            else f"-/{line.items_remote}"
        )
        out.append(
            f"  {line.name:<{width}}  {line.status:<8} {line.kind:<10} "
            f"items={counts:<7} behaviors={len(line.behaviors)}"
        )
        for problem in line.problems:
            out.append(f"  {'':<{width}}  ! {problem}")
        unscored += [
            f"{line.name}: {run.split(':', 1)[1]}"
            for run in line.runs
            if run.startswith("ui-unscored:")
        ]

    out += ["", "BEHAVIORS"]
    for component in manifest.COMPONENTS:
        behaviors = manifest.behaviors_of(component.id)
        held = sum(1 for b in behaviors if b.is_pinned)
        mark = "ok " if held == len(behaviors) else "gap"
        out.append(f"  {mark} {component.name:<22} {held}/{len(behaviors)} pinned  {component.where}")

    out += ["", "COMPONENT COVERAGE"]
    from . import components

    out += components.render(components.collect())

    out += ["", "PROMPTS"]
    for name, state in prompts:
        out.append(f"  {name:<20} {state}")

    if unscored:
        out += ["", "RUNS WITH NO SCORES (history, not usable as evidence)"]
        out += [f"  {line}" for line in unscored]

    if drift:
        out += ["", "IN LANGFUSE BUT NOT DECLARED"]
        out += [f"  {name}" for name in drift]

    counts = manifest.coverage()
    unclaimed = manifest.evals_with_no_behavior()
    out += ["", "SUMMARY"]
    out.append(f"  {len(registry.live())} live evals")
    out.append(
        f"  {counts['pinned']}/{counts['behaviors']} behaviors pinned, "
        f"{counts['gaps']} with nothing holding them"
    )
    if unclaimed:
        out.append(f"  {len(unclaimed)} live eval(s) no behavior claims: {', '.join(unclaimed)}")
    problems = sum(len(line.problems) for line in lines)
    out.append(f"  {problems} problem(s) above" if problems else "  nothing outstanding")
    return "\n".join(out) + "\n"
