"""JSON formatting shared by `edit_file` and `write_file`."""

from __future__ import annotations

import json
import re

_JSON_FILE_SUFFIX = ".json"
_STUDIO_JSON_INDENT = "  "
_JSON_TOKEN = re.compile(r'"(?:[^"\\]|\\.)*"|[{}\[\],:]|[^\s{}\[\],:"]+')
_JSON_OPENERS = {"{", "["}
_JSON_CLOSERS = {"}", "]"}
_JSON_LINE_ENDERS = {"{", "[", ","}


def format_json_like_studio(rel_path: str, text: str) -> str:
    """Studio saves JSON in this format, so a file keeps one format when Studio and the assistant both change it.

    Only whitespace changes. Strings and numbers keep their text, so escapes, number precision and duplicate keys
    elsewhere in the file stay as they are. Text that is not strict JSON, such as `NaN`, stays as written.
    """
    if not rel_path.endswith(_JSON_FILE_SUFFIX):
        return text
    try:
        json.loads(text, parse_constant=_reject_json_constant)
    except (ValueError, RecursionError):
        return text
    return _indent_json_tokens(_JSON_TOKEN.findall(text))


def _reject_json_constant(name: str) -> None:
    raise ValueError(f"{name} is not valid JSON.")


def _indent_json_tokens(tokens: list[str]) -> str:
    parts: list[str] = []
    depth = 0
    previous = ""
    for token in tokens:
        if token in _JSON_CLOSERS:
            depth -= 1
        parts.append(_get_json_separator(previous, token, depth))
        parts.append(token)
        if token in _JSON_OPENERS:
            depth += 1
        previous = token
    return "".join(parts)


def _get_json_separator(previous: str, token: str, depth: int) -> str:
    """Studio puts each value on its own line and writes an empty array or object as `[]` or `{}`."""
    if previous == ":":
        return " "
    is_empty_container = previous in _JSON_OPENERS and token in _JSON_CLOSERS
    starts_line = previous in _JSON_LINE_ENDERS or token in _JSON_CLOSERS
    if starts_line and not is_empty_container:
        return "\n" + _STUDIO_JSON_INDENT * depth
    return ""


def describe_formatting(*, is_reformatted: bool, matched_on_whitespace: bool) -> str:
    if is_reformatted:
        return "  The JSON is now formatted as Studio formats it, so its whitespace can differ from what you sent."
    if matched_on_whitespace:
        return "  `old_string` matched only after ignoring whitespace, so that region now carries your formatting."
    return ""
