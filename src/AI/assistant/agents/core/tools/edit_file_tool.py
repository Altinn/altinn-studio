"""`edit_file` — replace a literal string in one file.

When the exact text is not found, the tool tries once more and ignores
whitespace around punctuation.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import NamedTuple

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult, WriteTool

from .utils.repo_files import PathError, is_read, mark_changed, resolve_repo_path
from .utils.studio_json import describe_formatting, format_json_like_studio

_STRUCTURAL_CHARS = frozenset("{}[](),:;")
_QUOTE_CHARS = frozenset("\"'`")
_OPTIONAL_WHITESPACE = r"\s*"
_REQUIRED_WHITESPACE = r"\s+"
# A quoted string with its escapes, a run of whitespace, or one other character.
_NEEDLE_TOKEN = re.compile(r"""(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1|\s+|[\s\S]""")


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


class EditFileTool(WriteTool[EditFileArgs]):
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
        file = _read_file_to_edit(ctx, args.path)
        if isinstance(file, ToolResult):
            return file
        full, text = file
        edit = _apply_edit(text, args)
        if isinstance(edit, ToolResult):
            return edit
        formatted_text = format_json_like_studio(args.path, edit.new_text)

        try:
            full.write_text(formatted_text, encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Write failed: {exc}", is_error=True)

        mark_changed(ctx, args.path)
        note = describe_formatting(
            is_reformatted=formatted_text != edit.new_text,
            matched_on_whitespace=edit.matched_on_whitespace,
        )
        return ToolResult(
            content=f"Edited {args.path}: replaced {edit.replaced} occurrence(s).{note}",
            metadata={
                "replaced": edit.replaced,
                "path": args.path,
                "matched_on_whitespace": edit.matched_on_whitespace,
            },
        )


class _Edit(NamedTuple):
    new_text: str
    replaced: int
    matched_on_whitespace: bool


def _read_file_to_edit(ctx: LoopContext, rel_path: str) -> tuple[Path, str] | ToolResult:
    try:
        full = resolve_repo_path(ctx.repo_path, rel_path)
    except PathError as exc:
        return ToolResult(content=str(exc), is_error=True)
    if not full.exists() or not full.is_file():
        return ToolResult(content=f"File does not exist: {rel_path}", is_error=True)
    if not is_read(ctx, rel_path):
        return ToolResult(
            content=(
                f"File has not been read yet: {rel_path}. Call `read_file` first so you can see the exact current text."
            ),
            is_error=True,
        )
    try:
        return full, full.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError) as exc:
        return ToolResult(content=f"Read failed: {exc}", is_error=True)


def _apply_edit(text: str, args: EditFileArgs) -> _Edit | ToolResult:
    occurrences = text.count(args.old_string)
    if occurrences == 0:
        return _apply_whitespace_insensitive_edit(text, args)
    if occurrences > 1 and not args.replace_all:
        return ToolResult(
            content=(
                f"`old_string` matches {occurrences} places in {args.path}.  "
                "Broaden `old_string` with surrounding context so it matches "
                "exactly one place, or set `replace_all=true`."
            ),
            is_error=True,
        )
    return _replace_old_string(text, args, occurrences, matched_on_whitespace=False)


def _apply_whitespace_insensitive_edit(text: str, args: EditFileArgs) -> _Edit | ToolResult:
    spans = _whitespace_insensitive_spans(text, args.old_string)
    if len(spans) != 1:
        return _report_missing_old_string(args.path, len(spans))
    start, end = spans[0]
    exact_text = text[:start] + args.old_string + text[end:]
    return _replace_old_string(exact_text, args, 1, matched_on_whitespace=True)


def _replace_old_string(text: str, args: EditFileArgs, occurrences: int, *, matched_on_whitespace: bool) -> _Edit:
    if args.replace_all:
        return _Edit(text.replace(args.old_string, args.new_string), occurrences, matched_on_whitespace)
    return _Edit(text.replace(args.old_string, args.new_string, 1), 1, matched_on_whitespace)


def _report_missing_old_string(rel_path: str, whitespace_match_count: int) -> ToolResult:
    found = ""
    if whitespace_match_count > 1:
        found = f"  Ignoring whitespace it would match {whitespace_match_count} places, so add surrounding context."
    return ToolResult(
        content=(
            f"`old_string` not found in {rel_path}.  Re-read the file and "
            f"copy the exact text — do not retry the same value.{found}"
        ),
        is_error=True,
    )


def _whitespace_insensitive_spans(text: str, needle: str) -> list[tuple[int, int]]:
    """Where `needle` occurs in `text` when whitespace around punctuation is ignored.

    Whitespace may appear or vanish next to punctuation but never between words,
    and the contents of a quoted string stay exact.
    """
    if not needle.strip():
        return []  # nothing to match on, and every run of whitespace would qualify
    pattern = _build_whitespace_insensitive_pattern(needle)
    if not pattern:
        return []
    # Every start position, not just the non-overlapping ones: two candidates that
    # overlap are still two, and this match only applies when there is exactly one.
    spans = [(found.start(), found.start() + len(found.group(1))) for found in re.finditer(f"(?=({pattern}))", text)]
    return _without_whitespace_variants(spans)


def _build_whitespace_insensitive_pattern(needle: str) -> str:
    """Return an empty pattern when a string in `needle` has no closing quote."""
    tokens = [found.group() for found in _NEEDLE_TOKEN.finditer(needle)]
    parts: list[str] = []
    for previous, token, following in zip(["", *tokens[:-1]], tokens, [*tokens[1:], ""], strict=True):
        if token in _QUOTE_CHARS:
            return ""
        parts.append(_translate_needle_token(previous, token, following))
    return "".join(parts)


def _translate_needle_token(previous: str, token: str, following: str) -> str:
    if token.isspace():
        return _translate_whitespace(previous[-1:], following[:1])
    if token in _STRUCTURAL_CHARS:
        return _translate_structural_char(previous, token)
    return re.escape(token)


def _translate_whitespace(before: str, after: str) -> str:
    if before in _STRUCTURAL_CHARS:
        return ""  # the structural character before it already allows whitespace
    return _OPTIONAL_WHITESPACE if after in _STRUCTURAL_CHARS else _REQUIRED_WHITESPACE


def _translate_structural_char(previous: str, char: str) -> str:
    """Whitespace can come before and after a structural character."""
    has_whitespace_marker_before = not previous or previous.isspace() or previous in _STRUCTURAL_CHARS
    prefix = "" if has_whitespace_marker_before else _OPTIONAL_WHITESPACE
    return prefix + re.escape(char) + _OPTIONAL_WHITESPACE


def _without_whitespace_variants(spans: list[tuple[int, int]]) -> list[tuple[int, int]]:
    r"""One candidate per region.

    A leading `\s*` matches with and without the whitespace it can absorb, which
    is one place rather than several.
    """
    longest_by_end: dict[int, int] = {}
    for start, end in spans:
        if end not in longest_by_end or start < longest_by_end[end]:
            longest_by_end[end] = start
    return sorted((start, end) for end, start in longest_by_end.items())
