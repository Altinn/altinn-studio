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
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel

from agents.altinn.app_version import V8_PROFILE, AppVersionProfile


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
    repo_owner: str = ""
    designer_api_key: str | None = None
    # When set, an escalatable permission denial asks the USER for
    # permission instead of flatly denying: the callable receives a
    # human-readable description of the requested action and resolves to
    # True (granted) or False (declined/timeout).  Wired by the loop node
    # in read-only sessions; None means denials are final.
    permission_requester: Callable[[str], Awaitable[bool]] | None = None
    # Shows a status line in the user's chat while a tool still runs.
    report_status: Callable[[str], None] = lambda message: None
    app_version_profile: AppVersionProfile = V8_PROFILE
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
    def allow(cls) -> PermissionResult:
        return cls(allowed=True)

    @classmethod
    def deny(cls, reason: str, escalatable: bool = False) -> PermissionResult:
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


class Tool[ArgsT: BaseModel](ABC):
    """Base class for all tools.

    Subclasses declare class attributes (name, description, input_schema,
    is_concurrency_safe) and implement `run`.  Override
    `check_permission` to gate execution; the default allows every call.

    Concurrency safety comes in two forms:

    - `is_concurrency_safe` is a class attribute that covers the common
      case (a tool's behavior does not depend on its input).  It
      defaults to `False` — fail-closed: an unclassified tool is
      assumed to conflict with others.
    - `concurrency_safe_for(args)` is an input-aware method that
      consults the class attribute by default.  Tools whose safety
      depends on the call (a future Bash tool would classify per
      command) override it instead of the attribute.

    The dispatcher calls the method, never the attribute, so the two
    paths stay consistent.
    """

    name: str
    description: str
    input_schema: type[ArgsT]
    is_concurrency_safe: bool = False

    def concurrency_safe_for(self, args: ArgsT) -> bool:
        """Whether this specific call can run in parallel with other
        concurrency-safe calls.  Default: the class attribute, which
        treats safety as a property of the tool rather than the input.
        Override when safety is per-input."""
        return self.is_concurrency_safe

    async def check_permission(self, args: ArgsT, ctx: LoopContext) -> PermissionResult:
        return PermissionResult.allow()

    @abstractmethod
    async def run(self, args: ArgsT, ctx: LoopContext) -> ToolResult:
        """Execute the tool. Must not raise on user-visible failures —
        return `ToolResult(is_error=True, content=...)` so the model can
        see and react to the error.  Unexpected exceptions are caught by
        the loop dispatcher and converted to error results."""


class WriteTool[ArgsT: BaseModel](Tool[ArgsT]):
    """Base class for tools that change files or git state.

    A single boolean (`ctx.allow_app_changes`) decides whether write tools
    are available, mirroring today's chat-vs-workflow split.  Denied tools
    surface as `tool_result` errors the model can read — it will fall back
    to read-only behavior on its own.

    Subclasses inherit `check_permission`, declare name/description/schema
    and implement `run`.
    """

    async def check_permission(self, args: ArgsT, ctx: LoopContext) -> PermissionResult:
        if not ctx.allow_app_changes:
            return PermissionResult.deny(
                "Write tools are disabled in this session (read-only mode).",
                escalatable=True,
            )
        return PermissionResult.allow()
