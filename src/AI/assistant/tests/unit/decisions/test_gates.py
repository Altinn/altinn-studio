"""The request gate: one decisions call, read against two thresholds."""

import json
from unittest.mock import patch

import httpx
import pytest

from agents.services.decisions.gates import (
    CONCERN_THRESHOLD,
    CONCERNS,
    QUESTIONS,
    RELEVANCE,
    RELEVANCE_THRESHOLD,
    build_request_message,
    judge,
    judge_request,
)

OFFER = "Jeg kan fjerne de to TODO-ene som v9-oppgraderingen la igjen."


def _answers(relevance: float = 1.0, **concerns: float) -> dict[str, dict]:
    probabilities = {RELEVANCE: relevance, **dict.fromkeys(CONCERNS, 0.0), **concerns}
    return {name: {"type": "predicate", "name": name, "probability": p} for name, p in probabilities.items()}


def _refusal(name: str) -> dict:
    return {"type": "refusal", "name": name}


def _decisions_api(handler):
    """Route the client's HTTP calls to `handler`."""
    real_client = httpx.AsyncClient
    return patch(
        "agents.services.decisions.client.httpx.AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )


class TestTheQuestions:
    def test_relevance_and_every_concern_are_asked(self):
        assert [q["name"] for q in QUESTIONS] == [RELEVANCE, *CONCERNS]
        assert all(q["type"] == "predicate" and q["instructions"] for q in QUESTIONS)

    def test_the_safety_file_holds_the_concerns(self):
        assert set(CONCERNS) == {"injection", "secrets", "outside_repository", "run_code", "other_service_owner"}


class TestJudge:
    def test_a_clear_request_passes(self):
        judgment = judge(_answers())

        assert judgment.relevant and judgment.safe and not judgment.failed
        assert judgment.concern is None

    def test_relevance_below_the_threshold_is_not_relevant(self):
        assert not judge(_answers(relevance=RELEVANCE_THRESHOLD - 0.01)).relevant
        assert judge(_answers(relevance=RELEVANCE_THRESHOLD)).relevant

    def test_one_concern_at_the_threshold_makes_the_request_unsafe(self):
        judgment = judge(_answers(secrets=CONCERN_THRESHOLD))

        assert not judgment.safe
        assert judgment.concern == "secrets"
        assert judgment.reason == CONCERNS["secrets"]

    def test_concerns_below_the_threshold_do_not_add_up(self):
        below = CONCERN_THRESHOLD - 0.01
        assert judge(_answers(**dict.fromkeys(CONCERNS, below))).safe

    def test_the_top_concern_is_the_reason(self):
        assert judge(_answers(injection=0.6, run_code=0.9)).concern == "run_code"

    def test_a_refused_concern_counts_as_holding(self):
        answers = {**_answers(), "injection": _refusal("injection")}

        judgment = judge(answers)

        assert not judgment.safe
        assert judgment.concern == "injection"

    def test_a_refused_relevance_counts_as_relevant(self):
        assert judge({**_answers(), RELEVANCE: _refusal(RELEVANCE)}).relevant


class TestTheMessage:
    def test_the_goal_alone(self):
        assert build_request_message("fjern side 3") == "Request: fjern side 3"

    def test_attachment_names_but_not_their_content(self):
        message = build_request_message("lag skjemaet", ["skjema.pdf", "vedlegg.png"])

        assert message.endswith("Attachment filenames (content not shown): skjema.pdf, vedlegg.png")

    def test_the_recent_turns_come_before_the_request(self):
        message = build_request_message("ja, fiks det", conversation=[{"role": "assistant", "content": OFFER}])

        assert message.index(OFFER) < message.index("Request: ja, fiks det")


class TestJudgeRequest:
    async def test_asks_the_decisions_api_in_one_call(self):
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(200, json={"answers": list(_answers().values()), "usage": {"input_tokens": 1}})

        with _decisions_api(handler):
            judgment = await judge_request("legg til et felt", ["skjema.pdf"])

        assert judgment.relevant and judgment.safe
        assert len(requests) == 1
        assert requests[0].url.path == "/openai/v1/decisions"
        body = json.loads(requests[0].content)
        assert [m["role"] for m in body["input"]] == ["developer", "user"]
        assert "skjema.pdf" in body["input"][1]["content"]
        assert [q["name"] for q in body["questions"]] == [RELEVANCE, *CONCERNS]
        assert body["model"] == "gpt-6-luna"

    @pytest.mark.parametrize(
        "failure",
        [
            lambda request: httpx.Response(500, json={"error": "boom"}),
            lambda request: httpx.Response(400, json={"error": {"code": "unknown_parameter"}}),
        ],
    )
    async def test_an_error_response_fails_the_gate(self, failure):
        with _decisions_api(failure):
            judgment = await judge_request("legg til et felt")

        assert judgment.failed
        assert not judgment.safe

    async def test_a_timeout_fails_the_gate(self):
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("slow", request=request)

        with _decisions_api(handler):
            judgment = await judge_request("legg til et felt")

        assert judgment.failed
        assert not judgment.safe
