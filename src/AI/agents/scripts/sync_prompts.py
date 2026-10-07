"""Diff and publish local prompt files against Langfuse, which serves them.

CI publishes on merge to main, so `--push` is gated behind ALLOW_PROMPT_PUSH=1.
Roll back with `--promote <name> --version <n>`. Retire a prompt no repo file
serves with `--retire`, which archives its text before deleting it.
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import sys
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

from agents.prompts.loader import PROMPTS_DIR, load_prompt
from benchmarks.lf_api import LangfuseApi

PROMPT_PAGE_SIZE = 100
PUSH_OVERRIDE_VARIABLE = "ALLOW_PROMPT_PUSH"
DELETE_OVERRIDE_VARIABLE = "ALLOW_PROMPT_DELETE"

# Langfuse name -> the local file that serves it, where get_prompt_with_langfuse
# is called with local_path. Without these the file reads as retired.
HTTP_NOT_FOUND = 404

SERVED_FROM: dict[str, str] = {"intent_check": "intent_security"}

# Judges run as Langfuse evaluator templates, not prompts, so they cannot be diffed.
JUDGE_DIR = "llm-as-a-judge"

# Deleting a prompt in Langfuse takes its text with it, so it is kept here first.
RETIRED_FILE = PROMPTS_DIR / "retired.json"


def _is_prompt(path: Path) -> bool:
    return path.name != "README.md" and JUDGE_DIR not in path.parts


def _judge_templates() -> list[str]:
    return sorted(path.stem for path in (PROMPTS_DIR / JUDGE_DIR).glob("*.md"))


def _report_judges() -> None:
    names = _judge_templates()
    if not names:
        return
    print(
        f"\n{len(names)} judge template(s) live in Langfuse as evaluators rather than "
        "prompts, so this report cannot compare them: " + ", ".join(names) + ".\nThe files under "
        f"agents/prompts/{JUDGE_DIR}/ are the reviewed source; the running text is "
        "configured in the Langfuse UI."
    )


def _local_prompt_names() -> list[str]:
    return sorted(path.stem for path in PROMPTS_DIR.rglob("*.md") if _is_prompt(path))


def _every_local_name() -> set[str]:
    """Templates and judges live in subdirectories but are prompts to Langfuse.

    A file that serves another name does not account for its own, so a Langfuse
    `intent_security` is retired rather than local while the file serves `intent_check`.
    """
    found = {path.stem for path in PROMPTS_DIR.rglob("*.md") if _is_prompt(path)}
    return (found - set(SERVED_FROM.values())) | set(SERVED_FROM)


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


def _served_as(name: str) -> str:
    """The Langfuse name for a local file, where the two differ."""
    for langfuse_name, local_file in SERVED_FROM.items():
        if local_file == name:
            return langfuse_name
    return name


def _system_turn(content: object) -> str | None:
    """A chat prompt's system text, which is the half a repo file holds."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        for message in content:
            if isinstance(message, dict) and message.get("role") == "system":
                text = message.get("content")
                if isinstance(text, str):
                    return text
    return None


def _diff(api: LangfuseApi, name: str) -> bool:
    """Print the drift for one prompt. Returns True when they differ."""
    local = load_prompt(name)["content"]
    remote = _remote(api, _served_as(name))
    if remote is None:
        print(f"{name}: not in Langfuse (local file is authoritative)")
        return True

    remote_content = _system_turn(remote.get("prompt"))
    if remote_content is None:
        print(f"{name}: published with no system turn, not comparable")
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


def _orphan_prompts(api: LangfuseApi) -> list[dict]:
    local = _every_local_name()
    return sorted(
        (prompt for prompt in _remote_prompts(api) if prompt.get("name") not in local),
        key=lambda prompt: prompt.get("name") or "",
    )


