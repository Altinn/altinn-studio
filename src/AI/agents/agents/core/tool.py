"""Tool interface for the agentic loop.

A Tool is a unit of capability the model can invoke by name.  Each tool
declares its name, a description (shown to the model), an input schema
(used both to advertise the call shape and to validate args at dispatch
time), and a permission check that gates execution.

This file intentionally avoids importing any LLM or LangGraph
machinery — tools should be testable in isolation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from pydantic import BaseModel


@dataclass
class LoopContext:
    """Runtime context passed to every tool invocation.

    Carries session-scoped state and service handles tools may need.

    `designer_api_key` is Optional so the loop can run in pure unit
    tests without git-proxy credentials.  Real tools fail fast (with a
    clean error) if they require a service that's `None` at call time.

    `extras` is an escape hatch for ad-hoc test fixtures and incremental
    additions — prefer typed fields once a value is load-bearing.
    """

    session_id: str
    repo_path: str
    allow_app_changes: bool
    developer: str = ""
    org: str = ""
    designer_api_key: str | None = None
    # When set, an escalatable permission denial asks the USER for
    # permission instead of flatly denying: the callable receives a
    # human-readable description of the requested action and resolves to
    # True (granted) or False (declined/timeout).  Wired by the loop node
    # in read-only sessions; None means denials are final.
    permission_requester: Callable[[str], Awaitable[bool]] | None = None
    extras: dict[str, Any] = field(default_factory=dict)


@dataclass
class PermissionResult:
    """Outcome of a per-call permission check.

    On deny, the reason becomes the tool_result content surfaced to the
    model so it can adapt (e.g. switch to a read-only alternative).

    `escalatable` marks denials the USER can lift interactively (the
    read-only session gate) — the loop may then ask the user and retry.
    Non-escalatable denials are final.
    """

    allowed: bool
    reason: str = ""
    escalatable: bool = False

    @classmethod
    def allow(cls) -> "PermissionResult":
        return cls(allowed=True)

    @classmethod
    def deny(cls, reason: str, escalatable: bool = False) -> "PermissionResult":
        return cls(allowed=False, reason=reason, escalatable=escalatable)


@dataclass
class ToolResult:
    """Output of a tool execution.

    `content` is the string fed back to the model as the tool_result.
    `is_error` flags execution failures so the model sees them as errors
    rather than valid output.  `metadata` is for telemetry only (Langfuse,
    logs) and is never sent to the model.
    """

    content: str
    is_error: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


class Tool(ABC):
    """Base class for all tools.

    Subclasses declare class attributes (name, description, input_schema,
    is_concurrency_safe, is_read_only) and implement `run`.  Override
    `check_permission` to gate execution; the default allows every call.

    Safety predicates come in two forms:

    - `is_concurrency_safe` / `is_read_only` are class attributes that
      cover the common case (a tool's behavior does not depend on its
      input).  Both default to `False` — fail-closed: an unclassified
      tool is assumed to mutate state and to conflict with others.
    - `concurrency_safe_for(args)` / `read_only_for(args)` are
      input-aware methods that consult the class attributes by default.
      Tools whose safety depends on the call (a future Bash tool would
      classify per command) override these instead of the attributes.

    The dispatcher calls the methods, never the attributes, so the
    two paths stay consistent.
    """

    name: str
    description: str
    input_schema: type[BaseModel]
    is_concurrency_safe: bool = False
    is_read_only: bool = False

    def concurrency_safe_for(self, args: BaseModel) -> bool:
        """Whether this specific call can run in parallel with other
        concurrency-safe calls.  Default: the class attribute, which
        treats safety as a property of the tool rather than the input.
        Override when safety is per-input."""
        return self.is_concurrency_safe

    def read_only_for(self, args: BaseModel) -> bool:
        """Whether this specific call mutates any external state.
        Default: the class attribute.  Override when read/write status
        is per-input (e.g. a shell tool where `ls` is read-only and
        `rm` is not)."""
        return self.is_read_only

    async def check_permission(
        self, args: BaseModel, ctx: LoopContext
    ) -> PermissionResult:
        return PermissionResult.allow()

    @abstractmethod
    async def run(self, args: BaseModel, ctx: LoopContext) -> ToolResult:
        """Execute the tool. Must not raise on user-visible failures —
        return `ToolResult(is_error=True, content=...)` so the model can
        see and react to the error.  Unexpected exceptions are caught by
        the loop dispatcher and converted to error results."""
