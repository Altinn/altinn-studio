"""Running one dataset item against the agent."""

from __future__ import annotations

import base64
import mimetypes
import os
import sys
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

from . import app_checks, preview_check
from .app_model import load_app
from .bench_app import BenchApp, BenchAppError, bench_org, clone_branch, create_bench_app
from .evaluators import Score
from .experiment import SCORES_KEY
from .rubric import RUBRIC_VERSION

POLL_INTERVAL_SECONDS = 10
WORKFLOW_TIMEOUT_SECONDS = 30 * 60
HEALTH_TIMEOUT_SECONDS = 10

RENDER_FIX_FLAG = "BENCH_RENDER_FIX"
RENDER_FIX_ROUNDS_ENV = "BENCH_RENDER_FIX_ROUNDS"
DEFAULT_RENDER_FIX_ROUNDS = 1

STRUCTURAL_SCORE_NAMES = app_checks.SCORE_NAMES

COMPLETED_SCORE_NAME = "bench_completed"
BUILT_SCORE_NAME = "bench_built"

# Emitted here, not in preview_check, because only the task knows a fix round ran.
SCORE_NAMES = (
    COMPLETED_SCORE_NAME,
    BUILT_SCORE_NAME,
    preview_check.RENDER_FIX_ROUNDS_SCORE_NAME,
    preview_check.PAGES_RENDER_AFTER_FIX_SCORE_NAME,
)


def _env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        sys.exit(f"Missing required environment variable: {name}")
    return value


def session_branch(session_id: str) -> str:
    # Mirrors agents.core.tools.commit_session_branch_tool._session_branch_name.
    return f"assistant_{session_id[:8]}"


def agent_headers() -> dict[str, str]:
    return {
        "X-Api-Key": _env("AGENT_DESIGNER_API_KEY"),
        "X-Developer": os.environ.get("BENCH_DEVELOPER", "benchmark"),
    }


