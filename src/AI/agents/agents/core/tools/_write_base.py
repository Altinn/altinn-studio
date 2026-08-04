"""Shared permission gating for tools that mutate disk or git state.

A single boolean (`ctx.allow_app_changes`) decides whether write tools
are available, mirroring today's chat-vs-workflow split.  Denied tools
surface as `tool_result` errors the model can read — it will fall back
to read-only behavior on its own.
"""

from __future__ import annotations

from pydantic import BaseModel

from agents.core.tool import LoopContext, PermissionResult, Tool


class WriteToolMixin(Tool):
    """Adds the standard `allow_app_changes` permission check.

    Subclasses inherit `check_permission` and implement `run`.  This
    mixin is a `Tool` itself only so we can put it ahead of the concrete
    tool in the MRO; subclasses still declare name/description/schema.
    """

    async def check_permission(
        self, args: BaseModel, ctx: LoopContext
    ) -> PermissionResult:
        if not ctx.allow_app_changes:
            return PermissionResult.deny(
                "Write tools are disabled in this session (read-only mode).",
                escalatable=True,
            )
        return PermissionResult.allow()
