"""Diff and publish local prompt files against Langfuse, which serves them.

CI publishes on merge to main, so `--push` is gated behind ALLOW_PROMPT_PUSH=1.
Roll back with `--promote <name> --version <n>`.
"""

from __future__ import annotations

import argparse
import difflib
import os
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

from agents.prompts.loader import PROMPTS_DIR, load_prompt
from benchmarks.lf_api import LangfuseApi

PROMPT_PAGE_SIZE = 100
PUSH_OVERRIDE_VARIABLE = "ALLOW_PROMPT_PUSH"

# Langfuse name -> the local file that serves it, where get_prompt_with_langfuse
# is called with local_path. Without these the file reads as retired.
SERVED_FROM: dict[str, str] = {"intent_check": "intent_security"}


def _is_prompt(path: Path) -> bool:
    return path.name != "README.md"


def _local_prompt_names() -> list[str]:
    return sorted(path.stem for path in PROMPTS_DIR.rglob("*.md") if _is_prompt(path))


def _every_local_name() -> set[str]:
    """Templates and judges live in subdirectories but are prompts to Langfuse.

    `SERVED_FROM` covers the callers whose Langfuse name differs from the filename.
    """
    found = {path.stem for path in PROMPTS_DIR.rglob("*.md") if _is_prompt(path)}
    return found | set(SERVED_FROM)


def _remote(api: LangfuseApi, name: str) -> dict | None:
    """None means Langfuse has no such prompt. Auth, server and transport
    failures raise, so they are never mistaken for an absent prompt."""
    try:
        return api._get(f"/api/public/v2/prompts/{name}")
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            return None
        raise


def _remote_prompts(api: LangfuseApi) -> list[dict]:
    prompts: list[dict] = []
    page = 1
    while True:
        body = api._get("/api/public/v2/prompts", page=page, limit=PROMPT_PAGE_SIZE)
        batch = body.get("data") or []
        prompts.extend(batch)
        total_pages = (body.get("meta") or {}).get("totalPages") or page
        if not batch or page >= total_pages:
            return prompts
        page += 1


def _diff(api: LangfuseApi, name: str) -> bool:
    """Print the drift for one prompt. Returns True when they differ."""
    local = load_prompt(name)["content"]
    remote = _remote(api, name)
    if remote is None:
        print(f"{name}: not in Langfuse (local file is authoritative)")
        return True

    remote_content = remote.get("prompt")
    if not isinstance(remote_content, str):
        print(f"{name}: chat-type prompt, not comparable")
        return False

    if remote_content == local:
        print(f"{name}: in sync (v{remote.get('version')})")
        return False

    print(f"{name}: DRIFT (Langfuse v{remote.get('version')} vs local file)")
    for line in difflib.unified_diff(
        remote_content.splitlines(),
        local.splitlines(),
        fromfile=f"langfuse v{remote.get('version')}",
        tofile="local",
        lineterm="",
        n=1,
    ):
        print(f"  {line}")
    return True


def _drifted(api: LangfuseApi, names: list[str]) -> list[str]:
    return [name for name in names if _diff(api, name)]


def _report_orphans(api: LangfuseApi) -> list[str]:
    """Print every Langfuse prompt with no repo file. Returns their names."""
    local = _every_local_name()
    orphans = sorted(
        (prompt for prompt in _remote_prompts(api) if prompt.get("name") not in local),
        key=lambda prompt: prompt.get("name") or "",
    )
    for prompt in orphans:
        labels = ", ".join(prompt.get("labels") or []) or "no labels"
        print(f"{prompt.get('name')}: in Langfuse ({labels}) with no repo file")
    if orphans:
        print(
            f"\n{len(orphans)} Langfuse prompt(s) have no repo file. Re-adding one of "
            "these names would serve the retired Langfuse version, so archive them "
            "there or restore the file."
        )
    return [prompt.get("name") or "" for prompt in orphans]


def _require_push_override() -> None:
    if os.environ.get(PUSH_OVERRIDE_VARIABLE) == "1":
        return
    raise SystemExit(
        "Prompts publish from CI when a prompt change merges to main, so the "
        "production version always has a reviewed commit behind it. Set "
        f"{PUSH_OVERRIDE_VARIABLE}=1 to publish from here anyway."
    )


def _published_shape(api: LangfuseApi, name: str) -> list | None:
    """The turns of the published chat prompt, or None when it is a text prompt."""
    try:
        published = api._get(f"/api/public/v2/prompts/{name}")
    except Exception:  # noqa: BLE001 — a prompt nobody has published yet is a text prompt
        return None
    if published.get("type") != "chat":
        return None
    return published.get("prompt") or None


def _as_published(name: str, content: str, shape: list | None) -> dict:
    """The local file in the shape Langfuse already serves this prompt in.

    A chat prompt carries the user turn with its `{{variables}}`; publishing the
    file as text would drop that turn and the model would never see the request.
    """
    if shape is None:
        return {"type": "text", "prompt": content}
    turns = [dict(turn) for turn in shape]
    system = [turn for turn in turns if turn.get("role") == "system"]
    if not system:
        raise SystemExit(
            f"{name} is a chat prompt in Langfuse with no system turn, so there is "
            "nowhere to put the file. Fix it there, or publish by hand."
        )
    system[0]["content"] = content
    return {"type": "chat", "prompt": turns}


def _push(api: LangfuseApi, name: str, message: str) -> None:
    local = load_prompt(name)
    shape = _published_shape(api, name)
    created = api._post(
        "/api/public/v2/prompts",
        {
            "name": name,
            **_as_published(name, local["content"], shape),
            "labels": ["production"],
            "commitMessage": message,
        },
    )
    print(f"{name}: published v{created.get('version')} as {created.get('labels')}")


def _promote(api: LangfuseApi, name: str, version: int) -> None:
    updated = api._patch(
        f"/api/public/v2/prompts/{name}/versions/{version}",
        {"newLabels": ["production"]},
    )
    print(f"{name}: v{updated.get('version')} is now {updated.get('labels')}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--diff", nargs="?", const="", metavar="NAME")
    parser.add_argument("--push", nargs="?", const="", metavar="NAME")
    parser.add_argument("--promote", metavar="NAME")
    parser.add_argument("--version", type=int)
    parser.add_argument("-m", "--message", default="Sync from repo")
    args = parser.parse_args()

    if args.push is not None:
        _require_push_override()

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    api = LangfuseApi()

    if args.push is not None:
        names = [args.push] if args.push else _drifted(api, _local_prompt_names())
        for name in names:
            _push(api, name, args.message)
        if not names:
            print("Every prompt is in sync; nothing published")
        return 0

    if args.promote:
        if args.version is None:
            parser.error("--promote needs --version")
        _promote(api, args.promote, args.version)
        return 0

    if args.diff:
        _diff(api, args.diff)
        return 0

    drifted = _drifted(api, _local_prompt_names())
    if drifted:
        print(f"\n{len(drifted)} prompt(s) differ from Langfuse")
    _report_orphans(api)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
