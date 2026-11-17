"""The decisions API: a decision model answers questions about an input with probabilities and writes no text."""

import hashlib
import json
from typing import Any

import httpx

from shared.config.base_config import get_config
from shared.utils.langfuse_utils import trace_guardrail

TIMEOUT_SECONDS = 30


def predicate(name: str, instructions: str) -> dict[str, str]:
    """A question the model answers with the probability that it holds."""
    return {"type": "predicate", "name": name, "instructions": instructions}


async def decide(messages: list[dict[str, str]], questions: list[dict[str, Any]], *, name: str) -> dict[str, dict]:
    """Ask the questions about the messages, and return each answer by question name. Raises when the call fails.

    An answer is `{"type": "predicate", "probability": …}`, or `{"type": "refusal"}` when the model would not answer.
    """
    config = get_config()
    # Azure takes no top-level instructions, so shared context travels as a developer message.
    body = {"model": config.DECISION_MODEL, "input": messages, "questions": questions}
    fingerprint = hashlib.sha256(json.dumps([messages[:-1], questions]).encode()).hexdigest()[:12]
    with trace_guardrail(
        name,
        input=messages[-1]["content"],
        metadata={"model": config.DECISION_MODEL, "questions": fingerprint},
    ) as span:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{config.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/decisions",
                json=body,
                headers={"api-key": config.AZURE_API_KEY or ""},
            )
        response.raise_for_status()
        decision = response.json()
        answers = {answer["name"]: answer for answer in decision["answers"]}
        # A guardrail observation keeps no usage of its own, so the tokens go in metadata.
        span.update(output=answers, metadata={"usage": decision.get("usage")})
        return answers
