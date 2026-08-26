"""Benchmark runner: run the agent against a Langfuse dataset and record
scored, comparable runs.

Per dataset item: start a workflow on the local agent stack and poll it to
completion, clone the session branch it pushed (the repo is ground truth, not
the trace), score it against the item's structural rubric, preview-render every
ordered page, then post the scores to the workflow trace and link it into the
dataset run.

Setup, environment and command reference live in README.md.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

from . import preview_check
from .app_model import load_app
from .evaluators import Score, evaluate
from .lf_api import LangfuseApi
from .rubric import RUBRIC_VERSION, build_rubric_from_dir

DEFAULT_DATASET = "Benchmarks/large-pdf"
WORKFLOW_TRACE_NAME = "Altinity Agent Workflow"
POLL_INTERVAL_SECONDS = 10
WORKFLOW_TIMEOUT_SECONDS = 30 * 60

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

RENDER_FIX_FLAG = "BENCH_RENDER_FIX"
RENDER_FIX_ROUNDS_ENV = "BENCH_RENDER_FIX_ROUNDS"
DEFAULT_RENDER_FIX_ROUNDS = 1


def _env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        sys.exit(f"Missing required environment variable: {name}")
    return value


def _bench_repo_url() -> str:
    """The app repo the benchmark runs against. No default on purpose:
    it must be a repo the current developer owns and is happy to have
    session branches pushed to."""
    url = os.environ.get("BENCH_REPO_URL")
    if not url:
        sys.exit(
            "Missing required environment variable: BENCH_REPO_URL\n"
            "Set it to a disposable Altinn app repo the benchmark may push "
            "session branches to, as the AGENT container resolves it — for "
            "the local stack: http://gitea-proxy:81/<org>/<app>.git"
        )
    return url


def _repo_org(repo_url: str) -> str:
    segments = [segment for segment in urlparse(repo_url).path.split("/") if segment]
    if len(segments) < 2:
        sys.exit(f"BENCH_REPO_URL must look like …/<org>/<app>.git — got {repo_url!r}")
    return segments[0]



def _agent_headers() -> dict[str, str]:
    return {
        "X-Api-Key": _env("AGENT_DESIGNER_API_KEY"),
        "X-Developer": os.environ.get("BENCH_DEVELOPER", "benchmark"),
    }


def _load_attachments(item: dict, assets_dir: Path) -> list[dict]:
    names = (item.get("metadata") or {}).get("attachments") or []
    attachments = []
    for name in names:
        path = assets_dir / name
        if not path.is_file():
            sys.exit(f"Attachment {name!r} for item {item['id']} not found in {assets_dir}")
        data = path.read_bytes()
        attachments.append(
            {
                "name": name,
                "mimeType": mimetypes.guess_type(name)[0] or "application/octet-stream",
                "size": len(data),
                "dataBase64": base64.b64encode(data).decode(),
            }
        )
    return attachments


def _start_agent(
    base_url: str,
    session_id: str,
    goal: str,
    attachments: list[dict],
    branch: str | None = None,
    experiment: dict | None = None,
) -> None:
    repo_url = _bench_repo_url()
    payload = {
        "session_id": session_id,
        "goal": goal,
        "repo_url": repo_url,
        "org": _repo_org(repo_url),
        "allow_app_changes": True,
        "attachments": attachments,
    }
    if experiment:
        payload["experiment"] = experiment
    if branch:
        payload["branch"] = branch
    response = httpx.post(
        f"{base_url}/api/agent/start", headers=_agent_headers(), json=payload, timeout=120
    )
    response.raise_for_status()


def _await_workflow(base_url: str, session_id: str) -> dict:
    deadline = time.monotonic() + WORKFLOW_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        time.sleep(POLL_INTERVAL_SECONDS)
        response = httpx.get(f"{base_url}/api/agent/status/{session_id}", timeout=30)
        response.raise_for_status()
        status = response.json()
        if status.get("status") in ("done", "error", "cancelled"):
            return status
    return {"status": "timeout"}



def _session_branch(session_id: str) -> str:
    # Mirrors agents.core.tools.git_tool._session_branch_name.
    return f"altinity_session_{session_id[:8]}"


def _clone_result_branch(session_id: str, workdir: Path) -> Path | None:
    clone_base = os.environ.get("BENCH_GITEA_CLONE_BASE", "http://localhost/repos").rstrip("/")
    repo_path = urlparse(_bench_repo_url()).path
    destination = workdir / session_id[:8]
    command = [
        "git",
        "-c",
        f"http.extraHeader=X-Api-Key: {_env('AGENT_DESIGNER_API_KEY')}",
        "clone",
        "--depth",
        "1",
        "--branch",
        _session_branch(session_id),
        f"{clone_base}{repo_path}",
        str(destination),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  clone failed: {result.stderr.strip().splitlines()[-1:]}", file=sys.stderr)
        return None
    return destination



def _is_render_fix_enabled() -> bool:
    return os.environ.get(RENDER_FIX_FLAG, "0") == "1"


def _render_fix_goal(failures: list[preview_check.PageRenderResult]) -> str:
    failure_lines = "\n".join(f"- {failure.page}: {failure.detail}" for failure in failures)
    return (
        "The app you built fails to render in Studio's app preview. "
        "Fix the app so every page renders without errors, verify your "
        "changes, and commit them to the session branch.\n\n"
        f"Failing pages:\n{failure_lines}"
    )


def _render_fix_rounds() -> int:
    """Read the round budget, falling back rather than dying mid-run."""
    raw = os.environ.get(RENDER_FIX_ROUNDS_ENV, str(DEFAULT_RENDER_FIX_ROUNDS))
    try:
        rounds = int(raw)
    except ValueError:
        rounds = -1
    if rounds < 0:
        print(
            f"  {RENDER_FIX_ROUNDS_ENV}={raw!r} is not a non-negative integer; "
            f"using {DEFAULT_RENDER_FIX_ROUNDS}"
        )
        return DEFAULT_RENDER_FIX_ROUNDS
    return rounds


def _fix_render_failures(
    agent_base: str,
    session_id: str,
    failures: list[preview_check.PageRenderResult],
    workdir: Path,
) -> tuple[list[preview_check.PageRenderResult] | None, int]:
    """Send render failures back into the agent session and re-check,
    up to BENCH_RENDER_FIX_ROUNDS rounds (each round is a full agent
    workflow). Returns (results of the last re-check, rounds run)."""
    max_rounds = _render_fix_rounds()
    branch = _session_branch(session_id)
    results: list[preview_check.PageRenderResult] | None = None
    rounds = 0
    for round_number in range(1, max_rounds + 1):
        rounds = round_number
        print(f"  render fix round {round_number}: {len(failures)} failing page(s)")
        _start_agent(agent_base, session_id, _render_fix_goal(failures), [], branch=branch)
        status = _await_workflow(agent_base, session_id)
        print(f"  fix workflow finished: {status.get('status')} success={status.get('success')}")

        round_dir = workdir / f"fix-round-{round_number}"
        round_dir.mkdir()
        clone = _clone_result_branch(session_id, round_dir)
        if clone is None:
            break
        results = preview_check.collect(branch, load_app(clone).page_order)
        if results is None:
            break
        failures = [result for result in results if not result.rendered]
        if not failures:
            break
    return results, rounds


def _after_fix_scores(
    results: list[preview_check.PageRenderResult] | None, rounds: int
) -> list[Score]:
    scores = [
        Score(
            name=preview_check.RENDER_FIX_ROUNDS_SCORE_NAME,
            value=float(rounds),
            data_type="NUMERIC",
            comment=f"{rounds} render-fix round(s) sent back into the agent session",
        )
    ]
    if results is None:
        return scores
    rendered_count = sum(1 for result in results if result.rendered)
    failures = [result for result in results if not result.rendered]
    failure_summary = "; ".join(f"{failure.page}: {failure.detail}" for failure in failures)
    scores.append(
        Score(
            name=preview_check.PAGES_RENDER_AFTER_FIX_SCORE_NAME,
            value=rendered_count / len(results) if results else 0.0,
            data_type="NUMERIC",
            comment=f"{rendered_count}/{len(results)} pages rendered after fix"
            + (f" — failed: {failure_summary}" if failures else ""),
        )
    )
    return scores



def _experiment_context(args, dataset_id: str, item_id: str) -> dict:
    """The agent stamps this on its trace, so it is passed at start."""
    return {
        "experimentId": _experiment_id(args.run_name, dataset_id),
        "experimentName": args.run_name,
        "datasetId": dataset_id,
        "itemId": item_id,
        "description": args.run_description or None,
    }


def _experiment_id(run_name: str, dataset_id: str) -> str:
    """Stable across the items of one run, distinct between runs."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"langfuse-experiment/{dataset_id}/{run_name}"))


