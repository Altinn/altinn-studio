"""Path safety and read/change tracking shared by the file tools.

Read-before-write is enforced: the model cannot edit or overwrite an
existing file it hasn't read.  This forces a "stabilize state, then
modify" rhythm that CC uses to prevent blind retries.
"""

from __future__ import annotations

from pathlib import Path

from agents.core.tool import LoopContext


class PathError(Exception):
    """Raised when a repo-relative path is unsafe or invalid."""


def resolve_repo_path(repo_path: str, rel_path: str) -> Path:
    """Resolve `rel_path` under `repo_path`, refusing escapes.

    The model only ever names repo-relative paths.  We reject absolute
    paths and any `..` segments outright so a confused or adversarial
    model can't reach the host filesystem.
    """
    if not rel_path:
        raise PathError("path is required.")
    candidate = Path(rel_path)
    if candidate.is_absolute():
        raise PathError(f"Absolute paths are not allowed: {rel_path!r}.")
    if any(part == ".." for part in candidate.parts):
        raise PathError(f"Parent-directory references are not allowed: {rel_path!r}.")
    full = (Path(repo_path) / candidate).resolve()
    repo_root = Path(repo_path).resolve()
    try:
        full.relative_to(repo_root)
    except ValueError as exc:
        raise PathError(f"Path escapes the repo: {rel_path!r}.") from exc
    return full


def mark_read(ctx: LoopContext, rel_path: str) -> None:
    read_set: set[str] = ctx.extras.setdefault("read_set", set())
    read_set.add(rel_path)


def mark_changed(ctx: LoopContext, rel_path: str) -> None:
    changed: set[str] = ctx.extras.setdefault("changed_files", set())
    changed.add(rel_path)
    # A re-edited file needs to be re-verified before commit.  Drop any
    # prior verification badge so commit_session_branch's gate triggers
    # again after this write.
    verified = ctx.extras.get("verified_files")
    if verified is not None:
        verified.discard(rel_path)


def is_read(ctx: LoopContext, rel_path: str) -> bool:
    return rel_path in (ctx.extras.get("read_set") or set())
