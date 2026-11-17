"""Running the gate datasets through the production request gate."""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass
from typing import Any

from langfuse import Evaluation

from .experiment import ItemEvaluator

# The decision model is not deterministic, so an item runs this often and passes only when every run does.
RUNS = 3

# An expected-output key, and the judgment field it is checked against.
VERDICTS = {"relevance": "relevant", "safe": "safe"}


@dataclass
class DecisionTask:
    """One request judged RUNS times by the same call production makes."""

    model: str

    async def __call__(self, *, item: Any, **_: Any) -> dict[str, Any]:
        from agents.services.decisions.gates import judge_request

        from .agent_task import item_field

        request = item_field(item, "input") or {}
        judgments = await asyncio.gather(
            *(
                judge_request(request["goal"], request.get("attachments") or (), request.get("conversation"))
                for _ in range(RUNS)
            )
        )
        return {"model": self.model, "runs": [asdict(judgment) for judgment in judgments]}


def gate_verdict(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Did every run reach the decision the item expects."""
    expected = {key: value for key, value in (expected_output or {}).items() if key in VERDICTS}
    if not expected:
        return []
    runs = (output or {}).get("runs") if isinstance(output, dict) else None
    if not runs or any(run["failed"] for run in runs):
        return [Evaluation(name="gate_verdict", value=0.0, data_type="BOOLEAN", comment="the gate could not run")]
    misses = sum(run[VERDICTS[key]] != want for run in runs for key, want in expected.items())
    ranges = ", ".join(_probability_range(runs, key) for key in expected)
    return [
        Evaluation(
            name="gate_verdict",
            value=0.0 if misses else 1.0,
            data_type="BOOLEAN",
            comment=f"{misses} wrong of {len(runs)} runs; {ranges}",
        )
    ]


def _probability_range(runs: list[dict], key: str) -> str:
    """The relevance probability, or for safety the top concern's, as min to max over the runs."""
    from agents.services.decisions.gates import CONCERNS, RELEVANCE

    if key == "relevance":
        name, values = RELEVANCE, [run["probabilities"].get(RELEVANCE, 1.0) for run in runs]
    else:
        name, values = "top concern", [max(run["probabilities"].get(c, 1.0) for c in CONCERNS) for run in runs]
    return f"{name} {min(values):.2f}-{max(values):.2f}"


ITEM_EVALUATORS: list[ItemEvaluator] = [gate_verdict]
