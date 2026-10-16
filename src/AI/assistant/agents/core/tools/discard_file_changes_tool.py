"""`discard_file_changes` — reset one file to HEAD.

A narrow replacement for the old broad rollback: the model undoes one
file at a time instead of wiping all progress.
"""

from __future__ import annotations

import asyncio
import subprocess

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult, WriteTool

from .utils.repo_files import PathError, resolve_repo_path


class DiscardFileChangesArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path to reset to HEAD.")


class DiscardFileChangesTool(WriteTool[DiscardFileChangesArgs]):
    name = "discard_file_changes"
    description = (
        "Reset ONE file in the working tree back to its last committed state "
        "(`git checkout HEAD -- <path>`).  Use when an `edit_file` or "
        "`write_file` introduced something you can't easily fix with another "
        "edit and you'd rather start that file over.\n\n"
        "DOES NOT roll back other files you've changed in this session — it "
        "is deliberately surgical.  If you need to start the whole task "
        "over, call this once per touched file.\n\n"
        "Does not affect commits already pushed.  The file is also removed "
        "from the session's `read_set`, so you'll need to `read_file` it "
        "again before further edits."
    )
    input_schema = DiscardFileChangesArgs
    is_concurrency_safe = False

    async def run(self, args: DiscardFileChangesArgs, ctx: LoopContext) -> ToolResult:
        try:
            resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        try:
            await asyncio.to_thread(
                subprocess.run,
                ["git", "checkout", "HEAD", "--", args.path],
                cwd=ctx.repo_path,
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            return ToolResult(
                content=f"Discard failed: {exc.stderr.strip() or exc}",
                is_error=True,
            )
        _forget_file(ctx, args.path)
        return ToolResult(content=f"Reset {args.path} to HEAD.")


def _forget_file(ctx: LoopContext, rel_path: str) -> None:
    """Drop the file from all tracking sets.

    Its in-memory state is no longer "the version we modified" nor "the
    version we read", and its prior verification badge no longer applies.
    """
    for tracking_key in ("changed_files", "read_set", "verified_files"):
        (ctx.extras.get(tracking_key) or set()).discard(rel_path)
