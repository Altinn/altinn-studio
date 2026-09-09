"""Reading a run back out of Langfuse."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from benchmarks import manifest
from benchmarks.check import _kept_metadata
from benchmarks.experiment import SCORES_KEY
from benchmarks.lf_api import LangfuseApi
from benchmarks.provenance import Code, Provenance
from benchmarks.runstore import BehaviorResult, ItemResult, Run

# Langfuse requires a start time on both listing endpoints.
LOOKBACK_DAYS = 365

PAGE_SIZE = 100


def _since() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


def _experiments(api: LangfuseApi) -> list[dict]:
    out: list[dict] = []
    cursor = None
    while True:
        params = {
            "fromStartTime": _since(),
            "limit": PAGE_SIZE,
            "fields": "core,metadata",
        }
        if cursor:
            params["cursor"] = cursor
        page = api._get("/api/public/experiments", **params)
        out += page.get("data") or []
        cursor = (page.get("meta") or {}).get("cursor")
        if not cursor:
            return out


def _items(api: LangfuseApi, experiment_id: str) -> list[dict]:
    out: list[dict] = []
    cursor = None
    while True:
        params = {
            "fromStartTime": _since(),
            "experimentId": experiment_id,
            "limit": PAGE_SIZE,
            "fields": "core,io,scores,metadata",
        }
        if cursor:
            params["cursor"] = cursor
        page = api._get("/api/public/experiment-items", **params)
        out += page.get("data") or []
        cursor = (page.get("meta") or {}).get("cursor")
        if not cursor:
            return out


def check_ids(api: LangfuseApi | None = None) -> dict[str, dict]:
    """Every `check` invocation Langfuse holds, newest first."""
    api = api or LangfuseApi()
    found: dict[str, dict] = {}
    for experiment in _experiments(api):
        metadata = experiment.get("metadata") or {}
        check_id = metadata.get("check_id")
        if not check_id:
            continue
        entry = found.setdefault(
            check_id,
            {
                "check_id": check_id,
                "label": metadata.get("check_label") or check_id,
                "recorded_at": metadata.get("recorded_at") or experiment.get("startTime"),
                "datasets": [],
                "metadata": metadata,
            },
        )
        entry["datasets"].append(experiment["name"])
    return dict(
        sorted(found.items(), key=lambda kv: kv[1]["recorded_at"] or "", reverse=True)
    )


def _provenance_from(metadata: dict) -> Provenance:
    def decode(key: str) -> dict:
        raw = metadata.get(key)
        if not raw or raw == "unknown":
            return {}
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return {}

    code = str(metadata.get("code") or "unknown")
    commit, _, state = code.partition(" ")
    return Provenance(
        recorded_at=str(metadata.get("recorded_at") or ""),
        environment=str(metadata.get("environment") or "unknown"),
        code=Code(commit=commit or None, branch=None, dirty=state == "dirty"),
        models=decode("models"),
        sampling=decode("sampling"),
        prompts=decode("prompts"),
        actor_prompt=metadata.get("actor_prompt") if metadata.get("actor_prompt") != "unknown" else None,
        tools=metadata.get("tools") if metadata.get("tools") != "unknown" else None,
        dataset=metadata.get("dataset") if metadata.get("dataset") != "unknown" else None,
        evaluators=decode("evaluators"),
        judge=metadata.get("judge") if metadata.get("judge") not in ("none", None) else None,
        notes=("reconstructed from Langfuse, so the code axis carries no branch",),
    )


def _comments(api: LangfuseApi, trace_id: str) -> dict[str, str]:
    """The comment each evaluator wrote, which only the scores endpoint returns."""
    try:
        page = api._get("/api/public/v2/scores", traceId=trace_id, limit=PAGE_SIZE)
    except Exception:  # noqa: BLE001
        return {}
    said: dict[str, str] = {}
    for score in page.get("data") or []:
        name = score.get("name")
        comment = score.get("comment")
        if name and comment:
            said[name] = comment
    return said


def _seconds(item: dict) -> float | None:
    start, end = item.get("startTime"), item.get("endTime")
    if not start or not end:
        return None
    try:
        began = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
        ended = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
    except ValueError:
        return None
    return round((ended - began).total_seconds(), 2)


def _output_text(value: object) -> str | None:
    """The e2e task carries its scores here as transport. They are captured per item
    already, so dropping them keeps them out of the structural diff."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        value = {k: v for k, v in value.items() if k != SCORES_KEY}
    return json.dumps(value, sort_keys=True)


