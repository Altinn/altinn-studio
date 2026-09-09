"""Tests for the ToolRegistry."""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from agents.core import (
    LoopContext,
    Tool,
    ToolArgsInvalidError,
    ToolNotFoundError,
    ToolRegistry,
    ToolResult,
)

from .conftest import BoomTool, EchoTool


class TestRegisterAndLookup:
    def test_register_and_get(self):
        registry = ToolRegistry()
        echo = EchoTool()
        registry.register(echo)
        assert registry.get("echo") is echo
        assert "echo" in registry
        assert registry.names() == ["echo"]
        assert len(registry) == 1

    def test_register_duplicate_name_raises(self):
        registry = ToolRegistry()
        registry.register(EchoTool())
        with pytest.raises(ValueError, match="already registered"):
            registry.register(EchoTool())

    def test_get_unknown_raises(self):
        registry = ToolRegistry()
        with pytest.raises(ToolNotFoundError):
            registry.get("missing")


class TestSchemaEmission:
    def test_schema_contains_registered_tools(self):
        registry = ToolRegistry()
        registry.register(EchoTool())
        registry.register(BoomTool())
        schemas = registry.to_schema()
        names = [s["name"] for s in schemas]
        assert names == ["echo", "boom"]
        assert all("description" in s and "input_schema" in s for s in schemas)

    def test_schema_uses_pydantic_json_schema(self):
        registry = ToolRegistry()
        registry.register(EchoTool())
        [schema] = registry.to_schema()
        assert schema["input_schema"]["type"] == "object"
        assert "text" in schema["input_schema"]["properties"]


class TestPrepareCall:
    def test_validates_args(self):
        registry = ToolRegistry()
        registry.register(EchoTool())
        prepared = registry.prepare_call("echo", {"text": "hi"})
        assert prepared.tool.name == "echo"
        assert prepared.args.text == "hi"

    def test_unknown_tool_raises(self):
        registry = ToolRegistry()
        with pytest.raises(ToolNotFoundError):
            registry.prepare_call("nope", {})

    def test_invalid_args_raises(self):
        registry = ToolRegistry()
        registry.register(EchoTool())
        with pytest.raises(ToolArgsInvalidError) as exc:
            registry.prepare_call("echo", {})  # missing required `text`
        assert exc.value.tool_name == "echo"
        assert "text" in exc.value.errors


class _StubArgs(BaseModel):
    pass


class _MinimalGoodTool(Tool):
    name = "minimal"
    description = "ok"
    input_schema = _StubArgs

    async def run(self, args, ctx):  # pragma: no cover - never called
        return ToolResult(content="")


class TestRegisterValidation:
    """The structural contract checks that turn typos and copy-paste
    mis-wirings into loud startup errors instead of mysterious runtime
    failures."""

    def test_rejects_non_tool(self):
        registry = ToolRegistry()
        with pytest.raises(TypeError, match="Expected Tool"):
            registry.register("not a tool")  # type: ignore[arg-type]

    def test_rejects_tool_missing_name(self):
        class NoName(_MinimalGoodTool):
            name = ""

        with pytest.raises(ValueError, match="missing required attribute 'name'"):
            ToolRegistry().register(NoName())

    def test_rejects_tool_missing_input_schema(self):
        class NoSchema(_MinimalGoodTool):
            name = "no_schema"
            input_schema = None  # type: ignore[assignment]

        with pytest.raises(ValueError, match="input_schema"):
            ToolRegistry().register(NoSchema())

    def test_rejects_non_bool_concurrency_safe(self):
        class WeirdSafety(_MinimalGoodTool):
            name = "weird_safety"
            is_concurrency_safe = "yes"  # type: ignore[assignment]

        with pytest.raises(TypeError, match="is_concurrency_safe"):
            ToolRegistry().register(WeirdSafety())

    def test_rejects_non_bool_read_only(self):
        class WeirdReadOnly(_MinimalGoodTool):
            name = "weird_ro"
            is_read_only = 1  # type: ignore[assignment]

        with pytest.raises(TypeError, match="is_read_only"):
            ToolRegistry().register(WeirdReadOnly())

    def test_rejects_non_callable_predicate(self):
        class BrokenPredicate(_MinimalGoodTool):
            name = "broken_pred"
            concurrency_safe_for = True  # type: ignore[assignment]

        with pytest.raises(TypeError, match="concurrency_safe_for"):
            ToolRegistry().register(BrokenPredicate())

    def test_accepts_well_formed_tool(self):
        # Sanity: the validator must not over-reject the common case.
        ToolRegistry().register(_MinimalGoodTool())
