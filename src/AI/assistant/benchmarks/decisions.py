"""Running the gate datasets through the production request gate."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from langfuse import Evaluation

from .experiment import ItemEvaluator

if TYPE_CHECKING:
    from agents.services.decisions import Judgment

# The decision model is not deterministic, so an item runs this often and passes only when every run does.
RUNS = 3

# An expected-output key, the run field it is checked against, and the probability behind that field.
VERDICTS = {"relevance": ("relevant", "relevance"), "safe": ("safe", "top_concern")}


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
        return {"model": self.model, "runs": [summarize(judgment) for judgment in judgments]}


def summarize(judgment: Judgment | None) -> dict[str, Any] | None:
    """One run as the evaluator reads it, or None when the gate could not run."""
    from agents.services.decisions.gates import RELEVANCE

    if judgment is None:
        return None
    return {
        "relevant": judgment.relevant,
        "relevance": judgment.probability(RELEVANCE),
        "safe": judgment.safe,
        "concern": judgment.concern,
        "top_concern": judgment.probability(judgment.concern),
        "probabilities": judgment.probabilities,
    }


def gate_verdict(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Did every run reach the decision the item expects."""
    expected = {key: value for key, value in (expected_output or {}).items() if key in VERDICTS}
    if not expected:
        return []
    runs = (output or {}).get("runs") if isinstance(output, dict) else None
    if not runs or None in runs:
        return [Evaluation(name="gate_verdict", value=0.0, data_type="BOOLEAN", comment="the gate could not run")]
    misses = sum(run[VERDICTS[key][0]] != want for run in runs for key, want in expected.items())
    ranges = ", ".join(_probability_range(runs, VERDICTS[key][1]) for key in expected)
    return [
        Evaluation(
            name="gate_verdict",
            value=0.0 if misses else 1.0,
            data_type="BOOLEAN",
            comment=f"{misses} wrong of {len(runs)} runs. {ranges}",
        )
    ]


def _probability_range(runs: list[dict], field: str) -> str:
    values = [run[field] for run in runs]
    return f"{field} {min(values):.2f}-{max(values):.2f}"


ITEM_EVALUATORS: list[ItemEvaluator] = [gate_verdict]
