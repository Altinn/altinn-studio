"""The chat-completions payload is a contract, and getting it wrong is a 400."""

from __future__ import annotations

import pytest

from agents.core.llm_adapter import _is_reasoning_model, build_openai_request

MESSAGES = [{"role": "user", "content": "hei"}]
TOOL_SCHEMAS = [{"name": "read_file", "description": "read", "input_schema": {}}]
BUDGET = 32768

# A prefix rule, so the rule is tested rather than the deployments of the day.
REASONING_PREFIXES = ["o1", "o3", "gpt-5"]
NON_REASONING = ["gpt-4o", "gpt-4.1", "claude-sonnet-5", "claude-haiku-4-5", ""]


def _request(model_is_reasoning: bool, *, tools=None, effort="low") -> dict:
    return build_openai_request(
        model="m",
        messages=MESSAGES,
        max_tokens=BUDGET,
        is_reasoning=model_is_reasoning,
        reasoning_effort=effort,
        tool_schemas=tools,
    )


class TestTokenBudget:
    def test_a_reasoning_model_gets_max_completion_tokens(self):
        request = _request(True)

        assert request["max_completion_tokens"] == BUDGET
        assert "max_tokens" not in request

    def test_others_get_max_tokens(self):
        request = _request(False)

        assert request["max_tokens"] == BUDGET
        assert "max_completion_tokens" not in request


class TestReasoningEffort:
    def test_tools_force_the_effort_to_none(self):
        """chat/completions rejects function tools alongside a non-none effort.
        The loop always sends tools, so tools win."""
        request = _request(True, tools=TOOL_SCHEMAS, effort="low")

        assert request["extra_body"]["reasoning_effort"] == "none"
        assert request["tools"]

    def test_without_tools_the_configured_effort_is_used(self):
        request = _request(True, tools=None, effort="medium")

        assert request["extra_body"]["reasoning_effort"] == "medium"

    def test_a_non_reasoning_model_is_sent_no_effort(self):
        request = _request(False, tools=TOOL_SCHEMAS)

        assert "extra_body" not in request


class TestTemperature:
    @pytest.mark.parametrize("is_reasoning", [True, False])
    def test_temperature_is_never_sent(self, is_reasoning):
        """Reasoning models reject it outright, and the loop does not rely on it."""
        assert "temperature" not in _request(is_reasoning)


class TestTheReasoningModelRule:
    @pytest.mark.parametrize("prefix", REASONING_PREFIXES)
    def test_a_prefixed_model_is_a_reasoning_model(self, prefix):
        for name in (prefix, f"{prefix}-mini", f"{prefix}.6-somename"):
            assert _is_reasoning_model(name), f"{name} must classify, or every call 400s"

    @pytest.mark.parametrize("model", NON_REASONING)
    def test_anything_else_is_not(self, model):
        assert not _is_reasoning_model(model)

    def test_no_model_is_not(self):
        assert not _is_reasoning_model(None)

    def test_the_rule_is_case_insensitive(self):
        assert _is_reasoning_model("GPT-5.6-Terra")


class TestShapeInvariants:
    def test_the_model_and_messages_always_travel(self):
        request = _request(True, tools=TOOL_SCHEMAS)

        assert request["model"] == "m"
        assert request["messages"] == MESSAGES

    def test_no_tools_means_no_tools_key(self):
        """An empty tools list is not the same as omitting it for some endpoints."""
        assert "tools" not in _request(True, tools=[])
