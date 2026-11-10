"""Git-state tool: `commit_session_branch`.

`commit_session_branch` derives a per-session branch name on first
call (cached on `ctx.extras["session_branch"]`), commits via
`git_ops.commit`, then pushes via `repo_manager.push_branch` so the
session branch is visible in Designer.  Subsequent commits reuse the
same branch.

The tool requires `ctx.allow_app_changes`.
"""

from __future__ import annotations

import posixpath
import subprocess

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult, WriteTool
from agents.services.git import git_ops

from .utils.repo_files import mark_changed


def unverified_changed_files(ctx: LoopContext) -> set[str]:
    """Return changed files that haven't been verified since their last edit.

    `verify_changes` populates `ctx.extras["verified_files"]` on success;
    `mark_changed` removes a file from that set on every write so a
    re-edit invalidates its prior badge.  The gate is simply
    `changed_files - verified_files`.
    """
    changed: set[str] = ctx.extras.get("changed_files") or set()
    verified: set[str] = ctx.extras.get("verified_files") or set()
    return changed - verified


def track_uncommitted_files(ctx: LoopContext) -> None:
    """Record as changed each file that git shows as not committed.

    A commit takes all files in the working tree. An earlier turn can leave an
    edit that the tools of this turn did not record, for example a file that
    did not pass `verify_changes`. The edit must pass `verify_changes` before a
    commit. `ctx.extras["edits_not_from_tools"]` keeps these files until a tool
    writes them, so that the refusal can tell the model that no tool made the
    change. Raise `OSError` or `subprocess.SubprocessError` if git cannot read
    the working tree.
    """
    recorded = {posixpath.normpath(path) for path in ctx.extras.get("changed_files") or set()}
    not_from_tools: set[str] = ctx.extras.setdefault("edits_not_from_tools", set())
    for path in git_ops.uncommitted_files(ctx.repo_path):
        if path not in recorded:
            mark_changed(ctx, path)
            not_from_tools.add(path)


def _unverified_refusal(ctx: LoopContext, unverified: set[str]) -> str:
    """Tell the model which files stop the commit.

    The model does not know about a change that no tool made in this turn, and
    can think that it must not touch the file. Thus the refusal names these
    files apart from the files that the model edited.
    """
    not_from_tools = unverified & (ctx.extras.get("edits_not_from_tools") or set())
    from_tools = unverified - not_from_tools
    lines = ["Refusing to commit."]
    if from_tools:
        lines.append(
            "The following changed files have not been verified since their last edit — run "
            f"`verify_changes` first, then retry: {sorted(from_tools)}"
        )
    if not_from_tools:
        lines.append(
            f"Git shows changes in these files that no tool made in this turn: {sorted(not_from_tools)}.  "
            "`commit_session_branch` commits all changes, also these.  Fix them and run "
            "`verify_changes`, or undo them with `discard_file_changes`."
        )
    return "\n".join(lines)


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
    name = f"assistant_{short_id}"
    ctx.extras["session_branch"] = name
    return name


def _commit_to_push_again(ctx: LoopContext) -> str | None:
    """Return the last commit if its push failed, or None if the remote has all commits.

    The working tree is clean, thus there is nothing to commit. But a commit
    with a failed push stays in the container until a later push succeeds.
    """
    if not git_ops.unpushed_files(ctx.repo_path):
        return None
    return git_ops.head_commit(ctx.repo_path)


class CommitSessionBranchArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(
        description="Commit message.  Should describe what changed and why, not how.",
        min_length=1,
    )


class CommitSessionBranchTool(WriteTool[CommitSessionBranchArgs]):
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
        "retry with the same message, which pushes the commit again, or stop "
        "and let the user resolve."
    )
    input_schema = CommitSessionBranchArgs
    is_concurrency_safe = False

    async def run(self, args: CommitSessionBranchArgs, ctx: LoopContext) -> ToolResult:
        try:
            track_uncommitted_files(ctx)
        except (OSError, subprocess.SubprocessError) as exc:
            return ToolResult(content=f"Commit failed: git cannot read the working tree: {exc}", is_error=True)
        unverified = unverified_changed_files(ctx)
        if unverified:
            return ToolResult(content=_unverified_refusal(ctx, unverified), is_error=True)

        branch = _session_branch_name(ctx)
        try:
            commit_hash = git_ops.commit(args.message, ctx.repo_path, branch) or _commit_to_push_again(ctx)
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
            ctx.extras["session_pushed"] = False
            return ToolResult(
                content=(f"Committed {commit_hash} to {branch}, but push failed: {exc}"),
                is_error=True,
                metadata={"commit": commit_hash, "branch": branch, "pushed": False},
            )

        if not pushed:
            ctx.extras["session_pushed"] = False
            return ToolResult(
                content=(f"Committed {commit_hash} to {branch}, but the push was rejected."),
                is_error=True,
                metadata={"commit": commit_hash, "branch": branch, "pushed": False},
            )

        # The remote branch has the latest commit. A failed push sets this flag
        # to False, because the remote branch does not have the local commit.
        ctx.extras["session_pushed"] = True
        return ToolResult(
            content=f"Committed {commit_hash} to {branch} and pushed.",
            metadata={"commit": commit_hash, "branch": branch, "pushed": True},
        )


# `RollbackTool` (broad `git reset --hard HEAD`) was removed in favor
# of `discard_file_changes` in `discard_file_changes_tool.py`, which is surgical (one
# file at a time) and integrates with the read-before-write
# enforcement.  The broad reset became a foot-gun: the model would
# call it on any setback, wiping prior progress instead of iterating.
