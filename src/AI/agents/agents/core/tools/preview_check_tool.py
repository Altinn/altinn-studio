"""`preview_render_check`: render the committed session branch in Studio's app
preview, catching runtime failures `verify_changes` cannot see.

Local stack only: the browser logs in through the fake-Ansattporten mock.
"""

from __future__ import annotations

import asyncio
import json
import tempfile
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from agents.core.tool import LoopContext, ToolResult
from agents.services.preview.render_check import (
    PreviewCheckUnavailable,
    read_page_order,
    render_check,
)
from shared.config.base_config import get_config

from ._write_base import WriteToolMixin

_STORAGE_STATE_PATH = Path(tempfile.gettempdir()) / "altinity_preview_auth.json"

_UNAVAILABLE_GUIDANCE = (
    "This is an infrastructure limitation, not a problem with the app — "
    "do NOT retry, and do NOT try to fix anything based on this. "
    "Continue to your final message."
)


class PreviewRenderCheckArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PreviewRenderCheckTool(WriteToolMixin):
    name = "preview_render_check"
    description = (
        "Render every ordered page of the app in Studio's app preview "
        "(headless browser) and report per-page results.  Catches what "
        "`verify_changes` cannot: runtime errors — broken data-model "
        "bindings, invalid expressions, components that crash the page.  "
        "Returns `{passed, pages: [{page, rendered, detail}]}`.\n\n"
        "WHEN to call: once, right after `commit_session_branch` succeeds "
        "— it renders the PUSHED branch, so uncommitted edits are "
        "invisible to it.\n\n"
        "ON FAILURE: the detail names the failing page and the runtime "
        "error.  Fix the page (`edit_file`), then `verify_changes`, then "
        "`commit_session_branch`, then call `preview_render_check` again.\n\n"
        "UNAVAILABLE: in some deployments the check cannot run (no "
        "browser).  The result says so explicitly — treat it as skipped "
        "and finish normally; never retry an unavailable check.\n\n"
        "Takes no input."
    )
    input_schema = PreviewRenderCheckArgs
    is_concurrency_safe = False

    async def run(self, args: PreviewRenderCheckArgs, ctx: LoopContext) -> ToolResult:
        config = get_config()
        if not config.PREVIEW_CHECK_ENABLED:
            return ToolResult(
                content=f"Preview render check is disabled in this deployment. {_UNAVAILABLE_GUIDANCE}",
                is_error=True,
                metadata={"unavailable": True},
            )

        branch = ctx.extras.get("session_branch")
        if not ctx.extras.get("session_committed") or not branch:
            return ToolResult(
                content=(
                    "Nothing to check yet: the preview renders the pushed session "
                    "branch.  Run `commit_session_branch` first, then call "
                    "`preview_render_check`."
                ),
                is_error=True,
            )

        app = ctx.extras.get("app_name")
        if not app or not ctx.org:
            return ToolResult(
                content=f"Preview render check cannot resolve the app's org/name. {_UNAVAILABLE_GUIDANCE}",
                is_error=True,
                metadata={"unavailable": True},
            )

        page_order = read_page_order(Path(ctx.repo_path))
        if not page_order:
            return ToolResult(
                content=(
                    "No `pages.order` found in any layout set — there are no "
                    "ordered pages to render.  If the app should have pages, "
                    "check App/ui/*/Settings.json."
                ),
                is_error=True,
            )

        try:
            results = await asyncio.to_thread(
                render_check,
                studio_base=config.PREVIEW_STUDIO_BASE_URL,
                username=config.PREVIEW_STUDIO_USER,
                org=ctx.org,
                app=app,
                branch=branch,
                page_order=page_order,
                storage_state_path=_STORAGE_STATE_PATH,
                host_resolver_rules=config.PREVIEW_HOST_RESOLVER_RULES or None,
            )
        except PreviewCheckUnavailable as reason:
            return ToolResult(
                content=f"Preview render check unavailable: {reason}. {_UNAVAILABLE_GUIDANCE}",
                is_error=True,
                metadata={"unavailable": True},
            )

        failures = [result for result in results if not result.rendered]
        body = {
            "passed": not failures,
            "pages": [
                {"page": result.page, "rendered": result.rendered, "detail": result.detail}
                for result in results
            ],
        }
        content = json.dumps(body, ensure_ascii=False, indent=2)
        if failures:
            content += (
                "\n\nFix the failing page(s), then `verify_changes`, "
                "`commit_session_branch`, and run `preview_render_check` again."
            )
        return ToolResult(
            content=content,
            is_error=bool(failures),
            metadata={"page_count": len(results), "passed": not failures},
        )
