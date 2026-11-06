# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx==0.28.1"]
# ///
"""Check that the links in Markdown files work.

Usage: uv run --script .github/scripts/link-check.py [--root-marker NAME] [--no-web] <file or folder> [...]

It reads every Markdown file under the paths it gets, and checks the links outside code. A URL in code is a value to
write, a namespace or an example, not a link.

- A relative link must point to a file or folder that exists. It resolves from the file's folder, or from the
  repository root when it starts with `/`. With `--root-marker`, it may also resolve from the nearest folder above the
  file that holds a file with that name. Agent Skills need `--root-marker SKILL.md`, since the specification resolves
  their links from the skill's root.
- A web link fails when it answers 404 or 410, or when its host does not answer. Other answers, such as 403, 429, 5xx
  or a timeout, are warnings, since they say little about whether the page exists.

The .github/workflows/template-link-check.yaml workflow runs it in CI.
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

FENCED_CODE = re.compile(r"^[ \t]*(```|~~~)[^\n]*\n.*?^[ \t]*\1[^\n]*$", re.DOTALL | re.MULTILINE)
INLINE_CODE = re.compile(r"`[^`\n]+`")
INLINE_LINK = re.compile(r"\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
REFERENCE_DEFINITION = re.compile(r"^[ \t]{0,3}\[[^\]]+\]:[ \t]*<?(\S+?)>?(?:[ \t]|$)", re.MULTILINE)
WEB_URL = re.compile(r"https?://[^\s<>\"'`)\]]+")
NOT_A_FILE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|#)", re.IGNORECASE)
# URLs with these are templates or examples, such as https://{org}.apps.altinn.no/<path>.
PLACEHOLDER = re.compile(r"[{}<>*]|\.\.\.|…")
SKIPPED_HOSTS = {"localhost", "127.0.0.1", "local.altinn.cloud"}
EXAMPLE_HOST = re.compile(r"(^|\.)example\.[a-z]+$")

# Requests to docs pages usually take a second or two. Twenty seconds allows for a slow host, and three attempts let
# a passing 429 or 5xx clear before the check gives up on a URL.
TIMEOUT_SECONDS = 20
ATTEMPTS = 3
RETRY_STATUSES = {429, 500, 502, 503, 504}
# Enough to finish a few hundred links in seconds without looking like a burst to the hosts.
CONCURRENCY = 8
USER_AGENT = "altinn-studio-link-check (+https://github.com/Altinn/altinn-studio)"


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, message: str, file: Path) -> None:
        self.errors.append(message)
        _annotate("error", message, file)

    def warning(self, message: str, file: Path) -> None:
        self.warnings.append(message)
        _annotate("warning", message, file)


def _annotate(level: str, message: str, file: Path) -> None:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::{level} file={file}::{message}")


def markdown_files(paths: list[Path]) -> list[Path]:
    files: set[Path] = set()
    for path in paths:
        if path.is_dir():
            files.update(file for file in path.rglob("*.md") if file.is_file())
        elif path.suffix == ".md":
            files.add(path)
    return sorted(files)


def prose(text: str) -> str:
    """The text outside code."""
    return INLINE_CODE.sub("", FENCED_CODE.sub("", text))


def marker_root(file: Path, marker: str | None) -> Path | None:
    if not marker:
        return None
    for folder in file.resolve().parents:
        if (folder / marker).is_file():
            return folder
    return None


def check_relative_links(files: list[Path], marker: str | None, report: Report) -> int:
    count = 0
    repository_root = Path.cwd()
    for file in files:
        text = prose(file.read_text(encoding="utf-8"))
        root = marker_root(file, marker)
        for target in INLINE_LINK.findall(text) + REFERENCE_DEFINITION.findall(text):
            if NOT_A_FILE.match(target):
                continue
            path = target.split("#", 1)[0].split("?", 1)[0]
            if not path:
                continue
            count += 1
            if path.startswith("/"):
                candidates = [repository_root / path.lstrip("/")]
            else:
                candidates = [file.parent / path] + ([root / path] if root else [])
            if not any(candidate.exists() for candidate in candidates):
                report.error(f"{file}: link to missing file {target}", file)
    return count


def web_links(files: list[Path]) -> dict[str, list[Path]]:
    links: dict[str, list[Path]] = {}
    for file in files:
        for raw in WEB_URL.findall(prose(file.read_text(encoding="utf-8"))):
            url = raw.rstrip(".,;:!?").split("#", 1)[0]
            host = httpx.URL(url).host
            if PLACEHOLDER.search(url) or host in SKIPPED_HOSTS or EXAMPLE_HOST.search(host):
                continue
            links.setdefault(url, []).append(file)
    return links


async def fetch_status(client: httpx.AsyncClient, url: str) -> tuple[int | None, str]:
    """The final status after redirects, or None and the reason when no answer came."""
    reason = ""
    for attempt in range(ATTEMPTS):
        try:
            async with client.stream("GET", url) as response:
                if response.status_code in RETRY_STATUSES and attempt + 1 < ATTEMPTS:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                return response.status_code, ""
        except httpx.ConnectError as exc:
            return None, f"cannot connect: {exc}"
        except httpx.HTTPError as exc:
            reason = f"{type(exc).__name__}: {exc}"
            await asyncio.sleep(2 * (attempt + 1))
    return None, reason or "no answer"


async def check_web_links(files: list[Path], report: Report) -> tuple[int, int]:
    links = web_links(files)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(
        follow_redirects=True, timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}
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
        where = ", ".join(sorted({str(file) for file in links[url]}))
        if status in {404, 410} or (status is None and reason.startswith("cannot connect")):
            broken += 1
            report.error(f"{url} is broken ({status or reason}), linked from {where}", links[url][0])
        else:
            report.warning(f"{url} could not be checked ({status or reason}), linked from {where}", links[url][0])
    return len(links), broken


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="+", type=Path, help="Markdown files, or folders to search for them")
    parser.add_argument(
        "--root-marker",
        metavar="NAME",
        help="also resolve relative links from the nearest folder above a file that holds a file with this name",
    )
    parser.add_argument("--no-web", action="store_true", help="skip web links, which need a network")
    args = parser.parse_args()

    for path in args.paths:
        if not path.exists():
            parser.error(f"{path} does not exist")
    files = markdown_files(args.paths)
    if not files:
        parser.error("found no Markdown files")

    report = Report()
    relative = check_relative_links(files, args.root_marker, report)
    summary = [f"Checked {relative} relative links in {len(files)} Markdown files."]
    if not args.no_web:
        checked, broken = asyncio.run(check_web_links(files, report))
        summary.append(f"Checked {checked} web links: {broken} broken.")

    for line in summary:
        print(line)
    for message in report.warnings:
        print(f"warning: {message}")
    for message in report.errors:
        print(f"error: {message}")
    if step_summary := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(step_summary, "a", encoding="utf-8") as out:
            out.write("### Links\n\n" + "\n".join(summary) + "\n")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
