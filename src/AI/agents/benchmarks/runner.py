"""The workbench."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import os
import sys
from pathlib import Path

from langfuse import get_client

from . import manifest, preview_check, registry, runstore
from .lf_api import LangfuseApi
from .rubric import build_rubric_from_dir

DEFAULT_E2E_DATASET = "Benchmarks/forms"

REPORTS_DIR = Path(__file__).parent / "reports"

SCORE_CONFIG_SPECS: dict[str, dict] = {
    "bench_completed": {"dataType": "BOOLEAN"},
    "bench_pages": {"dataType": "BOOLEAN"},
    "bench_order_integrity": {"dataType": "BOOLEAN"},
    "bench_navigation": {"dataType": "BOOLEAN"},
    "bench_field_coverage": {"dataType": "NUMERIC", "minValue": 0, "maxValue": 1},
    "bench_input_count": {"dataType": "NUMERIC", "minValue": 0, "maxValue": 1},
    "bench_texts_bound": {"dataType": "NUMERIC", "minValue": 0, "maxValue": 1},
}

PREVIEW_SCORE_CONFIG_SPECS: dict[str, dict] = {
    preview_check.RENDERS_SCORE_NAME: {"dataType": "BOOLEAN"},
    preview_check.PAGES_RENDER_SCORE_NAME: {"dataType": "NUMERIC", "minValue": 0, "maxValue": 1},
    preview_check.RENDER_FIX_ROUNDS_SCORE_NAME: {"dataType": "NUMERIC", "minValue": 0},
    preview_check.PAGES_RENDER_AFTER_FIX_SCORE_NAME: {
        "dataType": "NUMERIC",
        "minValue": 0,
        "maxValue": 1,
    },
}


def run_description(run_description: str, role_models: dict[str, str]) -> str | None:
    """Fold the models into the description so a run can be identified later."""
    parts = [run_description] if run_description else []
    if role_models:
        parts.append(" ".join(f"{role}={model}" for role, model in sorted(role_models.items())))
    return " | ".join(parts) or None


def cmd_status(_: argparse.Namespace) -> None:
    """What evals exist, what state they are in, and what is missing."""
    from .status import prompt_state, render, survey, undeclared

    lf = LangfuseApi()
    print(render(survey(), undeclared(lf), prompt_state(lf)), end="")


def _write_report(report, judge_note, out: str | None) -> Path:
    from .report import judge_payload
    from .report_html import render

    destination = Path(out) if out else REPORTS_DIR / "workbench.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(render(report, judge_note=judge_note), encoding="utf-8")
    destination.with_suffix(".json").write_text(
        json.dumps(judge_payload(report), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return destination


def _print_summary(report) -> None:
    counts = report.counts()
    if not report.adopted and report.baseline:
        print(
            f"\nComparing against {report.baseline.name!r}, not the committed baseline. "
            "Nothing here changes the pointer."
        )
    if report.is_refused:
        from .provenance import remedy

        print("\nCOMPARISON REFUSED")
        for axis in report.comparison.refused:
            print(f"  {axis} differs and was not declared as under test")
        print("  no deltas printed, because none of them could be attributed\n")
        for line in remedy(report.comparison.refused):
            print(f"  {line}")
        return
    tally = [
        f"{counts['holding']} holding" if counts["holding"] else "",
        f"{counts['recorded']} recorded with nothing to compare" if counts["recorded"] else "",
        f"{counts['moved']} moved",
        f"{counts['variance']} moved by one item" if counts["variance"] else "",
        f"{counts['failing']} failing",
        f"{counts['not_run']} not run",
        f"{counts['unpinned']} with nothing pinning them",
    ]
    print("\n" + ", ".join(part for part in tally if part))
    short = report.short_of_full_marks()
    is_the_baseline = bool(
        report.baseline and report.baseline.name == report.current.name
    )
    if short and is_the_baseline:
        print(
            f"\n  This run is the baseline. {len(short)} behavior(s) are below full "
            "marks, and these are the scores everything later is held to:"
        )
        for view in short:
            print(
                f"    {view.current:.3f}  {view.behavior.id:34} "
                f"{view.reading(view.current, view.scored_count)}"
            )
    elif short:
        moved = report.moved_in_this_run()
        fresh = [v for v in short if v.behavior.id in moved]
        standing = [v for v in short if v.behavior.id not in moved]
        if fresh:
            print(f"\n  {len(fresh)} of these moved in this run:")
            for view in fresh:
                print(
                    f"    {view.current:.3f}  {view.behavior.id:34} "
                    f"{view.reading(view.current, view.scored_count)}"
                )
        if standing:
            was = "was" if len(standing) == 1 else "were"
            print(
                f"\n  {len(standing)} {was} already like this before this run, so not a "
                "finding about this change:"
            )
            for view in standing:
                print(
                    f"    {view.current:.3f}  {view.behavior.id:34} "
                    f"{view.reading(view.current, view.scored_count)}"
                )
    if counts["no_score"]:
        print(
            f"  WARNING: {counts['no_score']} behavior(s) ran and scored nothing. "
            "Their evaluator name does not match anything the code emits."
        )
    for view in report.open_work():
        delta = f"{view.delta:+.3f}" if view.delta is not None else "       "
        note = "" if view.attributable else "   (its model did not change)"
        print(f"  {view.verdict:15} {delta}  {view.behavior.id}{note}")
    unattributable = report.unattributable()
    if unattributable:
        print(
            f"\n  {len(unattributable)} of the above moved on a component whose model did not "
            "change, so that movement is variance or a code change."
        )
    _print_next_step(report)


def _print_next_step(report) -> None:
    """What to do with the result, because a green run is not self-explanatory."""
    holes = runstore.incomplete(report.current)
    blocking = [v for v in report.behaviors if v.verdict in ("regressed", "failing", "no-score")]
    print()
    if holes:
        print(
            f"NOT ADOPTABLE: {len(holes)} pinned behavior(s) were not scored, so this run "
            "cannot be a baseline. Run a full check."
        )
        return
    if blocking:
        print(f"NOT READY: {len(blocking)} behavior(s) regressed, are failing, or scored nothing.")
        print("  Copy the prompt from each in the report and fix them, then run check again.")
        return
    if report.baseline is None:
        print("No baseline to compare against. Adopt this run if it is what main does today:")
        print(f'  python -m benchmarks.runner baseline {report.current.name} --why "..."')
        return
    print("NO REGRESSIONS against the baseline.")
    print("  The scores support this change. They do not decide it: read the blind spots on")
    print("  every behavior that matters to you, and the behaviors nothing pins at all.")
    print("  If you are shipping this, make it the reference so the next change is measured")
    print("  against it, and commit the pointer:")
    print(f'  python -m benchmarks.runner baseline {report.current.name} --why "..."')


def cmd_check(args: argparse.Namespace) -> None:
    """Run the pinned behaviors against the working tree and say what moved."""
    import asyncio

    from . import check as checker
    from . import quiet
    from .report import build, judge_payload, review

    quiet.apply()

    label = args.label or "working tree"
    under_test = tuple(args.under_test or ())
    only = tuple(args.only or ())

    planned = checker.evals_to_run(include_slow=args.include_e2e, only=only)
    if not planned:
        sys.exit("Nothing to run. Every claimed eval was filtered out.")
    print(
        f"Running {len(planned)} eval(s) for {len(manifest.pinned())} pinned behaviors, "
        f"as {label!r}\n"
    )

    name = runstore.new_name(label)
    run = checker.run(
        name=name,
        label=label,
        under_test=under_test,
        include_slow=args.include_e2e,
        only=only,
        run_eval=checker.langfuse_runner(args, check_id=name, label=label),
    )
    path = runstore.save(run)
    print(f"\nsaved {path}")

    report = build(current=run, baseline_run=args.baseline)
    note = None
    if not args.no_review and not report.is_refused:
        from .report import judge_model

        model = args.judge_model or judge_model()
        print(f"Asking {model} to review the evidence...")
        note = asyncio.run(review(judge_payload(report), model))

    if note:
        runstore.attach_judge_note(run, note)
    _print_summary(report)
    destination = _write_report(report, note, args.out)
    print(f"\nReport: file://{destination.resolve()}")


def cmd_report(args: argparse.Namespace) -> None:
    """Re-render the page from the run store, running nothing."""
    from .report import build

    report = build(baseline_run=args.baseline)
    _print_summary(report)
    print(
        f"\nReport: file://"
        f"{_write_report(report, report.current.judge_note, args.out).resolve()}"
    )


def cmd_runs(_: argparse.Namespace) -> None:
    """Every run on disk, newest first, with the baseline marked."""

    from . import baseline as pointer_file

    pointer = pointer_file.read()
    runs = runstore.all_runs()
    if not runs:
        print("No runs on this machine. `check` writes the first one.")
    for run in runs:
        mark = "baseline" if pointer and run.name == pointer.check_id else "        "
        scored = len(run.scored)
        print(f"{mark}  {run.name}  {scored:2} scored  {run.provenance.code}  {run.label}")
    if pointer:
        here = any(r.name == pointer.check_id for r in runs)
        where = "cached here" if here else "in Langfuse only"
        print(f"\nbaseline: {pointer.check_id} ({where})")
        print(f"  {pointer.why}")
    else:
        print("\nNo baseline adopted. `baseline --list` shows what Langfuse holds.")


def cmd_baseline(args: argparse.Namespace) -> None:
    """Adopt a run as the reference, by writing the committed pointer."""
    from . import remote

    if args.list:
        known = remote.check_ids()
        if not known:
            print("No runs in Langfuse carry a check id yet.")
            return
        for check_id, entry in list(known.items())[:20]:
            print(f"  {check_id}  {len(entry['datasets']):2} datasets  {entry['label']}")
        return

    if not args.run:
        sys.exit("Name a run, or pass --list to see what Langfuse holds.")
    path = runstore.set_baseline(args.run, why=args.why, force=args.force)
    run = runstore.baseline()
    assert run is not None
    print(f"baseline is now {run.name} ({run.label}, {run.provenance.code})")
    print(f"wrote {path}")
    print("Commit it: adopting a baseline is a decision, so it is reviewed.")


def cmd_ensure_configs(_: argparse.Namespace) -> None:
    lf = LangfuseApi()
    existing = lf.score_configs_by_name()
    for name, spec in {**SCORE_CONFIG_SPECS, **PREVIEW_SCORE_CONFIG_SPECS}.items():
        if name in existing:
            print(f"exists: {name}")
            continue
        lf.create_score_config(
            name=name,
            data_type=spec["dataType"],
            **{k: v for k, v in spec.items() if k != "dataType"},
        )
        print(f"created: {name} ({spec['dataType']})")


def cmd_rubric(args: argparse.Namespace) -> None:
    rubric = build_rubric_from_dir(Path(args.from_app))
    print(json.dumps(rubric, ensure_ascii=False, indent=2))
    if args.update_item:
        LangfuseApi().upsert_dataset_item(
            dataset_name=args.dataset, item_id=args.update_item, expected_output=rubric
        )
        print(f"\nUpdated expectedOutput of item {args.update_item!r} in {args.dataset!r}")


def cmd_fetch(args: argparse.Namespace) -> None:
    """Rebuild a run from Langfuse into the local cache."""
    from . import remote

    if args.list or not args.check_id:
        known = remote.check_ids()
        if not known:
            print("No runs in Langfuse carry a check id yet.")
            return
        for check_id, entry in list(known.items())[:20]:
            print(f"  {check_id}  {len(entry['datasets']):2} datasets  {entry['label']}")
        return
    path = runstore.RUNS_DIR / f"{args.check_id}.json"
    if path.exists() and not args.overwrite:
        print(f"already saved: {path}")
        _fetch_summary(runstore.load(args.check_id))
        print("  pass --overwrite to replace it with what Langfuse holds now")
        return
    try:
        run = remote.fetch(args.check_id)
    except LookupError as missing:
        sys.exit(str(missing))
    print(f"saved {runstore.save(run, overwrite=args.overwrite)}")
    _fetch_summary(run)


def _fetch_summary(run: runstore.Run) -> None:
    holes = runstore.incomplete(run)
    print(f"  {len(run.scored)} behaviors scored" + (f", {len(holes)} unscored" if holes else ""))


def cmd_impact(args: argparse.Namespace) -> None:
    """What a change means for the baseline, from a git diff."""
    import subprocess

    from . import impact

    changed = list(args.paths)
    if not changed:
        diff = subprocess.run(
            ("git", "diff", "--name-only", f"{args.against}...HEAD"),
            capture_output=True,
            text=True,
            check=False,
        )
        if diff.returncode != 0:
            sys.exit(f"git diff against {args.against!r} failed: {diff.stderr.strip()}")
        changed = [line for line in diff.stdout.splitlines() if line.strip()]
        if not changed:
            status = subprocess.run(
                ("git", "status", "--porcelain"), capture_output=True, text=True, check=False
            )
            changed = [line[3:] for line in status.stdout.splitlines() if line.strip()]
    sys.exit(impact.report(changed, strict=args.strict))


def cmd_behaviors(args: argparse.Namespace) -> None:
    """What the agent must do, and what holds each part of it."""
    from . import manifest

    if args.prompt:
        behavior = manifest.by_id(args.prompt)
        print(behavior.agent_prompt(("run the harness to fill this in",)))
        return

    for component in manifest.COMPONENTS:
        behaviors = manifest.behaviors_of(component.id)
        held = sum(1 for b in behaviors if b.is_pinned)
        print(f"\n{component.name}  ({held}/{len(behaviors)} pinned)  {component.where}")
        print(f"  {component.does}")
        for behavior in behaviors:
            mark = "pinned  " if behavior.is_pinned else "NOT PINNED"
            held_by = f"{behavior.eval} · {behavior.evaluator}" if behavior.is_pinned else behavior.fix.title
            print(f"    {mark}  {behavior.text}")
            print(f"                {held_by}")

    counts = manifest.coverage()
    print(
        f"\n{counts['behaviors']} behaviors across {counts['components']} components: "
        f"{counts['pinned']} pinned, {counts['gaps']} with nothing holding them."
    )
    if counts["judged"]:
        judged = ", ".join(b.id for b in manifest.judged())
        print(f"{counts['judged']} scored by a judge, comparable only while its version holds: {judged}")
    unclaimed = manifest.evals_with_no_behavior()
    if unclaimed:
        print(f"{len(unclaimed)} live evals claimed by no behavior: {', '.join(unclaimed)}")


@dataclass(frozen=True)
class Entry:
    """One command, described once for both the menu and `--help`."""

    name: str
    does: str
    when: str
    needs_input: str = ""


CATALOGUE = (
    Entry(
        "check",
        "Run every pinned behavior and say what moved",
        "after changing a model, a prompt, a tool schema or the agent's code",
    ),
    Entry(
        "report",
        "Re-render the page from the runs already on disk",
        "to look at the last result again, without spending model calls",
    ),
    Entry(
        "runs",
        "List every run on this machine, and which one is the baseline",
        "to find a run id, or to see whether the baseline is cached here",
    ),
    Entry(
        "baseline",
        "Adopt a run as the reference every later run is compared against",
        "when you are shipping a change and its numbers are the new expectation",
        needs_input="a run id and a reason",
    ),
    Entry(
        "behaviors",
        "Print what the agent must do, and what holds each part of it",
        "to see the gaps, or to copy the prompt for one behavior",
    ),
    Entry(
        "fetch",
        "Rebuild a run from Langfuse into the local cache",
        "when a run reached Langfuse but the local file is missing",
        needs_input="a check id",
    ),
    Entry(
        "impact",
        "Say whether your change invalidates the baseline",
        "before pushing; this is the check CI runs",
    ),
    Entry(
        "status",
        "Compare what the repo declares against what Langfuse holds",
        "when a dataset or a prompt looks out of step",
    ),
    Entry(
        "ensure-configs",
        "Create the Langfuse score configs the evaluators write to",
        "once, when setting up a new Langfuse project",
    ),
    Entry(
        "rubric",
        "Build an end-to-end rubric from a known-good app",
        "when adding an end-to-end item",
        needs_input="a path to an app clone",
    ),
)


def _describe(name: str) -> str:
    return next(e.does for e in CATALOGUE if e.name == name)


def menu() -> int:
    """The command list, with what each does and when it is run."""
    print()
    print("  The workbench. One command runs the pinned behaviors against your")
    print("  working tree and says what your change moved.")
    print()
    width = max(len(e.name) for e in CATALOGUE)
    for index, entry in enumerate(CATALOGUE, 1):
        print(f"  {index}  {entry.name:<{width}}  {entry.does}")
        print(f"     {'':<{width}}  when: {entry.when}")
        if entry.needs_input:
            print(f"     {'':<{width}}  needs: {entry.needs_input}")
        print()
    print("  Full options for any of them: python -m benchmarks.runner <name> --help")
    print()

    if not sys.stdin.isatty():
        return 0

    try:
        choice = input("  Number, name, or blank to quit: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return 0
    if not choice:
        return 0

    entry = None
    if choice.isdigit() and 1 <= int(choice) <= len(CATALOGUE):
        entry = CATALOGUE[int(choice) - 1]
    else:
        entry = next((e for e in CATALOGUE if e.name == choice), None)
    if entry is None:
        print(f"  {choice!r} is not one of them.")
        return 1

    extra = _ask_for(entry)
    if extra is None:
        return 1
    argv = [entry.name, *extra]
    print(f"\n  $ python -m benchmarks.runner {' '.join(argv)}\n")
    return _dispatch(argv)


def _ask_for(entry: Entry) -> list[str] | None:
    """The one or two things a command cannot default, asked for by name."""
    if not entry.needs_input:
        return []
    if entry.name == "baseline":

        runs = runstore.all_runs()
        if not runs:
            print("  No runs on this machine yet. Run `check` first.")
            return None
        for index, run in enumerate(runs[:10], 1):
            print(f"    {index}  {run.name}  {run.label}")
        picked = input("  Which run: ").strip()
        if not picked:
            return None
        name = (
            runs[int(picked) - 1].name
            if picked.isdigit() and 1 <= int(picked) <= len(runs)
            else picked
        )
        why = input("  Why is this the baseline: ").strip()
        if not why:
            print("  A baseline records why it was adopted, so that is required.")
            return None
        return [name, "--why", why]
    if entry.name == "rubric":
        path = input("  Path to the app clone: ").strip()
        return ["--from-app", path] if path else None
    return []


def _dispatch(argv: list[str]) -> int:
    args = _parser().parse_args(argv)
    try:
        args.func(args)
    except SystemExit as exit_code:
        code = exit_code.code
        if isinstance(code, str):
            print(code, file=sys.stderr)
            return 1
        return int(code or 0)
    return 0


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__,
        epilog="Run with no arguments for the list, with what each does and when.",
    )
    sub = parser.add_subparsers(dest="command", metavar="<command>")

    sub.add_parser("ensure-configs", help=_describe("ensure-configs")).set_defaults(func=cmd_ensure_configs)

    behaviors_parser = sub.add_parser("behaviors", help=_describe("behaviors"))
    behaviors_parser.add_argument("--prompt", help="behavior id, print its agent prompt")
    behaviors_parser.set_defaults(func=cmd_behaviors)

    rubric_parser = sub.add_parser("rubric", help=_describe("rubric"))
    rubric_parser.add_argument("--from-app", required=True, help="path to a golden app clone")
    rubric_parser.add_argument("--update-item", help="dataset item id to update")
    rubric_parser.add_argument("--dataset", default=DEFAULT_E2E_DATASET)
    rubric_parser.set_defaults(func=cmd_rubric)

    sub.add_parser("status", help=_describe("status")).set_defaults(func=cmd_status)

    fetch_parser = sub.add_parser("fetch", help=_describe("fetch"))
    fetch_parser.add_argument("check_id", nargs="?", help="a check id from Langfuse")
    fetch_parser.add_argument("--list", action="store_true", help="what Langfuse holds")
    fetch_parser.add_argument(
        "--overwrite", action="store_true", help="replace a run already in the local cache"
    )
    fetch_parser.set_defaults(func=cmd_fetch)

    impact_parser = sub.add_parser("impact", help=_describe("impact"))
    impact_parser.add_argument("paths", nargs="*", help="changed paths, default a git diff")
    impact_parser.add_argument("--against", default="origin/main", help="the base ref")
    impact_parser.add_argument(
        "--strict", action="store_true", help="exit non-zero when a re-baseline is missing"
    )
    impact_parser.set_defaults(func=cmd_impact)

    check_parser = sub.add_parser("check", help=_describe("check"))
    check_parser.add_argument("--label", help="what this run is, e.g. 'new loop prompt'")
    check_parser.add_argument(
        "--under-test", action="append",
        help="an axis you meant to change, so a difference on it does not refuse the comparison",
    )
    check_parser.add_argument("--only", action="append", help="limit to one eval, repeatable")
    check_parser.add_argument("--include-e2e", action="store_true", help="also run the slow builds")
    check_parser.add_argument("--no-review", action="store_true")
    check_parser.add_argument("--judge-model", default=None)
    check_parser.add_argument(
        "--baseline",
        help="compare against this run instead of the committed pointer, for an A/B",
    )
    check_parser.add_argument("--out")
    check_parser.add_argument("--max-concurrency", type=int, default=5)
    check_parser.add_argument("--role", default="actor")
    check_parser.add_argument("--model", default=None)
    check_parser.add_argument("--max-tokens", type=int, default=None)
    check_parser.add_argument(
        "--assets-dir", help="where the e2e PDFs live, default benchmarks/assets"
    )
    check_parser.add_argument("--run-name", help="the Langfuse run name for an e2e build")
    check_parser.set_defaults(func=cmd_check)

    report_parser = sub.add_parser("report", help=_describe("report"))
    report_parser.add_argument(
        "--baseline",
        help="compare against this run instead of the committed pointer, for an A/B",
    )
    report_parser.add_argument("--out")
    report_parser.set_defaults(func=cmd_report)

    sub.add_parser("runs", help=_describe("runs")).set_defaults(func=cmd_runs)

    baseline_parser = sub.add_parser("baseline", help=_describe("baseline"))
    baseline_parser.add_argument("run", nargs="?", help="a check id, local or in Langfuse")
    baseline_parser.add_argument("--list", action="store_true", help="what Langfuse holds")
    baseline_parser.add_argument(
        "--why", default="", help="why this run is the baseline, kept in the commit"
    )
    baseline_parser.add_argument(
        "--force", action="store_true", help="adopt a run that did not score everything"
    )
    baseline_parser.set_defaults(func=cmd_baseline)

    return parser


def main() -> None:
    if len(sys.argv) == 1:
        raise SystemExit(menu())
    args = _parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
