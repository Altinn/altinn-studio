"""Shared fixtures for agents.core tests.

Provides:
- A `Tool` subclass family with synchronous in-memory behavior.
- A FakeAdapter that returns a queued list of AssistantMessages.
- A minimal LoopContext.

None of these touch the network, the file system, or the real config.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable
from typing import Any

import pytest
from pydantic import BaseModel

from agents.core import (
    AssistantMessage,
    LLMAdapter,
    LoopContext,
    Message,
    PermissionResult,
    TextBlock,
    Tool,
    ToolResult,
    ToolUseBlock,
)


# ---------------------------------------------------------------------------
# Fake tools
# ---------------------------------------------------------------------------


class EchoArgs(BaseModel):
    text: str


class EchoTool(Tool):
    """Returns its `text` arg as the result.  Concurrency-safe."""

    name = "echo"
    description = "Echo back the given text."
    input_schema = EchoArgs
    is_concurrency_safe = True

    async def run(self, args: EchoArgs, ctx: LoopContext) -> ToolResult:
        return ToolResult(content=args.text)


class CountingTool(Tool):
    """Tracks invocation order on `ctx.extras["calls"]`.  Unsafe."""

    name = "counting"
    description = "Append to call log."
    input_schema = EchoArgs
    is_concurrency_safe = False

    async def run(self, args: EchoArgs, ctx: LoopContext) -> ToolResult:
        ctx.extras.setdefault("calls", []).append(args.text)
        return ToolResult(content=f"recorded:{args.text}")


class BoomTool(Tool):
    """Raises — used to exercise the error-recovery path."""

    name = "boom"
    description = "Always raises."
    input_schema = EchoArgs
    is_concurrency_safe = True

    async def run(self, args: EchoArgs, ctx: LoopContext) -> ToolResult:
        raise RuntimeError(f"boom: {args.text}")


class DeniedTool(Tool):
    """Denies all calls — exercises the permission path."""

    name = "denied"
    description = "Always denies."
    input_schema = EchoArgs
    is_concurrency_safe = True

    async def check_permission(self, args: EchoArgs, ctx: LoopContext) -> PermissionResult:
        return PermissionResult.deny("nope")

    async def run(self, args: EchoArgs, ctx: LoopContext) -> ToolResult:  # pragma: no cover
        raise AssertionError("DeniedTool.run must not be called")


class SourcedTool(Tool):
    """Declares a consulted-source record in metadata — exercises the
    loop's source collection.  `text == "fail"` returns an error result
    that still carries a source, to prove errors are not collected."""

    name = "sourced"
    description = "Look something up and declare it as a source."
    input_schema = EchoArgs
    is_concurrency_safe = True

    async def run(self, args: EchoArgs, ctx: LoopContext) -> ToolResult:
        source = {
            "title": args.text,
            "url": f"https://docs.altinn.studio/{args.text}",
            "kind": "docs",
        }
        if args.text == "fail":
            return ToolResult(content="lookup failed", is_error=True, metadata={"source": source})
        return ToolResult(content=f"looked up {args.text}", metadata={"source": source})


class GatedTool(Tool):
    """Write-style tool gated on allow_app_changes with an escalatable
    denial — exercises the interactive permission path."""

    name = "gated"
    description = "Runs only with write permission."
    input_schema = EchoArgs
    is_concurrency_safe = True

    async def check_permission(self, args: EchoArgs, ctx: LoopContext) -> PermissionResult:
        if not ctx.allow_app_changes:
            return PermissionResult.deny("read-only session", escalatable=True)
        return PermissionResult.allow()

    async def run(self, args: EchoArgs, ctx: LoopContext) -> ToolResult:
        return ToolResult(content=f"wrote: {args.text}")


# ---------------------------------------------------------------------------
# Fake LLM adapter
# ---------------------------------------------------------------------------


class FakeAdapter(LLMAdapter):
    """Returns queued `AssistantMessage`s in order.

    Each `chat()` call pops the next response.  If the queue is empty,
    returns an empty text reply (which the loop reads as COMPLETED).
    Records all calls for assertion.
    """

    model = "fake-model"

    def __init__(self, responses: Iterable[AssistantMessage] | None = None) -> None:
        self.responses: list[AssistantMessage] = list(responses or [])
        self.calls: list[dict[str, Any]] = []

    def queue(self, response: AssistantMessage) -> "FakeAdapter":
        self.responses.append(response)
        return self

    async def chat(
        self,
        messages: list[Message],
        system_prompt: str,
        tool_schemas: list[dict[str, Any]],
        *,
        on_text_delta: Any = None,
        on_tool_use_start: Any = None,
    ) -> AssistantMessage:
        self.calls.append(
            {
                "messages": list(messages),
                "system_prompt": system_prompt,
                "tool_schemas": tool_schemas,
            }
        )
        if not self.responses:
            return AssistantMessage(content=[TextBlock(text="(done)")], stop_reason="end_turn")
        return self.responses.pop(0)


def tool_use(name: str, **input_kwargs: Any) -> ToolUseBlock:
    """Build a ToolUseBlock with a unique id — convenience for tests."""
    return ToolUseBlock(id=f"call_{uuid.uuid4().hex[:8]}", name=name, input=input_kwargs)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def ctx() -> LoopContext:
    return LoopContext(
        session_id="test-session",
        repo_path="/tmp/test-repo",
        allow_app_changes=True,
        developer="tester",
        org="ttd",
    )
