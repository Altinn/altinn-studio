"""Rebuild a real decision sequence from a production trace."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

import httpx

LOOP_CALL_NAME = "agentic_loop_llm_call"
# One entry per trace.
SYSTEM_PROMPTS_FILE = "loop_traces.prompts.json"
TOOL_SPAN_PREFIX = "tool_"

VERIFICATION_LEVELS = {
    "app-verified": "a person opened the produced app and confirmed it",
    "app-verified-with-defect": (
        "a person opened the produced app and found a bounded defect. Usable for tool "
        "choice, ordering and coverage, which the defect does not touch. Not usable for "
        "any expectation about the content a decision wrote."
    ),
    "trace-verified": "the trace reads correctly, the app itself was not opened",
    "known-defect": "the run produced a defect; expectations need editing before use",
}

# Content assertions, not call choice.
CONTENT_RULE_KEYS = frozenset({"arguments", "content"})


@dataclass
class Turn:
    """One assistant turn and the results its calls returned."""

    text: str
    calls: list[dict[str, Any]] = field(default_factory=list)
    results: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class HarvestedTrace:
    trace_id: str
    goal: str
    available_tools: list[str]
    turns: list[Turn]
    system_prompt: str = ""


class TraceReader:
    """Reads one trace out of Langfuse, observations and all."""

    def __init__(self, client: httpx.Client):
        self._client = client

    def _get(self, path: str, **params: Any) -> dict:
        response = self._client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    def observations(self, trace_id: str) -> list[dict]:
        """Every observation, in the order it started."""
        found: list[dict] = []
        cursor = None
        while True:
            params: dict[str, Any] = {
                "traceId": trace_id,
                "limit": 100,
                "fields": "core",
            }
            if cursor:
                params["cursor"] = cursor
            page = self._get("/api/public/v2/observations", **params)
            found += page.get("data") or []
            cursor = (page.get("meta") or {}).get("cursor")
            if not cursor:
                break
        rows = [self._get(f"/api/public/observations/{row['id']}") for row in found]
        return sorted(rows, key=lambda row: row.get("startTime") or "")

    def trace(self, trace_id: str) -> dict:
        return self._get(f"/api/public/traces/{trace_id}")


def _tool_result(span: dict) -> dict[str, Any]:
    """One tool result, unwrapped."""
    output = span.get("output")
    is_error = (span.get("level") or "").upper() in {"ERROR", "WARNING"}
    if isinstance(output, dict) and "content" in output:
        is_error = bool(output.get("is_error", is_error))
        output = output["content"]
    if not isinstance(output, str):
        output = json.dumps(output, ensure_ascii=False) if output is not None else ""
    return {
        "name": (span.get("name") or "")[len(TOOL_SPAN_PREFIX):],
        "content": output,
        "is_error": is_error,
    }


def read_trace(reader: TraceReader, trace_id: str) -> HarvestedTrace:
    trace = reader.trace(trace_id)
    goal = ((trace.get("input") or {}).get("user_goal") or "").strip()
    rows = reader.observations(trace_id)

    turns: list[Turn] = []
    available: list[str] = []
    system_prompt = ""
    for row in rows:
        name = row.get("name") or ""
        if name == LOOP_CALL_NAME:
            output = row.get("output") or {}
            call_input = row.get("input") or {}
            available = available or (call_input.get("available_tools") or [])
            system_prompt = system_prompt or (call_input.get("system_prompt") or "")
            index = len(turns)
            turns.append(
                Turn(
                    text=output.get("text") or "",
                    calls=[
                        {
                            "id": f"d{index}c{position}",
                            "name": call.get("name"),
                            "input": call.get("input") or {},
                        }
                        for position, call in enumerate(output.get("tool_calls") or [])
                    ],
                )
            )
        elif name.startswith(TOOL_SPAN_PREFIX) and turns:
            turns[-1].results.append(_tool_result(row))

    return HarvestedTrace(
        trace_id=trace_id,
        goal=goal,
        available_tools=available,
        turns=turns,
        system_prompt=system_prompt,
    )


def conversation_up_to(harvest: HarvestedTrace, decision: int) -> list[dict[str, Any]]:
    """The conversation the model saw before `decision`; 0 is the goal alone."""
    if not 0 <= decision < len(harvest.turns):
        raise IndexError(
            f"trace {harvest.trace_id} has {len(harvest.turns)} decisions, asked for {decision}"
        )
    conversation: list[dict[str, Any]] = [{"role": "user", "text": harvest.goal}]
    for index, turn in enumerate(harvest.turns[:decision]):
        if len(turn.calls) != len(turn.results):
            raise ValueError(
                f"trace {harvest.trace_id} turn {index} has {len(turn.calls)} call(s) "
                f"and {len(turn.results)} result(s); cannot pair them"
            )
        conversation.append(
            {"role": "assistant", "text": turn.text, "tool_calls": turn.calls}
        )
        if turn.results:
            conversation.append(
                {
                    "role": "user",
                    "tool_results": [
                        {
                            "tool_use_id": call["id"],
                            "content": result["content"],
                            "is_error": result["is_error"],
                        }
                        for call, result in zip(turn.calls, turn.results)
                    ],
                }
            )
    return conversation


def item_from_decision(
    harvest: HarvestedTrace,
    decision: int,
    *,
    item_id: str,
    note: str,
    verification: str,
    rule: dict[str, Any] | None = None,
    defect: str | None = None,
    regression: bool = False,
) -> dict[str, Any]:
    """A dataset item for one real decision."""
    if verification not in VERIFICATION_LEVELS:
        raise ValueError(
            f"unknown verification {verification!r}, expected one of {sorted(VERIFICATION_LEVELS)}"
        )
    if regression and not defect:
        raise ValueError(
            f"{item_id} is marked a regression but names no defect; a regression item "
            "asserts the behavior the source run got wrong, so say what that was"
        )
    if defect and not regression and rule and CONTENT_RULE_KEYS & rule.keys():
        raise ValueError(
            f"{item_id} scores content from a decision with a known defect "
            f"({defect}); score the tool choice instead"
        )
    turn = harvest.turns[decision]
    tools = [call["name"] for call in turn.calls]
    return {
        "id": item_id,
        "input": {
            "goal": harvest.goal,
            "conversation": conversation_up_to(harvest, decision),
            "tools": harvest.available_tools or None,
            "system_prompt_trace": harvest.trace_id,
        },
        "expectedOutput": {
            "tool_calls": [
                {
                    "tool": call["name"],
                    "arguments_json": json.dumps(call["input"], ensure_ascii=False),
                }
                for call in turn.calls
            ],
            "done": not turn.calls,
            "rule": rule or {"required_tools": sorted(set(tools))},
        },
        "metadata": {
            "note": note,
            "verification": verification,
            "source_trace": harvest.trace_id,
            "source_decision": decision,
            "observed_tools": tools,
            **({"defect": defect} if defect else {}),
            **({"regression": True} if regression else {}),
        },
    }


def decisions(harvest: HarvestedTrace) -> Iterator[tuple[int, list[str], int]]:
    """Index, tool names and call count per decision, for choosing items."""
    for index, turn in enumerate(harvest.turns):
        yield index, [call["name"] for call in turn.calls], len(turn.calls)


PLANNER_PROMPT = "intake_planning"


def planner_items(reader: TraceReader, trace_ids: list[str]) -> list[dict[str, Any]]:
    """Dataset items for the intake planner, one per trace."""
    items = []
    for trace_id in trace_ids:
        for row in reader.observations(trace_id):
            if row.get("promptName") != PLANNER_PROMPT:
                continue
            call = row.get("input") or {}
            response = (row.get("output") or {}).get("response") or ""
            plan = _first_json_object(response)
            if not plan:
                continue
            items.append(
                {
                    "id": f"intake-{plan.get('task_type', 'unknown')}",
                    "input": {
                        "user_message": call.get("user_message") or "",
                        "system_message": call.get("system_message") or "",
                    },
                    "expectedOutput": {
                        "intent_keywords": _intent_keywords(plan.get("task_type") or ""),
                        "required_keys": sorted(plan),
                    },
                    "metadata": {
                        "note": f"The intake node classified this request as "
                        f"{plan.get('task_type')!r}. A wrong classification sends the "
                        f"whole workflow down the wrong path before any file is read. "
                        f"Scored on the intent family rather than the exact string, "
                        f"because task_type has no enum: a model can answer correctly "
                        f"in its own vocabulary and an exact match would call that a "
                        f"regression.",
                        "observed_task_type": plan.get("task_type"),
                        "verification": "trace-verified",
                        "source_trace": trace_id,
                        "observed_model": row.get("model"),
                    },
                }
            )
            break
    return items


INTENT_FAMILIES = {
    "create": ("create", "recreate", "new", "build", "lag"),
    "convert": ("convert", "konverter", "migrate", "transform"),
    "fix": ("fix", "correct", "repair", "config", "resolve"),
    "delete": ("delete", "remove", "slett", "drop"),
    "add": ("add", "insert", "append"),
    "update": ("update", "modify", "change", "edit", "endre"),
}


def _intent_keywords(task_type: str) -> list[str]:
    """The words any correct answer to this item may use."""
    lowered = task_type.lower()
    for words in INTENT_FAMILIES.values():
        if any(word in lowered for word in words):
            return list(words)
    return [lowered] if lowered else []


def _first_json_object(text: str) -> dict[str, Any] | None:
    import re

    match = re.search(r"\{.*\}", text or "", re.S)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def main() -> int:
    """Rebuild the harvested dataset file from the spec."""
    import argparse
    import os

    from .dataset_sync import DATASETS_DIR

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--spec", default=str(DATASETS_DIR / "harvest_spec.json"), help="harvest spec"
    )
    parser.add_argument("--list", metavar="TRACE_ID", help="print a trace's decisions")
    parser.add_argument(
        "--planner",
        action="store_true",
        help="rebuild the intake planner dataset instead of the loop dataset",
    )
    args = parser.parse_args()

    host = os.environ.get("LANGFUSE_HOST") or os.environ.get("LANGFUSE_BASE_URL")
    auth = (os.environ.get("LANGFUSE_PUBLIC_KEY"), os.environ.get("LANGFUSE_SECRET_KEY"))
    if not host or not all(auth):
        raise SystemExit("Set LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY")

    with httpx.Client(base_url=host.rstrip("/"), auth=auth, timeout=240) as client:
        reader = TraceReader(client)

        if args.list:
            harvest = read_trace(reader, args.list)
            print(f"goal: {harvest.goal[:100]}")
            for index, tools, count in decisions(harvest):
                print(f"  {index:2}  {count:2} call(s)  {tools}")
            return 0

        spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))

        if args.planner:
            trace_ids = [entry["trace_id"] for entry in spec["traces"]] + list(
                spec.get("planner_only_traces") or []
            )
            planner = planner_items(reader, trace_ids)
            destination = DATASETS_DIR / "planner_intake.jsonl"
            with destination.open("w", encoding="utf-8") as handle:
                for item in planner:
                    handle.write(json.dumps(item, ensure_ascii=False) + "\n")
            for item in planner:
                print(f"  {item['id']}  from {item['metadata']['source_trace'][:12]}")
            print(f"\n{destination}: {len(planner)} items")
            return 0

        items = []
        collected_prompts: dict[str, str] = {}
        for entry in spec["traces"]:
            harvest = read_trace(reader, entry["trace_id"])
            if harvest.system_prompt:
                collected_prompts[harvest.trace_id] = harvest.system_prompt
            else:
                print(f"  no system prompt in {harvest.trace_id}, keeping the recorded one")
            print(f"{entry['trace_id']}: {len(harvest.turns)} decisions "
                  f"({entry['verification']})")
            for pick in entry["items"]:
                if pick.get("skip"):
                    print(f"  skipped {pick['id']}: {pick['skip'][:64]}...")
                    continue
                items.append(
                    item_from_decision(
                        harvest,
                        pick["decision"],
                        item_id=pick["id"],
                        note=pick["note"],
                        verification=entry["verification"],
                        rule=pick.get("rule"),
                        defect=pick.get("defect"),
                        regression=pick.get("regression", False),
                    )
                )
                print(f"  {pick['id']}")

    destination = DATASETS_DIR / spec["output"]
    with destination.open("w", encoding="utf-8") as handle:
        for item in items:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")

    prompts_path = DATASETS_DIR / SYSTEM_PROMPTS_FILE
    prompts = json.loads(prompts_path.read_text(encoding="utf-8")) if prompts_path.exists() else {}
    prompts.update(collected_prompts)
    prompts_path.write_text(
        json.dumps(prompts, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"\n{destination}: {len(items)} items")
    print(f"{prompts_path}: {len(prompts)} session prompt(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
