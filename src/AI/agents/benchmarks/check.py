"""One command: run what is pinned, against the working tree, and say what moved."""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path

from langfuse import get_client

from benchmarks import manifest, provenance, registry, runstore
from benchmarks.agent_task import STRUCTURAL_SCORE_NAMES, AgentTask, agent_role_models
from benchmarks.experiment import SCORES_KEY, structural_evaluator
from benchmarks.generation import ITEM_EVALUATORS, SCORE_NAMES as GENERATION_SCORE_NAMES
from benchmarks.generation import GenerationTask
from benchmarks.runstore import BehaviorResult, ItemResult, Run

ASSETS_DIR = Path(__file__).parent / "assets"

DEFAULT_AGENT_BASE_URL = "http://localhost:8071"
E2E_KIND = "e2e"

# Slow: opt in.
SLOW_KINDS = (E2E_KIND,)

E2E_MAX_CONCURRENCY = 1


@dataclass(frozen=True)
class EvalOutcome:
    """One dataset run, before it is mapped onto behaviors."""

    eval_name: str
    per_item: dict[str, dict[str, float]]
    outputs: dict[str, str]
    labels: dict[str, str | None]
    errors: dict[str, str]
    prompt_versions: dict[str, int]
    dataset_version: str | None
    comments: dict[str, dict[str, str]] = field(default_factory=dict)
    expected: dict[str, str] = field(default_factory=dict)
    inputs: dict[str, str] = field(default_factory=dict)
    meta: dict[str, dict[str, str]] = field(default_factory=dict)
    traces: dict[str, str] = field(default_factory=dict)


def _agent_base() -> str:
    return os.environ.get("AGENT_BASE_URL", DEFAULT_AGENT_BASE_URL).rstrip("/")


def _agent_models_or_die(agent_base: str) -> dict[str, str]:
    """The agent's own models, refusing to silently fall back to this checkout's."""
    models = agent_role_models(agent_base)
    if not models:
        raise SystemExit(
            "The agent service did not report which models it runs, so an end to end "
            "score cannot be attributed to a model. This would otherwise record the "
            "models this checkout resolves, which is not what built the apps. Rebuild "
            "the agent image so /health reports its models, or drop --include-e2e."
        )
    return models


def agent_models_for(planned) -> dict[str, str]:
    """One snapshot of the agent's models per run, read only when an e2e eval is selected."""
    if not any(entry.kind == E2E_KIND for entry in planned):
        return {}
    return _agent_models_or_die(_agent_base())


def task_for(args, dataset, agent_models: dict[str, str] | None = None):
    """The task and scorers for a dataset, chosen by its kind."""
    if dataset.kind == E2E_KIND:
        agent_base = _agent_base()
        role_models = agent_models or _agent_models_or_die(agent_base)
        run_name = getattr(args, "run_name", None) or dataset.name
        task = AgentTask(
            agent_base=agent_base,
            assets_dir=Path(getattr(args, "assets_dir", None) or ASSETS_DIR).expanduser(),
            run_name=run_name,
            role_models=role_models,
            description=f"End to end build for {dataset.name}",
        )
        model = role_models.get("actor") or role_model("actor")
        return task, [structural_evaluator], list(STRUCTURAL_SCORE_NAMES), model

    if dataset.kind == "planner":
        from .planner import ITEM_EVALUATORS as PLANNER_EVALUATORS
        from .planner import PlannerTask

        model = args.model or role_model("planner")
        entry = registry.by_name(dataset.name)
        task = PlannerTask(
            prompt_name=entry.prompt,
            model=model,
            user_template=entry.user_template,
        )
        return (
            task,
            PLANNER_EVALUATORS,
            ["spec_parses", "spec_label_coverage", "spec_field_count",
             "query_terms", "query_is_a_query"],
            model,
        )

    if dataset.kind == "prompt":
        from .gates import ITEM_EVALUATORS as GATE_EVALUATORS
        from .gates import GateTask

        model = args.model or role_model("default")
        task = GateTask(prompt_name=dataset.prompt, model=model)
        return task, GATE_EVALUATORS, ["gate_verdict", "gate_decline_language"], model

    task = GenerationTask(role=args.role, max_tokens=args.max_tokens, model=args.model)
    model = args.model or role_model(args.role)
    return task, ITEM_EVALUATORS, list(GENERATION_SCORE_NAMES), model


