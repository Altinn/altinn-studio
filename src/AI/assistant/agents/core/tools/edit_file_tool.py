"""`edit_file` — replace a literal string in one file.

When the exact text is not found, the tool tries once more and ignores
whitespace around punctuation.
"""

from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field

from agents.core.tool import LoopContext, ToolResult

from ._repo_files import PathError, is_read, mark_changed, resolve_repo_path
from ._studio_json import describe_formatting, format_json_like_studio
from ._write_base import WriteToolMixin


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


class EditFileTool(WriteToolMixin[EditFileArgs]):
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
            full = resolve_repo_path(ctx.repo_path, args.path)
        except PathError as exc:
            return ToolResult(content=str(exc), is_error=True)
        if not full.exists() or not full.is_file():
            return ToolResult(content=f"File does not exist: {args.path}", is_error=True)
        if not is_read(ctx, args.path):
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
        matched_on_whitespace = False
        if occurrences == 0:
            spans = _whitespace_insensitive_spans(text, args.old_string)
            if len(spans) != 1:
                found = ""
                if len(spans) > 1:
                    found = f"  Ignoring whitespace it would match {len(spans)} places, so add surrounding context."
                return ToolResult(
                    content=(
                        f"`old_string` not found in {args.path}.  Re-read the file and "
                        f"copy the exact text — do not retry the same value.{found}"
                    ),
                    is_error=True,
                )
            start, end = spans[0]
            text = text[:start] + args.old_string + text[end:]
            occurrences = 1
            matched_on_whitespace = True
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
        formatted_text = format_json_like_studio(args.path, new_text)

        try:
            full.write_text(formatted_text, encoding="utf-8")
        except OSError as exc:
            return ToolResult(content=f"Write failed: {exc}", is_error=True)

        mark_changed(ctx, args.path)
        note = describe_formatting(
            is_reformatted=formatted_text != new_text,
            matched_on_whitespace=matched_on_whitespace,
        )
        return ToolResult(
            content=f"Edited {args.path}: replaced {replaced} occurrence(s).{note}",
            metadata={
                "replaced": replaced,
                "path": args.path,
                "matched_on_whitespace": matched_on_whitespace,
            },
        )


def _whitespace_insensitive_spans(text: str, needle: str) -> list[tuple[int, int]]:
    """Where `needle` occurs in `text` when whitespace around punctuation is ignored.

    Whitespace may appear or vanish next to punctuation but never between words,
    and the contents of a quoted string stay exact.
    """
    if not needle.strip():
        return []  # nothing to match on, and every run of whitespace would qualify

    structural = set("{}[](),:;")
    quotes = {'"', "'", "`"}
    pattern: list[str] = []
    in_string: str | None = None
    escaped = False
    last_significant = ""
    index = 0
    while index < len(needle):
        char = needle[index]
        if in_string:
            pattern.append(re.escape(char))
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == in_string:
                in_string = None
            last_significant = char
            index += 1
            continue
        if char.isspace():
            run = index
            while run < len(needle) and needle[run].isspace():
                run += 1
            following = needle[run] if run < len(needle) else ""
            beside_punctuation = last_significant in structural or following in structural
            marker = r"\s*" if beside_punctuation else r"\s+"
            if pattern and pattern[-1] in (r"\s*", r"\s+"):
                pattern[-1] = marker if marker == r"\s+" else pattern[-1]
            else:
                pattern.append(marker)
            index = run
            continue
        if char in structural:
            if pattern and pattern[-1] not in (r"\s*", r"\s+"):
                pattern.append(r"\s*")
            pattern.append(re.escape(char))
            pattern.append(r"\s*")
            last_significant = char
            index += 1
            continue
        pattern.append(re.escape(char))
        if char in quotes:
            in_string = char
        last_significant = char
        index += 1
    joined = "".join(pattern).strip()
    if not joined or in_string:
        return []
    # Every start position, not just the non-overlapping ones: two candidates that
    # overlap are still two, and this match only applies when there is exactly one.
    spans = [(found.start(), found.start() + len(found.group(1))) for found in re.finditer(f"(?=({joined}))", text)]
    return _without_whitespace_variants(spans)


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
