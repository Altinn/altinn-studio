"""Tests for the Tool base class — predicate defaults and overrides.

The Tool ABC carries the safety contract the dispatcher relies on
(`is_concurrency_safe`, `is_read_only`, and the per-input methods
`concurrency_safe_for` / `read_only_for`).  These tests pin down the
defaults (fail-closed) and the override paths.
"""

from __future__ import annotations

from pydantic import BaseModel

from agents.core import LoopContext, Tool, ToolResult


class _NoOpArgs(BaseModel):
    flavor: str = "noop"


class _DefaultsTool(Tool):
    name = "defaults"
    description = "stub"
    input_schema = _NoOpArgs

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class _ClassAttrTool(Tool):
    """Sets the class attrs only — no method override."""

    name = "class_attr"
    description = "stub"
    input_schema = _NoOpArgs
    is_concurrency_safe = True
    is_read_only = True

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class _PerInputTool(Tool):
    """Classifies safety per input — like a future shell tool."""

    name = "per_input"
    description = "stub"
    input_schema = _NoOpArgs

    # Class defaults stay fail-closed; the method drives the live answer.
    def concurrency_safe_for(self, args: _NoOpArgs) -> bool:
        return args.flavor == "read"

    def read_only_for(self, args: _NoOpArgs) -> bool:
        return args.flavor == "read"

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class TestDefaults:
    def test_concurrency_safe_defaults_to_false(self):
        assert _DefaultsTool.is_concurrency_safe is False

    def test_read_only_defaults_to_false(self):
        # Fail-closed: an unclassified tool is assumed to mutate state.
        assert _DefaultsTool.is_read_only is False


class TestPredicateMethodsFollowClassAttrs:
    def test_methods_consult_class_attr_by_default(self):
        tool = _ClassAttrTool()
        args = _NoOpArgs()
        assert tool.concurrency_safe_for(args) is True
        assert tool.read_only_for(args) is True

    def test_defaults_tool_methods_return_false(self):
        tool = _DefaultsTool()
        args = _NoOpArgs()
        assert tool.concurrency_safe_for(args) is False
        assert tool.read_only_for(args) is False


class TestPerInputOverride:
    """The method form is the load-bearing contract — a tool that
    classifies per input must influence the dispatcher's batching
    decision based on the actual args."""

    def test_method_can_diverge_from_class_attr(self):
        tool = _PerInputTool()
        # Class attrs untouched — fail-closed.
        assert tool.is_concurrency_safe is False
        assert tool.is_read_only is False
        # But the method classifies live based on input.
        safe = tool.concurrency_safe_for(_NoOpArgs(flavor="read"))
        unsafe = tool.concurrency_safe_for(_NoOpArgs(flavor="write"))
        assert safe is True
        assert unsafe is False

    def test_read_only_method_can_diverge_from_class_attr(self):
        tool = _PerInputTool()
        assert tool.read_only_for(_NoOpArgs(flavor="read")) is True
        assert tool.read_only_for(_NoOpArgs(flavor="write")) is False