def role_model(role: str) -> str:
    """The model the role resolves to, so a run is attributable without a stack."""
    from shared.config.base_config import resolved_role_models

    resolved = resolved_role_models()
    if role in resolved:
        return resolved[role]

    from agents.core.llm_adapter import build_adapter

    return build_adapter(role).model


def _item_id(item: object, index: int) -> str:
    for attribute in ("id", "item_id"):
        value = getattr(item, attribute, None)
        if value:
            return str(value)
    if isinstance(item, dict):
        for key in ("id", "item_id"):
            if item.get(key):
                return str(item[key])
    return f"item-{index}"


def _output_text(output: object) -> str | None:
    """The output as text, for the structural comparison in `outputs.py`."""
    import dataclasses
    import json

    if output is None:
        return None
    if isinstance(output, str):
        return output
    if isinstance(output, dict):
        output = {k: v for k, v in output.items() if k != SCORES_KEY}

    def fallback(value: object) -> object:
        if dataclasses.is_dataclass(value) and not isinstance(value, type):
            return dataclasses.asdict(value)
        return str(value)

    try:
        return json.dumps(output, sort_keys=True, default=fallback)
    except (TypeError, ValueError):
        return str(output)


def _collect(result: object, eval_name: str, dataset_version: str | None) -> EvalOutcome:
    per_item: dict[str, dict[str, float]] = {}
    outputs: dict[str, str] = {}
    labels: dict[str, str | None] = {}
    errors: dict[str, str] = {}
    comments: dict[str, dict[str, str]] = {}
    expected: dict[str, str] = {}
    inputs: dict[str, str] = {}
    meta: dict[str, dict[str, str]] = {}
    traces: dict[str, str] = {}
    for index, item_result in enumerate(getattr(result, "item_results", []) or []):
        item_id = _item_id(getattr(item_result, "item", None), index)
        scores: dict[str, float] = {}
        said: dict[str, str] = {}
        for evaluation in getattr(item_result, "evaluations", []) or []:
            name = getattr(evaluation, "name", "unnamed")
            value = getattr(evaluation, "value", None)
            if isinstance(value, bool):
                value = float(value)
            if isinstance(value, (int, float)):
                scores[name] = float(value)
            elif isinstance(value, str):
                said[name] = f"{value}"
            comment = getattr(evaluation, "comment", None)
            if comment:
                said[name] = f"{said[name]}: {comment}" if name in said else str(comment)
        per_item[item_id] = scores
        comments[item_id] = said
        item = getattr(item_result, "item", None)
        wanted = getattr(item, "expected_output", None)
        if wanted is not None:
            expected[item_id] = _as_text(wanted)
        sent = getattr(item, "input", None)
        if sent is not None:
            inputs[item_id] = _as_text(sent)
        text = _output_text(getattr(item_result, "output", None))
        if text is not None:
            outputs[item_id] = text
        metadata = getattr(getattr(item_result, "item", None), "metadata", None) or {}
        if isinstance(metadata, dict):
            labels[item_id] = (
                metadata.get("label") or metadata.get("note") or metadata.get("why")
            )
            meta[item_id] = _kept_metadata(metadata)
        trace = getattr(item_result, "trace_id", None)
        if trace:
            traces[item_id] = str(trace)
        error = getattr(item_result, "error", None)
        if error:
            errors[item_id] = str(error)
    return EvalOutcome(
        eval_name=eval_name,
        per_item=per_item,
        outputs=outputs,
        labels=labels,
        errors=errors,
        prompt_versions={},
        dataset_version=dataset_version,
        comments=comments,
        expected=expected,
        inputs=inputs,
        meta=meta,
        traces=traces,
    )