def _report_orphans(api: LangfuseApi) -> list[str]:
    """Print every Langfuse prompt with no repo file. Returns their names."""
    orphans = _orphan_prompts(api)
    for prompt in orphans:
        labels = ", ".join(prompt.get("labels") or []) or "no labels"
        print(f"{prompt.get('name')}: in Langfuse ({labels}) with no repo file")
    if orphans:
        print(
            f"\n{len(orphans)} Langfuse prompt(s) have no repo file. Re-adding one of "
            "these names would serve the retired Langfuse version, so --retire them "
            "or restore the file."
        )
    return [prompt.get("name") or "" for prompt in orphans]


def _require_delete_override() -> None:
    if os.environ.get(DELETE_OVERRIDE_VARIABLE) == "1":
        return
    raise SystemExit(
        "Retiring deletes every version of a prompt in Langfuse and cannot be "
        f"undone. Set {DELETE_OVERRIDE_VARIABLE}=1 to do it anyway."
    )


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
    except httpx.HTTPStatusError as error:
        if error.response.status_code == HTTP_NOT_FOUND:
            return None  # nobody has published this one yet, so text is the shape
        raise SystemExit(
            f"Could not read the published {name}: {error}. Refusing to publish, "
            "because guessing the shape can drop a chat prompt's variables."
        ) from error
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
    served = _served_as(name)
    created = api._post(
        "/api/public/v2/prompts",
        {
            "name": served,
            **_as_published(served, local["content"], _published_shape(api, served)),
            "labels": ["production"],
            "commitMessage": message,
        },
    )
    served_note = f" (serving {served})" if served != name else ""
    print(f"{name}: published v{created.get('version')} as {created.get('labels')}{served_note}")


ARCHIVED_FIELDS = ("version", "type", "labels", "tags", "config", "commitMessage", "prompt")


def _archived_versions(api: LangfuseApi, name: str, versions: list[int]) -> list[dict]:
    kept = []
    for version in sorted(versions):
        published = api._get(f"/api/public/v2/prompts/{name}", version=version)
        kept.append({field: published.get(field) for field in ARCHIVED_FIELDS})
    return kept


def _archive(api: LangfuseApi, prompt: dict) -> int:
    """Keep a prompt's text in the repo so deleting it in Langfuse loses nothing.

    A name can be retired, recreated and retired again, and the versions restart at 1
    each time, so records append per name rather than replacing.
    """
    name = prompt["name"]
    archive = json.loads(RETIRED_FILE.read_text(encoding="utf-8")) if RETIRED_FILE.exists() else {}
    record = {
        "retired_on": date.today().isoformat(),
        "versions": _archived_versions(api, name, prompt.get("versions") or []),
    }
    archive.setdefault(name, []).append(record)
    RETIRED_FILE.write_text(
        json.dumps(dict(sorted(archive.items())), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return len(record["versions"])


def _retire(api: LangfuseApi, prompt: dict) -> None:
    name = prompt["name"]
    if name in _every_local_name():
        raise SystemExit(f"{name} is served from a repo file, so it is not retired")
    kept = _archive(api, prompt)
    api._delete(f"/api/public/v2/prompts/{name}")
    print(f"{name}: {kept} version(s) archived, deleted from Langfuse")


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
    parser.add_argument("--retire", nargs="?", const="", metavar="NAME")
    parser.add_argument("--version", type=int)
    parser.add_argument("-m", "--message", default="Sync from repo")
    args = parser.parse_args()

    if args.push is not None:
        _require_push_override()
    if args.retire is not None:
        _require_delete_override()

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    api = LangfuseApi()

    if args.push is not None:
        names = [args.push] if args.push else _drifted(api, _local_prompt_names())
        for name in names:
            _push(api, name, args.message)
        if not names:
            print("Every prompt is in sync; nothing published")
        return 0

    if args.retire is not None:
        orphans = _orphan_prompts(api)
        if args.retire:
            orphans = [prompt for prompt in orphans if prompt.get("name") == args.retire]
            if not orphans:
                raise SystemExit(f"{args.retire} is not a Langfuse prompt without a repo file")
        for prompt in orphans:
            _retire(api, prompt)
        if not orphans:
            print("Every Langfuse prompt has a repo file; nothing retired")
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
    _report_judges()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
