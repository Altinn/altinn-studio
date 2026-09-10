"""Provider adapters for the agentic loop."""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Callable

from shared.config.base_config import get_config
from shared.utils.langfuse_utils import trace_generation
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

from .messages import (
    AssistantMessage,
    ContentBlock,
    Message,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    extract_text,
    extract_tool_uses,
)


def _trace_input_summary(
    messages: list["Message"],
    system_prompt: str,
    tool_schemas: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compact, Langfuse-safe view of an LLM call's input."""
    return {
        "system_prompt": system_prompt,
        "message_count": len(messages),
        "last_user_text": _last_user_text_snippet(messages),
        "available_tools": [s["name"] for s in tool_schemas],
    }


def _last_user_text_snippet(messages: list["Message"]) -> str:
    """Return a small excerpt of the most recent user/tool_result content
    so traces show what triggered this LLM call."""
    for msg in reversed(messages):
        if isinstance(msg, UserMessage):
            content = msg.content
            if isinstance(content, str):
                return content[:500]
            if isinstance(content, list):
                snippets: list[str] = []
                for block in content:
                    if isinstance(block, TextBlock):
                        snippets.append(block.text)
                    elif isinstance(block, ToolResultBlock):
                        snippets.append(f"[tool_result {'err' if block.is_error else 'ok'}]: {block.content[:200]}")
                return "\n".join(snippets)[:500]
    return ""


def _trace_output_summary(response: "AssistantMessage") -> dict[str, Any]:
    """Compact view of an assistant turn for Langfuse output."""
    return {
        "text": extract_text(response),
        "tool_calls": [
            {"name": tc.name, "input": tc.input}
            for tc in extract_tool_uses(response)
        ],
        "stop_reason": response.stop_reason,
    }


_DEFAULT_MAX_TOKENS = 16384
# 16k default for the OpenAI chat-completions path — gpt-4o-class models
# cap output at 16384, so a higher shared default would 400 there.
#
# Reasoning models (o1/o3/gpt-5/…) charge their internal chain-of-thought
# against max_tokens.  An 8k budget gets eaten by reasoning before any
# output reaches us; 32k matches what LLMClient uses for reasoning models.
_REASONING_MAX_TOKENS = 32768

# Claude models stream and support much larger outputs (Sonnet-tier: 64k).
# The agentic actor batches multiple `write_file` calls carrying full
# layout/resource JSON in one turn — a five-page form comfortably exceeds
# 16k of output, and truncation mid-tool_use forces a recovery round-trip
# (observed in production: output_tokens=16384 == cap → workflow ended
# with zero files changed).  Env-overridable for models with other caps.
_ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "64000"))


TextDeltaCallback = Callable[[str, str], None]
"""Signature `(delta, accumulated) -> None`.

Adapters that support token streaming invoke this once per text chunk
emitted by the model.  `delta` is the new fragment; `accumulated` is
the full text the model has produced this turn so far.  Adapters that
don't stream (or are asked not to) simply ignore the callback.
"""

ToolUseStartCallback = Callable[[str, str], None]
"""Signature `(tool_name, tool_use_id) -> None`.

Fired when the model begins emitting a `tool_use` block, before the
input JSON has finished streaming.  This is the key visibility hook
for the long tail of every turn: after the model's narration text
finishes streaming it spends the rest of the turn producing tool_use
input (often kilobytes of JSON per file write) and no text deltas
arrive.  Without this callback the UI would freeze on the last text
for the entire tool-generation window.
"""


class LLMAdapter(ABC):
    """Provider-neutral chat interface used by the loop."""

    model: str

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        system_prompt: str,
        tool_schemas: list[dict[str, Any]],
        *,
        on_text_delta: TextDeltaCallback | None = None,
        on_tool_use_start: ToolUseStartCallback | None = None,
    ) -> AssistantMessage:
        """Send one turn and return the model's response."""


