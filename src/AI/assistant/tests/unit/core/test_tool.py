"""Tests for the Tool base class — predicate defaults and overrides.

The Tool ABC carries the safety contract the dispatcher relies on
(`is_concurrency_safe` and the per-input method `concurrency_safe_for`).
These tests pin down the default (fail-closed) and the override path.
"""

from __future__ import annotations

from pydantic import BaseModel

from agents.core import Tool, ToolResult


class _NoOpArgs(BaseModel):
    flavor: str = "noop"


class _DefaultsTool(Tool[_NoOpArgs]):
    name = "defaults"
    description = "stub"
    input_schema = _NoOpArgs

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class _ClassAttrTool(Tool[_NoOpArgs]):
    """Sets the class attrs only — no method override."""

    name = "class_attr"
    description = "stub"
    input_schema = _NoOpArgs
    is_concurrency_safe = True

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class _PerInputTool(Tool[_NoOpArgs]):
    """Classifies safety per input — like a future shell tool."""

    name = "per_input"
    description = "stub"
    input_schema = _NoOpArgs

    # Class defaults stay fail-closed; the method drives the live answer.
    def concurrency_safe_for(self, args: _NoOpArgs) -> bool:
        return args.flavor == "read"

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class TestDefaults:
    def test_concurrency_safe_defaults_to_false(self):
        assert _DefaultsTool.is_concurrency_safe is False


class TestPredicateMethodsFollowClassAttrs:
    def test_methods_consult_class_attr_by_default(self):
        tool = _ClassAttrTool()
        args = _NoOpArgs()
        assert tool.concurrency_safe_for(args) is True

    def test_defaults_tool_methods_return_false(self):
        tool = _DefaultsTool()
        args = _NoOpArgs()
        assert tool.concurrency_safe_for(args) is False


class TestPerInputOverride:
    """The method form is the load-bearing contract — a tool that
    classifies per input must influence the dispatcher's batching
    decision based on the actual args."""

    def test_method_can_diverge_from_class_attr(self):
        tool = _PerInputTool()
        # Class attrs untouched — fail-closed.
        assert tool.is_concurrency_safe is False
        # But the method classifies live based on input.
        safe = tool.concurrency_safe_for(_NoOpArgs(flavor="read"))
        unsafe = tool.concurrency_safe_for(_NoOpArgs(flavor="write"))
        assert safe is True
        assert unsafe is False