# What the item is, not how it was uploaded. These dimensions split a mean in half.
KEPT_METADATA = ("language", "verification", "pairs_with", "source_trace", "regression", "defect")


def _kept_metadata(metadata: dict) -> dict[str, str]:
    kept = {k: str(v) for k, v in metadata.items() if k in KEPT_METADATA and v is not None}
    kept.update(
        {k: str(v) for k, v in metadata.items() if k.startswith("observed_") and v is not None}
    )
    return kept


def _scored_set_digest(outcomes: dict[str, EvalOutcome]) -> str:
    """What was measured, as one value a comparison can refuse on."""
    import hashlib

    pairs = sorted(
        f"{name}:{item_id}"
        for name, outcome in outcomes.items()
        for item_id in outcome.per_item
    )
    if not pairs:
        return "nothing scored"
    digest = hashlib.sha256("\n".join(pairs).encode()).hexdigest()[:12]
    return f"{len(pairs)} items {digest}"


def _as_text(value: object) -> str:
    """What the item was measured against, for the report to show next to the score."""
    import json

    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    except (TypeError, ValueError):
        return str(value)


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _behavior_results(outcomes: dict[str, EvalOutcome]) -> tuple[BehaviorResult, ...]:
    results = []
    for behavior in manifest.BEHAVIORS:
        if not behavior.is_pinned:
            results.append(
                BehaviorResult(
                    behavior=behavior.id,
                    evaluator="none",
                    score=None,
                    items=(),
                    skipped="nothing pins this behavior",
                )
            )
            continue
        outcome = outcomes.get(behavior.eval)
        if outcome is None:
            results.append(
                BehaviorResult(
                    behavior=behavior.id,
                    evaluator=behavior.evaluator,
                    score=None,
                    items=(),
                    skipped=f"{behavior.eval} was not run",
                )
            )
            continue
        items = []
        values = []
        for item_id, scores in outcome.per_item.items():
            value = scores.get(behavior.evaluator)
            if value is not None:
                values.append(value)
            items.append(
                ItemResult(
                    item_id=item_id,
                    scores=dict(scores),
                    output=outcome.outputs.get(item_id),
                    label=outcome.labels.get(item_id),
                    error=outcome.errors.get(item_id),
                    comments=dict(outcome.comments.get(item_id) or {}),
                    input=outcome.inputs.get(item_id),
                    expected=outcome.expected.get(item_id),
                    meta=dict(outcome.meta.get(item_id) or {}),
                    trace_id=outcome.traces.get(item_id),
                )
            )
        results.append(
            BehaviorResult(
                behavior=behavior.id,
                evaluator=behavior.evaluator,
                score=_mean(values),
                items=tuple(items),
            )
        )
    return tuple(results)


def evals_to_run(*, include_slow: bool, only: tuple[str, ...] = ()) -> tuple[registry.Eval, ...]:
    """Live evals some behavior claims, minus the slow ones unless asked for."""
    claimed = {b.eval for b in manifest.pinned()}
    chosen = []
    for entry in registry.live():
        if entry.name not in claimed:
            continue
        if only and entry.name not in only:
            continue
        if entry.kind in SLOW_KINDS and not include_slow:
            continue
        chosen.append(entry)
    return tuple(chosen)