def fetch(check_id: str, *, api: LangfuseApi | None = None) -> Run:
    """Rebuild one `check` invocation from Langfuse."""
    api = api or LangfuseApi()
    known = check_ids(api)
    if check_id not in known:
        raise SystemExit(
            f"No run in Langfuse carries check_id {check_id!r}. Known: "
            f"{list(known)[:5]}"
        )
    entry = known[check_id]

    per_eval: dict[str, dict[str, ItemResult]] = {}
    for experiment in _experiments(api):
        metadata = experiment.get("metadata") or {}
        if metadata.get("check_id") != check_id:
            continue
        eval_name = metadata.get("eval") or experiment["name"]
        bucket = per_eval.setdefault(eval_name, {})
        for item in _items(api, experiment["id"]):
            scores = {
                score["name"]: float(score["value"])
                for score in (item.get("scores") or [])
                if isinstance(score.get("value"), (int, float, bool))
            }
            item_id = str(item.get("experimentItemId") or item.get("id"))
            item_metadata = item.get("metadata") or {}
            trace_id = item.get("traceId")
            bucket[item_id] = ItemResult(
                item_id=item_id,
                scores=scores,
                output=_output_text(item.get("output")),
                label=(
                    item_metadata.get("label")
                    or item_metadata.get("note")
                    or item_metadata.get("why")
                )
                if isinstance(item_metadata, dict)
                else None,
                meta=_kept_metadata(item_metadata) if isinstance(item_metadata, dict) else {},
                error="the item was recorded at level ERROR"
                if item.get("level") == "ERROR"
                else None,
                comments=_comments(api, trace_id) if trace_id else {},
                input=_output_text(item.get("input")),
                expected=_output_text(item.get("expectedOutput")),
                trace_id=trace_id,
                seconds=_seconds(item),
            )

    behaviors = []
    for behavior in manifest.BEHAVIORS:
        if not behavior.is_pinned:
            behaviors.append(
                BehaviorResult(behavior.id, "none", None, (), skipped="nothing pins this behavior")
            )
            continue
        evaluator = behavior.evaluator or ""
        assert behavior.eval
        items = per_eval.get(behavior.eval)
        if items is None:
            behaviors.append(
                BehaviorResult(
                    behavior.id,
                    evaluator,
                    None,
                    (),
                    skipped=f"{behavior.eval} is not in this run",
                )
            )
            continue
        rows, values = [], []
        for item_id, result in items.items():
            value = result.scores.get(evaluator)
            if value is not None:
                values.append(value)
            rows.append(
                ItemResult(
                    item_id=item_id,
                    scores=dict(result.scores),
                    output=result.output,
                    label=result.label,
                    error=result.error,
                    comments=dict(result.comments),
                    input=result.input,
                    expected=result.expected,
                    meta=dict(result.meta),
                    trace_id=result.trace_id,
                    seconds=result.seconds,
                )
            )
        behaviors.append(
            BehaviorResult(
                behavior=behavior.id,
                evaluator=evaluator,
                score=sum(values) / len(values) if values else None,
                items=tuple(rows),
            )
        )

    return Run(
        name=check_id,
        label=entry["label"],
        provenance=_provenance_from(entry["metadata"]),
        behaviors=tuple(behaviors),
    )