# ---------------------------------------------------------------------------
# Anthropic
# ---------------------------------------------------------------------------


class AnthropicAdapter(LLMAdapter):
    """Talks to Claude via the Anthropic SDK."""

    def __init__(self, *, model: str, max_tokens: int = _ANTHROPIC_MAX_TOKENS) -> None:
        from anthropic import AsyncAnthropic  # local import — optional dep at runtime

        config = get_config()
        if config.AZURE_ANTHROPIC_ENDPOINT and config.AZURE_ANTHROPIC_API_KEY:
            self._client = AsyncAnthropic(
                api_key=config.AZURE_ANTHROPIC_API_KEY,
                base_url=config.AZURE_ANTHROPIC_ENDPOINT,
                timeout=600.0,
            )
        elif config.ANTHROPIC_API_KEY:
            self._client = AsyncAnthropic(
                api_key=config.ANTHROPIC_API_KEY,
                timeout=600.0,
            )
        else:
            raise ValueError(
                "AnthropicAdapter requires AZURE_ANTHROPIC_ENDPOINT with "
                "AZURE_ANTHROPIC_API_KEY (or AZURE_API_KEY when the Anthropic "
                "endpoint is on the same resource), or ANTHROPIC_API_KEY."
            )
        self.model = model
        self.max_tokens = max_tokens

    async def _stream_or_fallback(
        self,
        *,
        kwargs: dict[str, Any],
        on_text_delta: TextDeltaCallback | None,
        on_tool_use_start: ToolUseStartCallback | None,
    ) -> Any:
        """Stream the response, fall back to non-streaming on transient drops."""
        accumulated_text = ""
        try:
            async with self._client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    event_type = getattr(event, "type", None)
                    if event_type == "content_block_start":
                        block = getattr(event, "content_block", None)
                        if block is not None and getattr(block, "type", None) == "tool_use":
                            if on_tool_use_start is not None:
                                try:
                                    on_tool_use_start(
                                        getattr(block, "name", "") or "",
                                        getattr(block, "id", "") or "",
                                    )
                                except Exception:  # noqa: BLE001
                                    log.debug("on_tool_use_start raised", exc_info=True)
                    elif event_type == "content_block_delta":
                        delta = getattr(event, "delta", None)
                        delta_type = getattr(delta, "type", None) if delta is not None else None
                        if delta_type == "text_delta":
                            text = getattr(delta, "text", "")
                            if text and on_text_delta is not None:
                                accumulated_text += text
                                try:
                                    on_text_delta(text, accumulated_text)
                                except Exception:  # noqa: BLE001
                                    log.debug("on_text_delta raised", exc_info=True)
                        # input_json_delta is intentionally ignored — the
                        # tool_use_start hook already told the UI which
                        # tool is generating, and surfacing partial JSON
                        # would be noisy without parsing it.
                return await stream.get_final_message()
        except Exception as exc:  # noqa: BLE001
            # Only fall back on the transient transport errors the SDK
            # surfaces for dropped chunked SSE bodies.  Real API errors
            # (4xx/5xx with bodies, auth, etc.) are raised by `messages.stream`
            # too and would re-raise on `messages.create` — bubbling up is
            # correct for those, but we can't distinguish here cheaply.
            # Pragma: a single fallback is harmless even for non-transient
            # errors — the second call will raise the same exception and
            # the loop's outer handler turns it into a clean termination.
            log.warning(
                "Streaming chat failed (%s: %s); retrying without streaming.",
                type(exc).__name__,
                exc,
            )
            return await self._client.messages.create(**kwargs)

    async def chat(
        self,
        messages: list[Message],
        system_prompt: str,
        tool_schemas: list[dict[str, Any]],
        *,
        on_text_delta: TextDeltaCallback | None = None,
        on_tool_use_start: ToolUseStartCallback | None = None,
    ) -> AssistantMessage:
        with trace_generation(
            "agentic_loop_llm_call",
            model=self.model,
            input=_trace_input_summary(messages, system_prompt, tool_schemas),
            metadata={"role": "actor", "provider": "anthropic"},
        ) as span:
            api_messages = [_message_to_anthropic(m) for m in messages]
            _mark_last_block_cacheable(api_messages)
            kwargs: dict[str, Any] = {
                "model": self.model,
                "system": [
                    {
                        "type": "text",
                        "text": system_prompt,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                "messages": api_messages,
                "max_tokens": self.max_tokens,
                # Explicitly OFF.  Some gateways (Azure AI Foundry) default
                # newer Claude models to adaptive extended thinking; the loop
                # drops thinking blocks on parse, so every thinking token is
                # paid, slow, and invisible — observed as turns burning 10-24k
                # output tokens to emit a single small tool call.
                "thinking": {"type": "disabled"},
            }
            if tool_schemas:
                kwargs["tools"] = _with_tool_cache_breakpoint(tool_schemas)

            # Stream so the UI can render the model's text as it generates.
            # `get_final_message()` reconstructs the full Message with usage,
            # so the rest of the function keeps the non-streaming shape.
            #
            # SSE connections can be cut mid-flight (Azure Foundry gateways
            # drop chunked responses on transient issues — observed as
            # `httpx.RemoteProtocolError`).  The non-streaming SDK path has
            # its own retry logic; for streaming we have to retry manually.
            # On stream failure we fall back to a one-shot non-streaming
            # `messages.create` so the workflow continues — the UI loses
            # mid-token typing for that turn, but the turn itself recovers.
            response = await self._stream_or_fallback(
                kwargs=kwargs,
                on_text_delta=on_text_delta,
                on_tool_use_start=on_tool_use_start,
            )

            content: list[ContentBlock] = []
            dropped_block_types: dict[str, int] = {}
            for block in response.content:
                block_type = getattr(block, "type", None)
                if block_type == "text":
                    content.append(TextBlock(text=block.text))
                elif block_type == "tool_use":
                    content.append(
                        ToolUseBlock(id=block.id, name=block.name, input=dict(block.input))
                    )
                else:
                    # Other block types (e.g. thinking) are dropped — the loop
                    # only acts on text + tool_use.  Log them: dropped blocks
                    # are tokens we paid for without seeing, and their presence
                    # means the request config (`thinking` above) isn't doing
                    # what we think it does.
                    key = str(block_type or "unknown")
                    dropped_block_types[key] = dropped_block_types.get(key, 0) + 1
            if dropped_block_types:
                log.warning(
                    "Dropped non-text/tool_use response blocks: %s (model=%s)",
                    dropped_block_types,
                    self.model,
                )

            usage_obj = getattr(response, "usage", None)
            usage = {
                "input_tokens": getattr(usage_obj, "input_tokens", 0) if usage_obj else 0,
                "output_tokens": getattr(usage_obj, "output_tokens", 0) if usage_obj else 0,
                "cache_creation_input_tokens": getattr(
                    usage_obj, "cache_creation_input_tokens", 0
                ) if usage_obj else 0,
                "cache_read_input_tokens": getattr(
                    usage_obj, "cache_read_input_tokens", 0
                ) if usage_obj else 0,
            }

            assistant = AssistantMessage(
                content=content,
                stop_reason=response.stop_reason,
                usage=usage,
            )
            _warn_if_truncated(response.stop_reason, usage["output_tokens"], self.max_tokens)
            try:
                span.update(
                    output=_trace_output_summary(assistant),
                    usage_details=_usage_details(
                        fresh=usage["input_tokens"],
                        output=usage["output_tokens"],
                        cache_read=usage["cache_read_input_tokens"],
                        cache_creation=usage["cache_creation_input_tokens"],
                    ),
                )
            except Exception:  # noqa: BLE001 — never let tracing break the call
                pass
            return assistant


def _with_tool_cache_breakpoint(tool_schemas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return a copy of `tool_schemas` with cache_control set on the last entry."""
    cached = list(tool_schemas)
    last = dict(cached[-1])
    last["cache_control"] = {"type": "ephemeral"}
    cached[-1] = last
    return cached


def _mark_last_block_cacheable(api_messages: list[dict[str, Any]]) -> None:
    """Tag the final content block of the last message with cache_control."""
    if not api_messages:
        return
    last = api_messages[-1]
    blocks = last.get("content")
    if not isinstance(blocks, list) or not blocks:
        return
    blocks[-1]["cache_control"] = {"type": "ephemeral"}


def _message_to_anthropic(message: Message) -> dict[str, Any]:
    """Translate our message type to Anthropic's wire format."""
    if isinstance(message, UserMessage):
        if isinstance(message.content, str):
            return {"role": "user", "content": message.content}
        return {
            "role": "user",
            "content": [_block_to_anthropic(b) for b in message.content],
        }
    # AssistantMessage
    return {
        "role": "assistant",
        "content": [_block_to_anthropic(b) for b in message.content],
    }


def _block_to_anthropic(block: ContentBlock) -> dict[str, Any]:
    if isinstance(block, TextBlock):
        return {"type": "text", "text": block.text}
    if isinstance(block, ToolUseBlock):
        return {
            "type": "tool_use",
            "id": block.id,
            "name": block.name,
            "input": block.input,
        }
    if isinstance(block, ToolResultBlock):
        return {
            "type": "tool_result",
            "tool_use_id": block.tool_use_id,
            "content": block.content,
            "is_error": block.is_error,
        }
    raise TypeError(f"Unsupported content block: {type(block).__name__}")


# ---------------------------------------------------------------------------
# OpenAI / Azure OpenAI (chat-completions tool calling)
# ---------------------------------------------------------------------------


def _usage_details(
    *, fresh: int, output: int, cache_read: int = 0, cache_creation: int = 0
) -> dict[str, int]:
    """Token kinds as the provider reports them, and a total counting all of them.

    Anthropic excludes cache reads from `input_tokens` and Azure includes them, so
    a total built from each provider's own input figure is not comparable.
    """
    return {
        "input": fresh,
        "output": output,
        "cache_read_input": cache_read,
        "cache_creation_input": cache_creation,
        "total": fresh + output + cache_read + cache_creation,
    }


def build_openai_request(
    *,
    model: str,
    messages: list[dict[str, Any]],
    max_tokens: int,
    is_reasoning: bool,
    reasoning_effort: str,
    tool_schemas: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """The chat-completions payload, as a value so the contract can be tested."""
    request: dict[str, Any] = {"model": model, "messages": messages}
    request["max_completion_tokens" if is_reasoning else "max_tokens"] = max_tokens
    if tool_schemas:
        request["tools"] = [_tool_schema_to_openai(s) for s in tool_schemas]
    if is_reasoning:
        effort = "none" if tool_schemas else reasoning_effort
        request["extra_body"] = {"reasoning_effort": effort}
    return request


class OpenAIAdapter(LLMAdapter):
    """Talks to OpenAI or Azure OpenAI via the chat-completions API."""

    def __init__(self, *, model: str, max_tokens: int | None = None) -> None:
        import os

        config = get_config()
        if config.OPENAI_BASE_URL:
            # OpenAI-compatible endpoint with custom base URL — Azure AI
            # Foundry's `/openai/v1/` surface, or any compatible host
            # (Moonshot, OpenRouter, vLLM, …). Uses plain AsyncOpenAI with
            # the AZURE/OpenAI key as a bearer token; no api-version dance.
            from openai import AsyncOpenAI

            api_key = config.AZURE_API_KEY or config.OPENAI_API_KEY
            if not api_key:
                raise ValueError(
                    "OPENAI_BASE_URL is set but neither AZURE_API_KEY nor "
                    "OPENAI_API_KEY is configured to authenticate with it."
                )
            self._client = AsyncOpenAI(
                base_url=config.OPENAI_BASE_URL,
                api_key=api_key,
            )
        elif config.AZURE_API_KEY:
            from openai import AsyncAzureOpenAI

            self._client = AsyncAzureOpenAI(
                azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
                api_key=config.AZURE_API_KEY,
                api_version=config.AZURE_API_VERSION,
            )
        elif config.OPENAI_API_KEY:
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        else:
            raise ValueError(
                "OpenAIAdapter requires AZURE_API_KEY (Azure) or OPENAI_API_KEY."
            )
        self.model = model
        self._is_reasoning = _is_reasoning_model(model)
        if max_tokens is not None:
            self.max_tokens = max_tokens
        else:
            self.max_tokens = _REASONING_MAX_TOKENS if self._is_reasoning else _DEFAULT_MAX_TOKENS
        self._reasoning_effort = config.LLM_REASONING_EFFORT

    async def chat(
        self,
        messages: list[Message],
        system_prompt: str,
        tool_schemas: list[dict[str, Any]],
        *,
        on_text_delta: TextDeltaCallback | None = None,
        on_tool_use_start: ToolUseStartCallback | None = None,
    ) -> AssistantMessage:
        # Streaming for OpenAI/Azure-OpenAI tool calls isn't wired yet;
        # silently fall back to non-streaming and ignore the callbacks.
        del on_text_delta, on_tool_use_start
        with trace_generation(
            "agentic_loop_llm_call",
            model=self.model,
            input=_trace_input_summary(messages, system_prompt, tool_schemas),
            metadata={
                "role": "actor",
                "provider": "openai",
                "reasoning": self._is_reasoning,
            },
        ) as span:
            api_messages: list[dict[str, Any]] = [
                {"role": "system", "content": system_prompt}
            ]
            for message in messages:
                api_messages.extend(_message_to_openai(message))

            kwargs = build_openai_request(
                model=self.model,
                messages=api_messages,
                max_tokens=self.max_tokens,
                is_reasoning=self._is_reasoning,
                reasoning_effort=self._reasoning_effort,
                tool_schemas=tool_schemas,
            )

            response = await self._client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            message = choice.message

            content: list[ContentBlock] = []
            if message.content:
                content.append(TextBlock(text=message.content))
            for call in message.tool_calls or []:
                try:
                    args = json.loads(call.function.arguments) if call.function.arguments else {}
                except json.JSONDecodeError:
                    # Model emitted invalid JSON for args.  Forward as a
                    # well-formed tool_use with empty input — the registry's
                    # validation will raise a clean error the loop converts
                    # into a tool_result error the model can recover from.
                    args = {}
                content.append(
                    ToolUseBlock(id=call.id, name=call.function.name, input=args)
                )

            usage_obj = getattr(response, "usage", None)
            prompt_details = getattr(usage_obj, "prompt_tokens_details", None)
            usage = {
                "input_tokens": getattr(usage_obj, "prompt_tokens", 0) if usage_obj else 0,
                "output_tokens": getattr(usage_obj, "completion_tokens", 0) if usage_obj else 0,
                # prompt_tokens includes the cached ones; Anthropic reports them apart.
                "cache_read_input_tokens": getattr(prompt_details, "cached_tokens", 0) or 0,
            }

            assistant = AssistantMessage(
                content=content,
                stop_reason=_normalize_openai_stop(choice.finish_reason),
                usage=usage,
            )
            _warn_if_truncated(assistant.stop_reason, usage["output_tokens"], self.max_tokens)
            try:
                span.update(
                    output=_trace_output_summary(assistant),
                    usage_details=_usage_details(
                        fresh=usage["input_tokens"] - usage["cache_read_input_tokens"],
                        output=usage["output_tokens"],
                        cache_read=usage["cache_read_input_tokens"],
                    ),
                )
            except Exception:  # noqa: BLE001
                pass
            return assistant


def _message_to_openai(message: Message) -> list[dict[str, Any]]:
    """Translate our message to one or more OpenAI messages."""
    if isinstance(message, UserMessage):
        if isinstance(message.content, str):
            return [{"role": "user", "content": message.content}]
        # Could be tool_results, plain text blocks, or a mix.
        results: list[dict[str, Any]] = []
        text_parts: list[str] = []
        for block in message.content:
            if isinstance(block, ToolResultBlock):
                results.append(
                    {
                        "role": "tool",
                        "tool_call_id": block.tool_use_id,
                        "content": block.content,
                    }
                )
            elif isinstance(block, TextBlock):
                text_parts.append(block.text)
        if text_parts:
            results.insert(0, {"role": "user", "content": "\n".join(text_parts)})
        return results

    # AssistantMessage
    text_parts: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    for block in message.content:
        if isinstance(block, TextBlock):
            text_parts.append(block.text)
        elif isinstance(block, ToolUseBlock):
            tool_calls.append(
                {
                    "id": block.id,
                    "type": "function",
                    "function": {
                        "name": block.name,
                        "arguments": json.dumps(block.input),
                    },
                }
            )
    out: dict[str, Any] = {"role": "assistant"}
    out["content"] = "\n".join(text_parts) if text_parts else None
    if tool_calls:
        out["tool_calls"] = tool_calls
    return [out]


def _tool_schema_to_openai(schema: dict[str, Any]) -> dict[str, Any]:
    """Anthropic tool spec → OpenAI function spec."""
    return {
        "type": "function",
        "function": {
            "name": schema["name"],
            "description": schema["description"],
            "parameters": schema["input_schema"],
        },
    }


def _warn_if_truncated(stop_reason: str | None, output_tokens: int, max_tokens: int) -> None:
    """Surface max_tokens truncation as a log line."""
    if stop_reason == "max_tokens":
        log.warning(
            "LLM response truncated at max_tokens budget (output_tokens=%d, max_tokens=%d). "
            "Tool calls may be malformed; consider raising the budget.",
            output_tokens,
            max_tokens,
        )


def _normalize_openai_stop(reason: str | None) -> str | None:
    """Map OpenAI finish_reason onto the Anthropic-style names the loop
    inspects.  Unknown reasons pass through unchanged."""
    if reason == "stop":
        return "end_turn"
    if reason == "tool_calls":
        return "tool_use"
    if reason == "length":
        return "max_tokens"
    return reason


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def _is_claude_model(model: str | None) -> bool:
    if not model:
        return False
    m = model.lower()
    return m.startswith("claude") or "anthropic" in m


def _is_reasoning_model(model: str | None) -> bool:
    if not model:
        return False
    m = model.lower()
    return m.startswith("o1") or m.startswith("o3") or m.startswith("gpt-5")


def build_adapter(role: str = "actor", max_tokens: int | None = None) -> LLMAdapter:
    """Return the adapter configured for the given role."""
    config = get_config()
    if role == "actor":
        model = config.LLM_MODEL_ACTOR
    elif role == "planner":
        model = config.LLM_MODEL_PLANNER
    elif role == "reviewer":
        model = config.LLM_MODEL_REVIEWER
    elif role == "assistant":
        model = config.LLM_MODEL_ASSISTANT
    else:
        model = config.AZURE_DEPLOYMENT_NAME or config.LLM_MODEL

    if _is_claude_model(model):
        # Anthropic models don't have a reasoning-token concept here; default
        # max_tokens is fine.  (Claude's extended-thinking is opt-in and
        # billed differently.)
        return AnthropicAdapter(
            model=model,
            max_tokens=max_tokens if max_tokens is not None else _ANTHROPIC_MAX_TOKENS,
        )
    return OpenAIAdapter(model=model, max_tokens=max_tokens)