def run(
    *,
    label: str,
    under_test: tuple[str, ...] = (),
    include_slow: bool = False,
    only: tuple[str, ...] = (),
    run_eval,
    agent_models: dict[str, str] | None = None,
    name: str | None = None,
) -> Run:
    """Execute the pinned behaviors and return a saved-shaped run."""
    started = time.monotonic()
    name = name or runstore.new_name(label)
    outcomes: dict[str, EvalOutcome] = {}
    prompt_versions: dict[str, int] = {}
    dataset_version: str | None = None

    chosen = evals_to_run(include_slow=include_slow, only=only)
    # The agent runs an e2e eval, so its models are what produced the result.
    if agent_models is None:
        agent_models = agent_models_for(chosen)

    for entry in chosen:
        result, versions, version_stamp = run_eval(entry)
        outcomes[entry.name] = _collect(result, entry.name, version_stamp)
        prompt_versions.update(versions)
        dataset_version = dataset_version or version_stamp

    judged = {b.evaluator: b.judge_version for b in manifest.judged()}
    evaluator_versions = {
        name: int(str(version).lstrip("v")) for name, version in judged.items() if version
    }

    state = provenance.collect(
        prompts=prompt_versions,
        dataset=dataset_version or _scored_set_digest(outcomes),
        evaluators=evaluator_versions,
        judge=_judge_model(),
        agent_models=agent_models,
    )
    return Run(
        name=name,
        label=label,
        provenance=state,
        behaviors=_behavior_results(outcomes),
        under_test=under_test,
        duration_seconds=round(time.monotonic() - started, 1),
    )


def _judge_model() -> str | None:
    from benchmarks.report import judge_model

    return judge_model()


def local_item_count(entry: registry.Eval) -> int | None:
    """How many items the repo holds for this eval, or None if it keeps none."""
    if entry.path is None or not entry.path.exists():
        return None
    from benchmarks.dataset_sync import load_datasets

    for dataset in load_datasets():
        if dataset.name == entry.name:
            return len(dataset.items)
    return None


def _warn_if_stale(entry: registry.Eval, remote_count: int) -> None:
    """An experiment runs Langfuse's copy of a dataset, not the file in the repo."""
    local = local_item_count(entry)
    if local is None or local == remote_count:
        return
    print(
        f"    WARNING: the repo has {local} items and Langfuse has {remote_count}. "
        f"This run measures Langfuse's copy. Sync with "
        f"`python -m benchmarks.dataset_sync --dataset {entry.name!r}`",
        flush=True,
    )


def langfuse_runner(args, *, check_id: str = "", label: str = "", agent_models=None):
    """The real `run_eval`: one Langfuse experiment per dataset."""
    client = get_client()

    def go(entry: registry.Eval):
        dataset = client.get_dataset(entry.name)
        items = [i for i in dataset.items if getattr(i, "status", "ACTIVE") != "ARCHIVED"]
        task, evaluators, score_names, model = task_for(args, entry, agent_models)
        slow = " (builds apps, minutes)" if entry.kind in SLOW_KINDS else ""
        print(f"  {entry.name}: {len(items)} items on {model}{slow}", flush=True)
        _warn_if_stale(entry, len(items))
        started = time.monotonic()
        concurrency = (
            E2E_MAX_CONCURRENCY
            if entry.kind in SLOW_KINDS
            else getattr(args, "max_concurrency", 5)
        )
        state = provenance.collect(agent_models=getattr(task, "role_models", None))
        result = client.run_experiment(
            name=entry.name,
            run_name=runstore.new_name(f"{entry.name}-{model}"),
            description=f"{entry.name} at {state.code}",
            data=items,
            task=task,
            evaluators=evaluators,
            max_concurrency=concurrency,
            metadata={
                **state.as_langfuse_metadata(),
                "check_id": check_id,
                "check_label": label,
                "eval": entry.name,
            },
        )
        client.flush()
        scored = sum(
            1
            for item in getattr(result, "item_results", []) or []
            if getattr(item, "evaluations", None)
        )
        print(
            f"    done in {time.monotonic() - started:.0f}s, {scored}/{len(items)} scored",
            flush=True,
        )
        versions = getattr(task, "prompt_versions", {}) or {}
        stamp = getattr(dataset, "version", None)
        return result, versions, str(stamp) if stamp else None

    return go
