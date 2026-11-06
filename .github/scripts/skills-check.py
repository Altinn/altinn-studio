# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx==0.28.1", "pyyaml==6.0.3", "tiktoken==0.13.0"]
# ///
"""Check Agent Skills against the published rules for their format and size, and check that their links work.

Usage: uv run --script .github/scripts/skills-check.py [--no-links] <skills dir> [<skills dir> ...]

A skills dir holds one directory per skill, each with a SKILL.md. The check fails when a skill breaks a rule below,
when a relative link points to a missing file, or when a web link answers 404 or 410, or its host does not answer.
Other answers, such as 403, 429, 5xx or a timeout, are warnings, since they say little about whether the page exists.
A URL in code is a value to write, a namespace or an example, so only links outside code are checked.

Agents read skills as tokens, so sizes are counted in tokens. No published rule names a tokenizer. The count uses
o200k_base, the encoding of the models the Studio Assistant runs on, as a proxy for every agent.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import tiktoken
import yaml

# Requirements in the Agent Skills specification (https://agentskills.io/specification). Its validator, skills-ref,
# rejects a skill that breaks one.
SPEC_FIELDS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_NAME_CHARS = 64
MAX_DESCRIPTION_CHARS = 1_024
MAX_COMPATIBILITY_CHARS = 500
# Requirements in Anthropic's skill documentation, for skills that Claude loads.
RESERVED_NAME_WORDS = ("anthropic", "claude")
XML_TAG = re.compile(r"<[A-Za-z/][^>]*>")

# Recommendations in the specification. An agent reads the whole SKILL.md body when it activates the skill, so the
# body stays under 5,000 tokens and the file under 500 lines.
MAX_TOKENS = 5_000
MAX_LINES = 500
# Our own rule: every other file in a skill gets the same cap. The specification only says to keep reference files
# focused, but an agent that opens one reads it whole, just as it reads SKILL.md.
# Recommendation in Anthropic's skill authoring best practices: a reference file longer than 100 lines starts with a
# table of contents, so an agent that reads only the start still sees what the file holds.
TOC_AFTER_LINES = 100
TOC_HEADING = re.compile(r"^##\s+contents\s*$", re.IGNORECASE)

# The Studio Assistant appends the version file that matches the app to SKILL.md. The summary shows that sum, which no
# rule covers.
VERSION_FILES = ("references/v8.md", "references/v9.md")
TEXT_SUFFIXES = {".md", ".txt", ".json", ".yaml", ".yml", ".xml"}

FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
FENCED_CODE = re.compile(r"^[ \t]*(```|~~~)[^\n]*\n.*?^[ \t]*\1[^\n]*$", re.DOTALL | re.MULTILINE)
INLINE_CODE = re.compile(r"`[^`\n]+`")
WEB_URL = re.compile(r"https?://[^\s<>\"'`)\]]+")
RELATIVE_LINK = re.compile(r"\]\((?!https?://|mailto:|#)([^)\s]+)\)")
# URLs with these are templates or examples, such as https://{org}.apps.altinn.no/<path>.
PLACEHOLDER = re.compile(r"[{}<>*]|\.\.\.|…")
SKIPPED_HOSTS = {"localhost", "127.0.0.1", "local.altinn.cloud"}
EXAMPLE_HOST = re.compile(r"(^|\.)example\.[a-z]+$")

# Requests to docs pages usually take a second or two. Twenty seconds allows for a slow host, and three attempts let
# a passing 429 or 5xx clear before the check gives up on a URL.
LINK_TIMEOUT_SECONDS = 20
LINK_ATTEMPTS = 3
# Enough to finish a few hundred links in seconds without looking like a burst to the hosts.
LINK_CONCURRENCY = 8
USER_AGENT = "altinn-studio-skills-check (+https://github.com/Altinn/altinn-studio)"


@dataclass
class SkillSize:
    name: str
    body_tokens: int
    lines: int
    load_tokens: int
    largest_file: tuple[str, int] = ("", 0)


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    summary: list[str] = field(default_factory=list)

    def error(self, message: str, file: Path | None = None) -> None:
        self.errors.append(message)
        _annotate("error", message, file)

    def warning(self, message: str, file: Path | None = None) -> None:
        self.warnings.append(message)
        _annotate("warning", message, file)


def _annotate(level: str, message: str, file: Path | None) -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    location = f" file={file}" if file else ""
    print(f"::{level}{location}::{message}")


def skill_dirs(roots: list[Path]) -> list[Path]:
    return sorted(skill for root in roots for skill in root.iterdir() if (skill / "SKILL.md").is_file())


def text_files(skill: Path) -> list[Path]:
    return sorted(path for path in skill.rglob("*") if path.is_file() and path.suffix in TEXT_SUFFIXES)


def prose(text: str) -> str:
    """The text outside code."""
    return INLINE_CODE.sub("", FENCED_CODE.sub("", text))


def check_frontmatter(skill: Path, report: Report) -> dict:
    skill_md = skill / "SKILL.md"
    match = FRONTMATTER.match(skill_md.read_text(encoding="utf-8"))
    if not match:
        report.error(f"{skill_md} has no YAML frontmatter", skill_md)
        return {}
    try:
        fields = yaml.safe_load(match.group(1))
    except yaml.YAMLError as exc:
        report.error(f"{skill_md}: the frontmatter is not valid YAML ({exc})", skill_md)
        return {}
    if not isinstance(fields, dict):
        report.error(f"{skill_md}: the frontmatter is not a map", skill_md)
        return {}

    if extra := sorted(set(fields) - SPEC_FIELDS):
        report.error(f"{skill_md}: fields the specification does not allow: {', '.join(extra)}", skill_md)
    name = fields.get("name")
    if not isinstance(name, str) or not NAME_PATTERN.match(name) or len(name) > MAX_NAME_CHARS:
        report.error(
            f"{skill_md}: name {name!r} must be lowercase letters, digits and single hyphens, "
            f"at most {MAX_NAME_CHARS} characters",
            skill_md,
        )
    elif name != skill.name:
        report.error(f"{skill_md}: name {name!r} must equal the directory name {skill.name!r}", skill_md)
    elif any(word in name for word in RESERVED_NAME_WORDS):
        report.error(f"{skill_md}: name {name!r} contains a word Anthropic reserves", skill_md)
    description = fields.get("description")
    if not isinstance(description, str) or not description.strip():
        report.error(f"{skill_md}: description is required", skill_md)
    else:
        if len(description) > MAX_DESCRIPTION_CHARS:
            report.error(
                f"{skill_md}: description is {len(description)} characters, over {MAX_DESCRIPTION_CHARS}", skill_md
            )
        if XML_TAG.search(description):
            report.error(f"{skill_md}: description contains an XML tag", skill_md)
    compatibility = fields.get("compatibility")
    if compatibility is not None and (
        not isinstance(compatibility, str) or not 1 <= len(compatibility) <= MAX_COMPATIBILITY_CHARS
    ):
        report.error(f"{skill_md}: compatibility must be 1 to {MAX_COMPATIBILITY_CHARS} characters", skill_md)
    return fields


def check_sizes(skills: list[Path], report: Report) -> None:
    encoding = tiktoken.get_encoding("o200k_base")

    def count(text: str) -> int:
        return len(encoding.encode(text, disallowed_special=()))

    sizes: list[SkillSize] = []
    listing: list[str] = []
    for skill in skills:
        fields = check_frontmatter(skill, report)
        listing.append(f"- {fields.get('name', skill.name)}: {fields.get('description', '')}")
        skill_md = skill / "SKILL.md"
        text = skill_md.read_text(encoding="utf-8")
        match = FRONTMATTER.match(text)
        body_tokens = count(text[match.end() :] if match else text)
        lines = text.count("\n")
        size = SkillSize(name=skill.name, body_tokens=body_tokens, lines=lines, load_tokens=body_tokens)
        if body_tokens > MAX_TOKENS:
            report.error(f"{skill_md}: the body is {body_tokens:,} tokens, over {MAX_TOKENS:,}", skill_md)
        if lines > MAX_LINES:
            report.error(f"{skill_md} is {lines} lines, over {MAX_LINES}", skill_md)

        for path in text_files(skill):
            relative = path.relative_to(skill).as_posix()
            if relative == "SKILL.md":
                continue
            content = path.read_text(encoding="utf-8")
            tokens = count(content)
            file_lines = content.count("\n")
            if tokens > size.largest_file[1]:
                size.largest_file = (relative, tokens)
            if relative in VERSION_FILES:
                size.load_tokens = max(size.load_tokens, body_tokens + tokens)
            if tokens > MAX_TOKENS:
                report.error(f"{path} is {tokens:,} tokens, over {MAX_TOKENS:,}", path)
            if file_lines > MAX_LINES:
                report.error(f"{path} is {file_lines} lines, over {MAX_LINES}", path)
            if path.suffix == ".md" and file_lines > TOC_AFTER_LINES and not has_contents(content):
                report.error(f"{path} is {file_lines} lines but does not start with a '## Contents' section", path)
        sizes.append(size)

    report.summary += [
        f"### Skill sizes (o200k_base tokens, at most {MAX_TOKENS:,} tokens and {MAX_LINES} lines per file)",
        "",
        "| Skill | SKILL.md body | SKILL.md lines | Largest other file | SKILL.md with version file |",
        "|---|---:|---:|---:|---:|",
    ]
    for size in sizes:
        largest = f"{size.largest_file[1]:,} ({size.largest_file[0]})" if size.largest_file[0] else "–"
        report.summary.append(
            f"| {size.name} | {size.body_tokens:,} | {size.lines} | {largest} | {size.load_tokens:,} |"
        )
    report.summary += [
        "",
        f"Every request carries every name and description: {count(chr(10).join(listing)):,} tokens.",
        "",
    ]


def has_contents(content: str) -> bool:
    """A '## Contents' section comes before any other second-level heading."""
    for line in prose(content).splitlines():
        if line.startswith("## "):
            return bool(TOC_HEADING.match(line))
    return False


def check_relative_links(skills: list[Path], report: Report) -> None:
    """A skill links its files from its root, as the specification says. Links from the file's own folder are
    accepted too, since some readers resolve them that way."""
    for skill in skills:
        for path in text_files(skill):
            if path.suffix != ".md":
                continue
            for target in RELATIVE_LINK.findall(prose(path.read_text(encoding="utf-8"))):
                target_path = target.split("#", 1)[0]
                if target_path and not ((skill / target_path).exists() or (path.parent / target_path).exists()):
                    report.error(f"{path}: link to missing file {target}", path)


def web_links(skills: list[Path]) -> dict[str, list[Path]]:
    links: dict[str, list[Path]] = {}
    for skill in skills:
        for path in text_files(skill):
            if path.suffix != ".md":
                continue
            for raw in WEB_URL.findall(prose(path.read_text(encoding="utf-8"))):
                url = raw.rstrip(".,;:!?").split("#", 1)[0]
                host = httpx.URL(url).host
                if PLACEHOLDER.search(url) or host in SKIPPED_HOSTS or EXAMPLE_HOST.search(host):
                    continue
                links.setdefault(url, []).append(path)
    return links


async def fetch_status(client: httpx.AsyncClient, url: str) -> tuple[int | None, str]:
    """The final status after redirects, or None and the reason when no answer came."""
    reason = ""
    for attempt in range(LINK_ATTEMPTS):
        try:
            async with client.stream("GET", url) as response:
                if response.status_code in {429, 500, 502, 503, 504} and attempt + 1 < LINK_ATTEMPTS:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                return response.status_code, ""
        except httpx.ConnectError as exc:
            return None, f"cannot connect: {exc}"
        except httpx.HTTPError as exc:
            reason = f"{type(exc).__name__}: {exc}"
            await asyncio.sleep(2 * (attempt + 1))
    return None, reason or "no answer"


async def check_web_links(skills: list[Path], report: Report) -> None:
    links = web_links(skills)
    semaphore = asyncio.Semaphore(LINK_CONCURRENCY)
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=LINK_TIMEOUT_SECONDS,
        headers={"User-Agent": USER_AGENT},
    ) as client:

        async def check(url: str) -> tuple[str, int | None, str]:
            async with semaphore:
                status, reason = await fetch_status(client, url)
                return url, status, reason

        results = await asyncio.gather(*(check(url) for url in links))

    broken = 0
    for url, status, reason in sorted(results, key=lambda result: result[0]):
        if status is not None and status < 400:
            continue
        where = ", ".join(sorted({str(path) for path in links[url]}))
        if status in {404, 410} or (status is None and reason.startswith("cannot connect")):
            broken += 1
            report.error(f"{url} is broken ({status or reason}), linked from {where}", links[url][0])
        else:
            report.warning(f"{url} could not be checked ({status or reason}), linked from {where}", links[url][0])
    report.summary.append(f"Checked {len(links)} web links: {broken} broken.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("roots", nargs="+", type=Path, help="directories that hold one directory per skill")
    parser.add_argument("--no-links", action="store_true", help="skip the web link check, which needs a network")
    args = parser.parse_args()

    for root in args.roots:
        if not root.is_dir():
            parser.error(f"{root} is not a directory")
    skills = skill_dirs(args.roots)
    if not skills:
        parser.error("found no skills")

    report = Report()
    check_sizes(skills, report)
    check_relative_links(skills, report)
    if not args.no_links:
        asyncio.run(check_web_links(skills, report))

    summary = "\n".join(report.summary)
    print(summary)
    for message in report.warnings:
        print(f"warning: {message}")
    for message in report.errors:
        print(f"error: {message}")
    if step_summary := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(step_summary, "a", encoding="utf-8") as out:
            out.write(summary + "\n")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
