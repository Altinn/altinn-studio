"""Small, CC-style file tools.

The agentic loop's previous `propose_patch` bundled every change into
one validated transaction.  When any change failed validation the
whole thing was rejected, the model rolled back, and we lost
progress.  On compound tasks this thrashed for 20 turns and never
converged.

These tools mirror Claude Code's surface: `read_file`, `edit_file`,
`write_file`, `discard_file_changes`.  Each call does ONE thing, the
result is visible on disk immediately, and errors point at a specific
location the model can fix on the next call.

Read-before-write is enforced: the model cannot edit or overwrite an
existing file it hasn't read.  This forces a "stabilize state, then
modify" rhythm that CC uses to prevent blind retries.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult

from ._write_base import WriteToolMixin
from agents.core.tool import Tool


# Cap on a single read's payload — without this, a 200kB schema file
# would dominate the model's context budget.  Truncation marker mirrors
# the compaction layer's style so the model recognizes it.
_MAX_READ_CHARS = 60_000


# ---------------------------------------------------------------------------
# Path safety
# ---------------------------------------------------------------------------


class PathError(Exception):
    """Raised when a repo-relative path is unsafe or invalid."""


def _resolve_repo_path(repo_path: str, rel_path: str) -> Path:
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


def _mark_read(ctx: LoopContext, rel_path: str) -> None:
    read_set: set[str] = ctx.extras.setdefault("read_set", set())
    read_set.add(rel_path)


def _mark_changed(ctx: LoopContext, rel_path: str) -> None:
    changed: set[str] = ctx.extras.setdefault("changed_files", set())
    changed.add(rel_path)
    # A re-edited file needs to be re-verified before commit.  Drop any
    # prior verification badge so commit_session_branch's gate triggers
    # again after this write.
    verified = ctx.extras.get("verified_files")
    if verified is not None:
        verified.discard(rel_path)


def _is_read(ctx: LoopContext, rel_path: str) -> bool:
    return rel_path in (ctx.extras.get("read_set") or set())


# ---------------------------------------------------------------------------
# read_file
# ---------------------------------------------------------------------------


class ReadFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path.")


class ReadFileTool(Tool):
    name = "read_file"
    description = (
        "Read a file from the session repository and return its contents.\n\n"
        "USE this BEFORE editing or overwriting any file — `edit_file` and "
        "`write_file` will refuse to touch a file you haven't read.  Also "
        "use it whenever you need to confirm the exact current text of a "
        "section (for example, before constructing an `edit_file` "
        "`old_string`).\n\n"
        "Returns the file's full text.  Very large files are truncated; if "
        "the truncation marker appears, narrow your inspection by reading a "
        "more specific file or using one of the `altinn_*` lookup tools.\n\n"
        "Takes one input: `path` — repo-relative (no leading `/`, no `..`)."
    )
    input_schema = ReadFileArgs
    is_concurrency_safe = True
    is_read_only = True

    async def run(self, args: ReadFileArgs, ctx: LoopContext) -> ToolResult:
        try:
            full = _resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        if not full.exists():
            return ToolResult(content=f"File does not exist: {args.path}", is_error=True)
        if full.is_dir():
            return ToolResult(
                content=(
                    f"Not a file: {args.path} is a directory.  "
                    "Call `scan_repo` to see the repo inventory, or call "
                    "`read_file` on a specific file inside this directory."
                ),
                is_error=True,
            )
        if not full.is_file():
            return ToolResult(content=f"Not a file: {args.path}", is_error=True)
        try:
            text = full.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return ToolResult(
                content=f"File {args.path} is not UTF-8 text — cannot read.",
                is_error=True,
            )
        except OSError as exc:
            return ToolResult(content=f"Read failed: {exc}", is_error=True)

        _mark_read(ctx, args.path)

        if len(text) > _MAX_READ_CHARS:
            head = text[:_MAX_READ_CHARS]
            return ToolResult(
                content=(
                    head
                    + f"\n\n[…truncated {len(text) - _MAX_READ_CHARS} chars. "
                    "Use a more specific tool or read a smaller file if you need the rest.]"
                ),
                metadata={"truncated": True, "chars": len(text)},
            )
        return ToolResult(content=text, metadata={"chars": len(text)})


# ---------------------------------------------------------------------------
# edit_file
# ---------------------------------------------------------------------------


class EditFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path.")
    old_string: str = Field(
        min_length=1,
        description="Exact text to find.  Must appear in the file.  Must be unique unless `replace_all` is true.",
    )
    new_string: str = Field(
        description="Replacement text.  May be empty to delete the matched region.",
    )
    replace_all: bool = Field(
        default=False,
        description="Replace every occurrence.  Default false — for safety, the model is forced to provide enough context to make `old_string` unique.",
    )


class EditFileTool(WriteToolMixin):
    name = "edit_file"
    description = (
        "Find a literal string in a file and replace it.  Surgical: one "
        "file, one replacement (or all occurrences if `replace_all` is true).\n\n"
        "PRECONDITION: you MUST call `read_file` on the path first this "
        "session.  This tool will refuse the edit otherwise — it's the "
        "main mechanism for keeping you grounded in the file's actual state.\n\n"
        "MATCHING: `old_string` is matched as literal text (not a regex).  "
        "It must appear EXACTLY once unless you set `replace_all=true`.  "
        "If your `old_string` matches multiple places, the tool will say so "
        "— add enough surrounding context (whitespace, neighboring lines) "
        "to make the match unique.\n\n"
        "FAILURE MODES:\n"
        "  - `File has not been read yet` — call `read_file` first.\n"
        "  - `old_string not found` — your text doesn't appear in the file.  "
        "Re-read the file and copy the exact characters; do not retry the "
        "same `old_string`.\n"
        "  - `old_string matches N times` — broaden `old_string` with extra "
        "context, or set `replace_all=true` if you want every match changed.\n"
        "  - `new_string equals old_string` — nothing to do.\n\n"
        "Each successful edit lands on disk immediately and the file is "
        "marked as changed — call `verify_changes` once your set of edits "
        "is complete, then `commit_session_branch`."
    )
    input_schema = EditFileArgs
    is_concurrency_safe = False  # writes — must serialize

    async def run(self, args: EditFileArgs, ctx: LoopContext) -> ToolResult:
        if args.old_string == args.new_string:
            return ToolResult(
                content="`old_string` equals `new_string` — no change to apply.",
                is_error=True,
            )
        try:
            full = _resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        if not full.exists() or not full.is_file():
            return ToolResult(content=f"File does not exist: {args.path}", is_error=True)
        if not _is_read(ctx, args.path):
            return ToolResult(
                content=(
                    f"File has not been read yet: {args.path}. "
                    "Call `read_file` first so you can see the exact current text."
                ),
                is_error=True,
            )
        try:
            text = full.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError) as exc:
            return ToolResult(content=f"Read failed: {exc}", is_error=True)

        occurrences = text.count(args.old_string)
        if occurrences == 0:
            return ToolResult(
                content=(
                    f"`old_string` not found in {args.path}.  Re-read the file and "
                    "copy the exact text — do not retry the same value."
                ),
                is_error=True,
            )
        if occurrences > 1 and not args.replace_all:
            return ToolResult(
                content=(
                    f"`old_string` matches {occurrences} places in {args.path}.  "
                    "Broaden `old_string` with surrounding context so it matches "
                    "exactly one place, or set `replace_all=true`."
                ),
                is_error=True,
            )

        if args.replace_all:
            new_text = text.replace(args.old_string, args.new_string)
            replaced = occurrences
        else:
            new_text = text.replace(args.old_string, args.new_string, 1)
            replaced = 1

        try:
            full.write_text(new_text, encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Write failed: {exc}", is_error=True)

        _mark_changed(ctx, args.path)
        return ToolResult(
            content=f"Edited {args.path}: replaced {replaced} occurrence(s).",
            metadata={"replaced": replaced, "path": args.path},
        )


# ---------------------------------------------------------------------------
# write_file
# ---------------------------------------------------------------------------


class WriteFileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path.")
    content: str = Field(description="Full new contents of the file.")


class WriteFileTool(WriteToolMixin):
    name = "write_file"
    description = (
        "Create a new file, or completely overwrite an existing one.\n\n"
        "PREFER `edit_file` for modifications — it only sends the changed "
        "region and keeps unrelated content intact.  Use `write_file` only "
        "when:\n"
        "  - You are creating a brand-new file (the path does not exist), or\n"
        "  - You are doing a wholesale rewrite of a small file.\n\n"
        "PRECONDITION (existing files): you MUST call `read_file` first so "
        "your replacement is informed by current content.  For new files "
        "this is skipped — there's nothing to read.\n\n"
        "Parent directories are created as needed."
    )
    input_schema = WriteFileArgs
    is_concurrency_safe = False

    async def run(self, args: WriteFileArgs, ctx: LoopContext) -> ToolResult:
        try:
            full = _resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        existing = full.exists()
        if existing and not _is_read(ctx, args.path):
            return ToolResult(
                content=(
                    f"{args.path} already exists.  Call `read_file` first or use "
                    "`edit_file` if you only want to change a section."
                ),
                is_error=True,
            )
        try:
            full.parent.mkdir(parents=True, exist_ok=True)
            full.write_text(args.content, encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Write failed: {exc}", is_error=True)

        _mark_changed(ctx, args.path)
        # A fresh write counts as having "read" the file at its current
        # state — future edits on the same path are safe.
        _mark_read(ctx, args.path)
        verb = "Overwrote" if existing else "Created"
        return ToolResult(
            content=f"{verb} {args.path} ({len(args.content)} chars).",
            metadata={"path": args.path, "created": not existing},
        )


# ---------------------------------------------------------------------------
# discard_file_changes (narrow replacement for the old rollback)
# ---------------------------------------------------------------------------


class DiscardFileChangesArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str = Field(min_length=1, description="Repo-relative path to reset to HEAD.")


class DiscardFileChangesTool(WriteToolMixin):
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
            _resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        try:
            subprocess.run(
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
        # Drop the file from all tracking sets — its in-memory state is
        # no longer "the version we modified" nor "the version we read",
        # and its prior verification badge no longer applies.
        (ctx.extras.get("changed_files") or set()).discard(args.path)
        (ctx.extras.get("read_set") or set()).discard(args.path)
        (ctx.extras.get("verified_files") or set()).discard(args.path)
        return ToolResult(content=f"Reset {args.path} to HEAD.")