def agent_role_models(agent_base: str) -> dict[str, str]:
    """Ask the agent which models it is running."""
    try:
        response = httpx.get(f"{agent_base}/health", timeout=HEALTH_TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.json().get("models") or {}
    except Exception as error:
        print(f"  could not read models from {agent_base}/health: {error}")
        return {}


def item_field(item: Any, name: str) -> Any:
    """Dataset items arrive as SDK objects from a dataset and as plain dicts from
    a local list, and the SDK names expected output differently in each."""
    if isinstance(item, dict):
        if name == "expected_output":
            return item.get("expected_output", item.get("expectedOutput"))
        return item.get(name)
    return getattr(item, name, None)


def load_attachments(item: Any, assets_dir: Path) -> list[dict]:
    names = (item_field(item, "metadata") or {}).get("attachments") or []
    attachments = []
    for name in names:
        path = assets_dir / name
        if not path.is_file():
            raise FileNotFoundError(f"attachment {name!r} not found in {assets_dir}")
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


def start_agent(
    base_url: str,
    app: BenchApp,
    session_id: str,
    goal: str,
    attachments: list[dict],
    branch: str | None = None,
    experiment: dict | None = None,
) -> None:
    payload: dict[str, Any] = {
        "session_id": session_id,
        "goal": goal,
        "repo_url": app.agent_url,
        # Benchmark runs record the model usage on the owner of the benchmark repository.
        "cost_org": app.org,
        "allow_app_changes": True,
        "attachments": attachments,
    }
    if experiment:
        payload["experiment"] = experiment
    if branch:
        payload["branch"] = branch
    response = httpx.post(f"{base_url}/api/agent/start", headers=agent_headers(), json=payload, timeout=120)
    response.raise_for_status()


def await_workflow(base_url: str, session_id: str) -> dict:
    import time

    deadline = time.monotonic() + WORKFLOW_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        time.sleep(POLL_INTERVAL_SECONDS)
        response = httpx.get(f"{base_url}/api/agent/status/{session_id}", timeout=30)
        response.raise_for_status()
        status = response.json()
        if status.get("status") in ("done", "error", "cancelled"):
            return status
    return {"status": "timeout"}


def clone_result_branch(app: BenchApp, session_id: str, workdir: Path) -> Path | None:
    branch, destination = session_branch(session_id), workdir / session_id[:8]
    try:
        return clone_branch(app.repo, branch, destination, _env("AGENT_DESIGNER_API_KEY"))
    except BenchAppError as error:
        print(f"  {error}", file=sys.stderr)
        return None


def is_render_fix_enabled() -> bool:
    return os.environ.get(RENDER_FIX_FLAG, "0") == "1"


def render_fix_rounds() -> int:
    """Read the round budget, falling back rather than dying mid-run."""
    raw = os.environ.get(RENDER_FIX_ROUNDS_ENV, str(DEFAULT_RENDER_FIX_ROUNDS))
    try:
        rounds = int(raw)
    except ValueError:
        rounds = -1
    if rounds < 0:
        print(f"  {RENDER_FIX_ROUNDS_ENV}={raw!r} is not a non-negative integer; using {DEFAULT_RENDER_FIX_ROUNDS}")
        return DEFAULT_RENDER_FIX_ROUNDS
    return rounds


def _render_fix_goal(failures: list[preview_check.PageRenderResult]) -> str:
    failure_lines = "\n".join(f"- {failure.page}: {failure.detail}" for failure in failures)
    return (
        "The app you built fails to render in Studio's app preview. "
        "Fix the app so every page renders without errors, verify your "
        "changes, and commit them to the session branch.\n\n"
        f"Failing pages:\n{failure_lines}"
    )


def _after_fix_scores(results: list[preview_check.PageRenderResult] | None, rounds: int) -> list[Score]:
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


@dataclass
class AgentTask:
    """The experiment task: one dataset item, one agent run, one set of scores."""

    agent_base: str
    assets_dir: Path
    run_name: str
    template: str
    role_models: dict[str, str] = field(default_factory=dict)
    description: str | None = None
    app: BenchApp | None = None

    def bench_app(self) -> BenchApp:
        """One new app per eval run, made from the template, which every item of the run builds on."""
        if self.app is None:
            self.app = create_bench_app(self.template, org=bench_org(), api_key=_env("AGENT_DESIGNER_API_KEY"))
            print(f"bench app: {self.app.org}/{self.app.app}")
        return self.app

    def __call__(self, *, item: Any, **_: Any) -> dict[str, Any]:
        goal = (item_field(item, "input") or {}).get("goal")
        rubric = item_field(item, "expected_output") or {}
        item_id = item_field(item, "id") or "<local>"
        if not goal:
            raise ValueError(f"item {item_id} has no input.goal")
        if rubric.get("rubric_version") != RUBRIC_VERSION:
            raise ValueError(
                f"item {item_id} expectedOutput is not a v{RUBRIC_VERSION} rubric; "
                "write it as datasets/README.md says, with `rubric --from-app …` for the counts and titles"
            )
        parsed = app_checks.Rubric.parse(rubric)

        app = self.bench_app()
        session_id = str(uuid.uuid4())
        print(f"item {item_id}: session {session_id}")
        start_agent(
            self.agent_base,
            app,
            session_id,
            goal,
            load_attachments(item, self.assets_dir),
            experiment=self.experiment_context(item),
        )
        status = await_workflow(self.agent_base, session_id)
        completed = status.get("status") == "done" and bool(status.get("success", False))
        print(f"  workflow finished: {status.get('status')} success={status.get('success')}")

        scores = [
            Score(
                name=COMPLETED_SCORE_NAME,
                value=1.0 if completed else 0.0,
                data_type="BOOLEAN",
                comment=f"workflow status={status.get('status')} success={status.get('success')}",
            )
        ]
        with tempfile.TemporaryDirectory(prefix="assistant-bench-") as tmp:
            clone = clone_result_branch(app, session_id, Path(tmp))
            scores.append(_built_score(clone is not None, status))
            if clone is not None:
                scores.extend(self._score_app(clone, parsed, session_id, Path(tmp)))

        for score in scores:
            print(f"  {score.name} = {score.value}  ({score.comment[:80]})")
        return {
            SCORES_KEY: scores,
            "session_id": session_id,
            "session_branch": session_branch(session_id),
            "workflow_status": status.get("status"),
            "completed": completed,
        }

    def experiment_context(self, item: Any) -> dict:
        """The agent stamps this on its own trace, so the agent's workflow trace
        joins the dataset run alongside the task trace the SDK creates."""
        dataset_id = item_field(item, "dataset_id") or item_field(item, "datasetId") or ""
        return {
            "experimentId": experiment_id(self.run_name, dataset_id),
            "experimentName": self.run_name,
            "datasetId": dataset_id,
            "itemId": item_field(item, "id"),
            "description": self.description,
        }

    def _score_app(self, clone: Path, rubric: app_checks.Rubric, session_id: str, workdir: Path) -> list[Score]:
        app = load_app(clone)
        scores = app_checks.evaluate(app, rubric, self.template)
        if not preview_check.is_enabled():
            return scores
        results = preview_check.collect(self.bench_app().repo, session_branch(session_id), app.page_order)
        if results is None:
            return scores
        scores.extend(preview_check.build_scores(results))
        failures = [result for result in results if not result.rendered]
        if failures and is_render_fix_enabled():
            fixed, rounds = self._fix_render_failures(session_id, failures, workdir)
            scores.extend(_after_fix_scores(fixed, rounds))
        return scores

    def _fix_render_failures(
        self,
        session_id: str,
        failures: list[preview_check.PageRenderResult],
        workdir: Path,
    ) -> tuple[list[preview_check.PageRenderResult] | None, int]:
        """Send render failures back into the agent session and re-check, up to
        BENCH_RENDER_FIX_ROUNDS rounds. Each round is a full agent workflow."""
        max_rounds = render_fix_rounds()
        branch = session_branch(session_id)
        results: list[preview_check.PageRenderResult] | None = None
        rounds = 0
        for round_number in range(1, max_rounds + 1):
            rounds = round_number
            print(f"  render fix round {round_number}: {len(failures)} failing page(s)")
            start_agent(self.agent_base, self.bench_app(), session_id, _render_fix_goal(failures), [], branch=branch)
            status = await_workflow(self.agent_base, session_id)
            print(f"  fix workflow finished: {status.get('status')}")

            round_dir = workdir / f"fix-round-{round_number}"
            round_dir.mkdir(exist_ok=True)
            clone = clone_result_branch(self.bench_app(), session_id, round_dir)
            if clone is None:
                break
            results = preview_check.collect(self.bench_app().repo, branch, load_app(clone).page_order)
            if results is None:
                break
            failures = [result for result in results if not result.rendered]
            if not failures:
                break
        return results, rounds


def _built_score(built: bool, status: dict) -> Score:
    """1 when the build committed an app. A build that stops to ask fails this score and gets no others."""
    said = ((status.get("last_message") or {}).get("content") or "").strip().replace("\n", " ")
    return Score(
        name=BUILT_SCORE_NAME,
        value=1.0 if built else 0.0,
        data_type="BOOLEAN",
        comment="committed a session branch" if built else f"no session branch. The assistant said: {said[:400]}",
    )


def experiment_id(run_name: str, dataset_id: str) -> str:
    """Stable across the items of one run, distinct between runs."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"langfuse-experiment/{dataset_id}/{run_name}"))
