"""The decisions API: a decision model answers questions about an input with probabilities and writes no text."""

import asyncio
import hashlib
import json
from contextlib import suppress
from typing import Any

import httpx

from shared.config.base_config import get_config
from shared.utils.langfuse_utils import trace_span

# A call takes about half a second.
TIMEOUT_SECONDS = 10

# Retried as the OpenAI SDK retries the LLM calls: a failed call fails the gate, and a failed gate stops the turn.
RETRIES = 2
RETRY_STATUSES = frozenset({408, 429, 500, 502, 503, 504})
RETRY_BASE_SECONDS = 0.5
MAX_RETRY_SECONDS = 4.0

# Enough of the hash to tell two sets of questions apart in a trace.
FINGERPRINT_LENGTH = 12


def predicate(name: str, instructions: str) -> dict[str, str]:
    """A question the model answers with the probability that it holds."""
    return {"type": "predicate", "name": name, "instructions": instructions}


async def decide(messages: list[dict[str, str]], questions: list[dict[str, Any]], *, name: str) -> dict[str, dict]:
    """Ask the questions about the messages, and return each answer by question name. Raises when the call fails.

    An answer is `{"type": "predicate", "probability": …}`, or `{"type": "refusal"}` when the model would not answer.
    """
    config = get_config()
    body = {"model": config.DECISION_MODEL, "input": messages, "questions": questions}
    fingerprint = hashlib.sha256(json.dumps([messages[:-1], questions]).encode()).hexdigest()[:FINGERPRINT_LENGTH]
    with trace_span(
        name,
        as_type="guardrail",
        input=messages[-1]["content"],
        metadata={"model": config.DECISION_MODEL, "questions": fingerprint},
    ) as span:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await _post(
                client,
                f"{config.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/decisions",
                body,
                {"api-key": config.AZURE_API_KEY or ""},
            )
        response.raise_for_status()
        decision = response.json()
        answers = {answer["name"]: answer for answer in decision["answers"]}
        # A guardrail observation keeps no usage of its own, so the tokens go in metadata.
        span.update(output=answers, metadata={"usage": decision.get("usage")})
        return answers


async def _post(client: httpx.AsyncClient, url: str, body: dict, headers: dict[str, str]) -> httpx.Response:
    """Retry a timeout, a dropped connection, a rate limit or a server error. The last attempt raises or returns as is."""
    for attempt in range(RETRIES):
        try:
            response = await client.post(url, json=body, headers=headers)
        except httpx.TransportError:
            await asyncio.sleep(_retry_delay(None, attempt))
            continue
        if response.status_code not in RETRY_STATUSES:
            return response
        await asyncio.sleep(_retry_delay(response, attempt))
    return await client.post(url, json=body, headers=headers)


def _retry_delay(response: httpx.Response | None, attempt: int) -> float:
    """The server's Retry-After in seconds, or an exponential backoff, capped so the user does not wait long."""
    delay = RETRY_BASE_SECONDS * 2**attempt
    if response is not None:
        with suppress(KeyError, ValueError):
            delay = float(response.headers["retry-after"])
    return min(delay, MAX_RETRY_SECONDS)
