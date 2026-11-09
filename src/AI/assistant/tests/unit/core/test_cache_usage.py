"""A cache hit the provider reports has to reach the trace, or a run reads as all fresh input."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.core.llm_adapter import AnthropicAdapter, LLMAdapter, OpenAIAdapter, _usage_details
from agents.core.messages import Message, UserMessage

MESSAGES: list[Message] = [UserMessage(content="say ok")]


def _completion(prompt_tokens: int, cached: int | None):
    details = SimpleNamespace(cached_tokens=cached) if cached is not None else None
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content="ok", tool_calls=[]),
                finish_reason="stop",
            )
        ],
        usage=SimpleNamespace(
            prompt_tokens=prompt_tokens,
            completion_tokens=7,
            prompt_tokens_details=details,
        ),
    )


def _anthropic_message(cache_read: int | None, cache_creation: int | None):
    # The SDK types both cache counts as optional, with None when the endpoint leaves them out.
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text="ok")],
        stop_reason="end_turn",
        usage=SimpleNamespace(
            input_tokens=2,
            output_tokens=610,
            cache_read_input_tokens=cache_read,
            cache_creation_input_tokens=cache_creation,
        ),
    )


async def _traced_chat(adapter: LLMAdapter) -> tuple[dict, dict]:
    span = MagicMock()
    with patch("agents.core.llm_adapter.trace_generation") as traced:
        traced.return_value.__enter__.return_value = span
        assistant = await adapter.chat(messages=MESSAGES, system_prompt="s", tool_schemas=[])
    return assistant.usage, span.update.call_args.kwargs["usage_details"]


async def _chat(adapter: OpenAIAdapter, completion) -> tuple[dict, dict]:
    adapter._client = MagicMock()
    adapter._client.chat.completions.create = AsyncMock(return_value=completion)
    return await _traced_chat(adapter)


async def _chat_anthropic(adapter: AnthropicAdapter, message) -> tuple[dict, dict]:
    adapter._stream_or_fallback = AsyncMock(return_value=message)
    return await _traced_chat(adapter)


@pytest.fixture
def adapter():
    with patch.object(OpenAIAdapter, "__init__", lambda self, **kw: None):
        made = OpenAIAdapter(model="gpt-5.6-terra")
    made.model = "gpt-5.6-terra"
    made.max_tokens = 1024
    made._is_reasoning = True
    made._reasoning_effort = "low"
    return made


@pytest.fixture
def claude():
    with patch.object(AnthropicAdapter, "__init__", lambda self, **kw: None):
        made = AnthropicAdapter(model="claude-sonnet-5-5")
    made.model = "claude-sonnet-5-5"
    made.max_tokens = 1024
    return made


class TestCachedPromptTokens:
    async def test_a_cache_hit_is_reported_apart_from_fresh_input(self, adapter):
        usage, details = await _chat(adapter, _completion(1821, 1818))

        assert usage["cache_read_input_tokens"] == 1818
        assert details["input_cache_read"] == 1818
        assert details["input"] == 3

    async def test_the_total_still_counts_every_prompt_token(self, adapter):
        _, details = await _chat(adapter, _completion(1821, 1818))

        assert details["total"] == 1828

    async def test_a_miss_reports_the_whole_prompt_as_fresh(self, adapter):
        usage, details = await _chat(adapter, _completion(1821, 0))

        assert usage["cache_read_input_tokens"] == 0
        assert details["input"] == 1821

    async def test_a_provider_that_omits_the_detail_is_treated_as_a_miss(self, adapter):
        usage, details = await _chat(adapter, _completion(1821, None))

        assert usage["cache_read_input_tokens"] == 0
        assert details["input"] == 1821


class TestAnthropicCacheTokens:
    """Langfuse counts a usage key it has no price for as free, so a cache kind
    under another name drops out of the cost."""

    async def test_cache_reads_and_writes_reach_the_trace_under_the_names_langfuse_prices(self, claude):
        _, details = await _chat_anthropic(claude, _anthropic_message(cache_read=37082, cache_creation=221))

        assert details == {
            "input": 2,
            "output": 610,
            "input_cache_read": 37082,
            "input_cache_creation": 221,
            "total": 37915,
        }

    async def test_an_endpoint_that_omits_the_cache_counts_is_treated_as_a_miss(self, claude):
        usage, details = await _chat_anthropic(claude, _anthropic_message(cache_read=None, cache_creation=None))

        assert usage["cache_read_input_tokens"] == 0
        assert usage["cache_creation_input_tokens"] == 0
        assert details["total"] == 612


class TestTotalIsComparableAcrossProviders:
    """Anthropic omits cache reads from input, Azure includes them, so the total
    cannot be built from either provider's own input figure."""

    def test_an_anthropic_turn_counts_its_cache_reads(self):
        details = _usage_details(fresh=2, output=610, cache_read=37082, cache_creation=221)

        assert details["input"] == 2
        assert details["total"] == 37915

    def test_an_azure_turn_of_the_same_size_reports_the_same_total(self):
        details = _usage_details(fresh=2, output=610, cache_read=37303)

        assert details["total"] == 37915

    def test_a_turn_with_no_caching_is_input_plus_output(self):
        assert _usage_details(fresh=1821, output=7)["total"] == 1828
