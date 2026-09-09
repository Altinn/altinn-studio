"""`scan_repo` — read the Altinn app repository and report what's there.

Wraps `discover_repository_context`.  Returned as JSON so the model can
parse it back into structured form when chaining lookups.

Always concurrency-safe, no permission gating — this is a read.
"""

from __future__ import annotations

import json

from pydantic import BaseModel

from agents.core.tool import LoopContext, Tool, ToolResult
from agents.services.repo import discover_repository_context


class ScanRepoArgs(BaseModel):
    """No inputs — the repo path is taken from LoopContext."""

    model_config = {"extra": "forbid"}


class ScanRepoTool(Tool):
    """Inspect the session's repository and return a structured summary.

    The summary lists available layouts, models, resources, and locales
    — what the model needs to know before deciding which specific files
    to inspect or modify.  Cheap; called early in most sessions.
    """

    name = "scan_repo"
    description = (
        "Inspect the session repository and return its high-level structure: "
        "layout files, data model files, resource files, and available locales.\n\n"
        "USE this when:\n"
        "  - You don't yet know which layouts or resources exist.\n"
        "  - You need to confirm which locales are present before adding a text resource.\n"
        "  - The user names a component or file you cannot locate.\n\n"
        "DO NOT use this when:\n"
        "  - You already have repo facts from earlier in this session — they don't change.\n"
        "  - You're answering a pure documentation question with no app-specific reference.\n\n"
        "Returns JSON with `layouts`, `models`, `resources`, `available_locales`, "
        "`source_of_truth`, `app_type`.  Cheap; takes no inputs."
    )
    input_schema = ScanRepoArgs
    is_concurrency_safe = True
    is_read_only = True

    async def run(self, args: ScanRepoArgs, ctx: LoopContext) -> ToolResult:
        try:
            plan_context = discover_repository_context(ctx.repo_path)
        except Exception as exc:
            return ToolResult(
                content=f"Failed to scan repo at {ctx.repo_path!r}: {exc}",
                is_error=True,
            )

        facts = {
            "layouts": list(plan_context.layout_pages),
            "models": list(plan_context.model_files),
            "resources": list(plan_context.resource_files),
            "available_locales": list(plan_context.available_locales),
            "source_of_truth": plan_context.source_of_truth,
            "app_type": "altinn",
        }
        return ToolResult(
            content=json.dumps(facts, ensure_ascii=False, indent=2),
            metadata={"layout_count": len(facts["layouts"])},
        )
