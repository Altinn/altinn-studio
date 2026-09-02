"""Diff and publish local prompt files against Langfuse, which serves them.

`--push` publishes as `production`, so the deployed service picks it up at once.
Roll back with `--promote <name> --version <n>`.
"""

from __future__ import annotations

import argparse
import difflib
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

from agents.prompts.loader import PROMPTS_DIR, load_prompt
from benchmarks.lf_api import LangfuseApi


def _local_prompt_names() -> list[str]:
    return sorted(path.stem for path in PROMPTS_DIR.glob("*.md"))


def _remote(api: LangfuseApi, name: str) -> dict | None:
    """None means Langfuse has no such prompt. Auth, server and transport
    failures raise, so they are never mistaken for an absent prompt."""
    try:
        return api._get(f"/api/public/v2/prompts/{name}")
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            return None
        raise


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


def _push(api: LangfuseApi, name: str, message: str) -> None:
    local = load_prompt(name)
    created = api._post(
        "/api/public/v2/prompts",
        {
            "name": name,
            "type": "text",
            "prompt": local["content"],
            "labels": ["production"],
            "commitMessage": message,
        },
    )
    print(f"{name}: published v{created.get('version')} as {created.get('labels')}")


def _promote(api: LangfuseApi, name: str, version: int) -> None:
    updated = api._patch(
        f"/api/public/v2/prompts/{name}/version/{version}",
        {"newLabels": ["production"]},
    )
    print(f"{name}: v{updated.get('version')} is now {updated.get('labels')}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--diff", nargs="?", const="", metavar="NAME")
    parser.add_argument("--push", metavar="NAME")
    parser.add_argument("--promote", metavar="NAME")
    parser.add_argument("--version", type=int)
    parser.add_argument("-m", "--message", default="Sync from repo")
    args = parser.parse_args()

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    api = LangfuseApi()

    if args.push:
        _push(api, args.push, args.message)
        return 0

    if args.promote:
        if args.version is None:
            parser.error("--promote needs --version")
        _promote(api, args.promote, args.version)
        return 0

    names = [args.diff] if args.diff else _local_prompt_names()
    drifted = [name for name in names if _diff(api, name)]
    if drifted:
        print(f"\n{len(drifted)} prompt(s) differ from Langfuse")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
