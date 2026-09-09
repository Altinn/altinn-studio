"""Tool registry — the universe of capabilities the model can see.

The registry is the single source of truth for which tools exist this
session.  It exposes a JSON schema list (`to_schema()`) for the LLM call
and a validating dispatcher (`prepare_call()`) for the loop.

Validation happens here, not inside individual tools: the loop trusts
that by the time `tool.run()` is called, the args are a populated
pydantic model.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from .tool import Tool


class ToolNotFoundError(Exception):
    """Raised when the model calls a tool name we haven't registered."""


class ToolArgsInvalidError(Exception):
    """Raised when tool_use input fails pydantic validation."""

    def __init__(self, tool_name: str, errors: str):
        super().__init__(f"Invalid args for tool {tool_name!r}: {errors}")
        self.tool_name = tool_name
        self.errors = errors


@dataclass
class PreparedCall:
    """A tool_use that has been resolved + validated and is ready to run."""

    tool: Tool
    args: BaseModel


class ToolRegistry:
    """In-memory registry. Construct empty, then `.register(tool)`.

    Names must be unique; re-registering the same name raises ValueError
    so misconfigurations fail loud at startup rather than silently
    shadowing.
    """

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        _validate_tool(tool)
        if tool.name in self._tools:
            raise ValueError(f"Tool {tool.name!r} already registered")
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool:
        if name not in self._tools:
            raise ToolNotFoundError(name)
        return self._tools[name]

    def names(self) -> list[str]:
        return list(self._tools.keys())

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: object) -> bool:
        return isinstance(name, str) and name in self._tools

    def to_schema(self) -> list[dict[str, Any]]:
        """Emit the tool catalog in Anthropic's tool-spec shape.

        The OpenAI adapter translates this to its own `function` shape;
        keeping the canonical form Anthropic-shaped avoids a lossy
        round-trip when Claude is the actor (the common case here).
        """
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema.model_json_schema(),
            }
            for t in self._tools.values()
        ]

    def prepare_call(
        self, name: str, raw_input: dict[str, Any]
    ) -> PreparedCall:
        """Resolve `name` and validate `raw_input` against its schema.

        Raises `ToolNotFoundError` or `ToolArgsInvalidError` — the loop
        catches these and converts to error tool_results.
        """
        tool = self.get(name)
        try:
            args = tool.input_schema.model_validate(raw_input)
        except ValidationError as e:
            raise ToolArgsInvalidError(name, e.json(include_url=False)) from e
        return PreparedCall(tool=tool, args=args)


def _validate_tool(tool: Tool) -> None:
    """Fail loud when a tool is missing the structural contract.

    The class attribute defaults on `Tool` make `is_concurrency_safe`
    and `is_read_only` always present, so this check primarily catches
    subclasses that:
      - forget to set `name`, `description`, or `input_schema`,
      - shadow a predicate method with a non-callable.

    Cheap to run at registration time, and turns silent miswiring into
    a startup error instead of a runtime surprise.
    """
    if not isinstance(tool, Tool):
        raise TypeError(f"Expected Tool, got {type(tool).__name__}")
    # `name` must be a non-empty string — the registry key.
    name = getattr(tool, "name", None)
    if not isinstance(name, str) or not name:
        raise ValueError(
            f"Tool {type(tool).__name__} is missing required attribute 'name'"
        )
    # `description` is shown to the model.  Allow empty strings — some
    # tools can legitimately ship an empty description — but the attribute
    # itself must be a string so the JSON-schema emit doesn't break.
    if not isinstance(getattr(tool, "description", None), str):
        raise ValueError(
            f"Tool {tool.name!r} is missing required attribute 'description'"
        )
    if getattr(tool, "input_schema", None) is None:
        raise ValueError(
            f"Tool {tool.name!r} is missing required attribute 'input_schema'"
        )
    if not isinstance(tool.is_concurrency_safe, bool):
        raise TypeError(
            f"Tool {tool.name!r}: is_concurrency_safe must be bool"
        )
    if not isinstance(tool.is_read_only, bool):
        raise TypeError(f"Tool {tool.name!r}: is_read_only must be bool")
    for method in ("concurrency_safe_for", "read_only_for", "check_permission", "run"):
        if not callable(getattr(tool, method, None)):
            raise TypeError(f"Tool {tool.name!r}: {method} must be callable")
