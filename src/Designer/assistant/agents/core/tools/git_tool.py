"""Git-state tools: `commit_session_branch` and `rollback`.

`commit_session_branch` derives a per-session branch name on first
call (cached on `ctx.extras["session_branch"]`), commits via
`git_ops.commit`, then pushes via `repo_manager.push_branch` so the
session branch is visible in Designer.  Subsequent commits reuse the
same branch.

`rollback` discards all uncommitted changes via `git_ops.revert` and
clears the tracked `changed_files`.

Both tools require `ctx.allow_app_changes`.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult
from agents.services.git import git_ops

from ._write_base import WriteToolMixin


def _unverified_changed_files(ctx: LoopContext) -> set[str]:
    """Return changed files that haven't been verified since their last edit.

    `verify_changes` populates `ctx.extras["verified_files"]` on success;
    `_mark_changed` removes a file from that set on every write so a
    re-edit invalidates its prior badge.  The gate is simply
    `changed_files - verified_files`.
    """
    changed: set[str] = ctx.extras.get("changed_files") or set()
    verified: set[str] = ctx.extras.get("verified_files") or set()
    return changed - verified


def _session_branch_name(ctx: LoopContext) -> str:
    """Stable, derived branch name for the session.

    Cached on `ctx.extras` so the first commit's auto-generated name
    sticks for the rest of the session (otherwise every commit would
    create a new branch).
    """
    name = ctx.extras.get("session_branch")
    if name:
        return name
    short_id = (ctx.session_id or "anon")[:8] or "anon"
    name = f"altinity_session_{short_id}"
    ctx.extras["session_branch"] = name
    return name


class CommitSessionBranchArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(
        description="Commit message.  Should describe what changed and why, not how.",
        min_length=1,
    )


class CommitSessionBranchTool(WriteToolMixin):
    name = "commit_session_branch"
    description = (
        "Commit all changes on disk to the session branch and push it to the "
        "remote so the user can see it in Altinn Studio Designer.  Reuses the "
        "same session branch across calls — multiple commits land on the same "
        "branch.  Returns the short commit hash on success.\n\n"
        "PRECONDITION: `verify_changes` has passed for the current change set.  "
        "Don't commit failing patches.\n\n"
        "COMMIT MESSAGE: Conventional Commit style — `feat: <summary>`, "
        "`fix: <summary>`, `chore: <summary>`.  Keep the subject short (<70 "
        "chars); use the body for rationale if the change isn't obvious from "
        "the files.\n\n"
        "FAILURE MODES:\n"
        "  - Nothing to commit: working tree is clean.  Probably you already "
        "committed the changes — check your earlier tool results.\n"
        "  - Push rejected / push raises: the commit is local-only.  You can "
        "retry with the same message, or stop and let the user resolve."
    )
    input_schema = CommitSessionBranchArgs
    is_concurrency_safe = False

    async def run(self, args: CommitSessionBranchArgs, ctx: LoopContext) -> ToolResult:
        unverified = _unverified_changed_files(ctx)
        if unverified:
            return ToolResult(
                content=(
                    "Refusing to commit: the following changed files have not "
                    "been verified since their last edit — run `verify_changes` "
                    f"first, then retry: {sorted(unverified)}"
                ),
                is_error=True,
            )

        branch = _session_branch_name(ctx)
        try:
            commit_hash = git_ops.commit(args.message, ctx.repo_path, branch)
        except Exception as exc:
            return ToolResult(content=f"Commit failed: {exc}", is_error=True)

        if commit_hash is None:
            return ToolResult(
                content="Nothing to commit — the working tree is clean.",
                is_error=True,
            )

        # Surface the hash on the context: it goes into the workflow's
        # trace output as evidence for the faithful_summary evaluator
        # (a summary naming a commit must be checkable).
        ctx.extras["commit"] = commit_hash

        # Push best-effort.  A failed push doesn't unwind the commit (it
        # exists locally and can be re-pushed); we surface the failure to
        # the model so it can decide whether to retry or give up.
        from agents.services.git.repo_manager import get_repo_manager

        try:
            repo_manager = get_repo_manager()
            pushed = repo_manager.push_branch(ctx.session_id, branch)
        except Exception as exc:
            return ToolResult(
                content=(
                    f"Committed {commit_hash} to {branch}, but push failed: {exc}"
                ),
                is_error=True,
                metadata={"commit": commit_hash, "branch": branch, "pushed": False},
            )

        if not pushed:
            return ToolResult(
                content=(
                    f"Committed {commit_hash} to {branch}, but the push was rejected."
                ),
                is_error=True,
                metadata={"commit": commit_hash, "branch": branch, "pushed": False},
            )

        # Record that the session has committed at least once so the
        # agentic node's auto-commit safety net doesn't fire a duplicate
        # commit when the loop finishes normally.
        ctx.extras["session_committed"] = True
        return ToolResult(
            content=f"Committed {commit_hash} to {branch} and pushed.",
            metadata={"commit": commit_hash, "branch": branch, "pushed": True},
        )


# `RollbackTool` (broad `git reset --hard HEAD`) was removed in favor
# of `discard_file_changes` in `file_tool.py`, which is surgical (one
# file at a time) and integrates with the read-before-write
# enforcement.  The broad reset became a foot-gun: the model would
# call it on any setback, wiping prior progress instead of iterating.