def cmd_ensure_configs(_: argparse.Namespace) -> None:
    lf = LangfuseApi()
    existing = lf.score_configs_by_name()
    for name, spec in {**SCORE_CONFIG_SPECS, **PREVIEW_SCORE_CONFIG_SPECS}.items():
        if name in existing:
            print(f"exists: {name}")
            continue
        lf.create_score_config(name=name, data_type=spec["dataType"], **{
            k: v for k, v in spec.items() if k != "dataType"
        })
        print(f"created: {name} ({spec['dataType']})")


def cmd_rubric(args: argparse.Namespace) -> None:
    rubric = build_rubric_from_dir(Path(args.from_app))
    print(json.dumps(rubric, ensure_ascii=False, indent=2))
    if args.update_item:
        lf = LangfuseApi()
        lf.upsert_dataset_item(
            dataset_name=args.dataset, item_id=args.update_item, expected_output=rubric
        )
        print(f"\nUpdated expectedOutput of item {args.update_item!r} in {args.dataset!r}")


def cmd_run(args: argparse.Namespace) -> None:
    lf = LangfuseApi()
    agent_base = os.environ.get("AGENT_BASE_URL", "http://localhost:8071").rstrip("/")
    assets_dir = Path(args.assets_dir).expanduser()
    configs = lf.score_configs_by_name()

    items = lf.dataset_items(args.dataset)
    if not items:
        sys.exit(f"No active items in dataset {args.dataset!r}")
    print(f"Dataset {args.dataset!r}: {len(items)} item(s); run name {args.run_name!r}")

    for item in items:
        goal = (item.get("input") or {}).get("goal")
        rubric = item.get("expectedOutput") or {}
        if not goal:
            print(f"skip {item['id']}: no input.goal")
            continue
        if rubric.get("rubric_version") != RUBRIC_VERSION:
            print(
                f"skip {item['id']}: expectedOutput is not a v{RUBRIC_VERSION} rubric "
                "(run `rubric --from-app … --update-item …` first)"
            )
            continue

        session_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat()
        print(f"item {item['id']}: session {session_id}")

        _start_agent(
            agent_base,
            session_id,
            goal,
            _load_attachments(item, assets_dir),
            experiment=_experiment_context(args, item["datasetId"], item["id"]),
        )
        status = _await_workflow(agent_base, session_id)
        completed = status.get("status") == "done" and bool(status.get("success", False))
        print(f"  workflow finished: {status.get('status')} success={status.get('success')}")

        trace_id = lf.find_trace_for_session(session_id, WORKFLOW_TRACE_NAME, started_at)
        if not trace_id:
            print(f"  WARNING: no trace found for session {session_id} — skipping scoring")
            continue

        scores = [
            Score(
                name="bench_completed",
                value=1.0 if completed else 0.0,
                data_type="BOOLEAN",
                comment=f"workflow status={status.get('status')} success={status.get('success')}",
            )
        ]
        with tempfile.TemporaryDirectory(prefix="altinity-bench-") as tmp:
            clone = _clone_result_branch(session_id, Path(tmp))
            if clone is not None:
                app = load_app(clone)
                scores.extend(evaluate(app, rubric))
                if preview_check.is_enabled():
                    render_results = preview_check.collect(
                        _session_branch(session_id), app.page_order
                    )
                    if render_results is not None:
                        scores.extend(preview_check.build_scores(render_results))
                        failures = [r for r in render_results if not r.rendered]
                        if failures and _is_render_fix_enabled():
                            fixed_results, rounds = _fix_render_failures(
                                agent_base, session_id, failures, Path(tmp)
                            )
                            scores.extend(_after_fix_scores(fixed_results, rounds))
            else:
                comment = "no committed session branch to evaluate"
                for name, spec in SCORE_CONFIG_SPECS.items():
                    if name != "bench_completed":
                        scores.append(Score(name, 0.0, spec["dataType"], comment))

        for score in scores:
            config = configs.get(score.name)
            lf.create_score(
                trace_id=trace_id,
                name=score.name,
                value=score.value,
                data_type=score.data_type,
                comment=score.comment,
                config_id=config.get("id") if config else None,
            )
            print(f"  {score.name} = {score.value}  ({score.comment[:80]})")

        print(f"  trace {trace_id} is item {item['id']} of run {args.run_name!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("ensure-configs").set_defaults(func=cmd_ensure_configs)

    rubric_parser = sub.add_parser("rubric")
    rubric_parser.add_argument("--from-app", required=True, help="path to a golden app clone")
    rubric_parser.add_argument("--update-item", help="dataset item id to update")
    rubric_parser.add_argument("--dataset", default=DEFAULT_DATASET)
    rubric_parser.set_defaults(func=cmd_rubric)

    run_parser = sub.add_parser("run")
    run_parser.add_argument("--run-name", required=True)
    run_parser.add_argument("--run-description", default="")
    run_parser.add_argument("--dataset", default=DEFAULT_DATASET)
    run_parser.add_argument("--assets-dir", default=str(Path(__file__).parent / "assets"))
    run_parser.set_defaults(func=cmd_run)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
