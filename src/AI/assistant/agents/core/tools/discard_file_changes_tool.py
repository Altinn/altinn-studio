"""`discard_file_changes` — reset one file to HEAD.

A narrow replacement for the old broad rollback: the model undoes one
file at a time instead of wiping all progress.  The tool deletes a file
that HEAD does not have.
"""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult, WriteTool
from agents.services.git import git_ops

from .utils.repo_files import PathError, mark_unread, resolve_repo_path


class DiscardFileChangesArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path to reset to HEAD.")


class DiscardFileChangesTool(WriteTool[DiscardFileChangesArgs]):
    name = "discard_file_changes"
    description = (
        "Reset ONE file in the working tree back to its last committed state "
        "(`git checkout HEAD -- <path>`).  Use when an `edit_file` or "
        "`write_file` introduced something you can't easily fix with another "
        "edit and you'd rather start that file over.  Deletes a file that "
        "the last commit does not have.\n\n"
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
            deleted = await asyncio.to_thread(_discard, ctx.repo_path, args.path)
        except subprocess.CalledProcessError as exc:
            return ToolResult(
                content=f"Discard failed: {exc.stderr.strip() or exc}",
                is_error=True,
            )
        except OSError as exc:
            return ToolResult(content=f"Discard failed: {exc}", is_error=True)
        _forget_file(ctx, args.path)
        if deleted:
            return ToolResult(content=f"Deleted {args.path}: the last commit does not have this file.")
        return ToolResult(content=f"Reset {args.path} to HEAD.")


def _discard(repo_path: str, rel_path: str) -> bool:
    """Reset the file to HEAD.  Return True if this deleted the file.

    `git checkout HEAD -- <path>` gives an error for a path that HEAD does
    not have.  Thus the function removes a file that the session made from
    the index and from the disk.  For a path that is not in HEAD and not on
    the disk, `git checkout` gives the error message for the model.
    """
    file = Path(repo_path) / rel_path
    if git_ops.exists_in_head(repo_path, rel_path) or not file.is_file():
        _git(repo_path, "checkout", "HEAD", "--", rel_path)
        return False
    # If a commit stopped after `git add`, the file is in the index. Without
    # `--force`, git refuses a file that changed again after `git add`.
    _git(repo_path, "rm", "--cached", "--force", "--quiet", "--ignore-unmatch", "--", rel_path)
    file.unlink()
    return True


def _git(repo_path: str, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo_path, check=True, capture_output=True, text=True)


def _forget_file(ctx: LoopContext, rel_path: str) -> None:
    """Drop the file from all tracking sets.

    Its in-memory state is no longer "the version we modified" nor "the
    version we read", and its prior verification badge no longer applies.
    """
    for tracking_key in ("changed_files", "verified_files"):
        (ctx.extras.get(tracking_key) or set()).discard(rel_path)
    mark_unread(ctx, rel_path)
