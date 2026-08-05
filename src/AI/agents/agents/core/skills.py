"""Skill discovery and loading for the agentic loop.

A skill is a directory containing a `SKILL.md` file:

    agents/skills/
      altinn-policy/
        SKILL.md          <- frontmatter + markdown body
        references/       <- optional sibling files the body may point to

The design follows Claude Code's skill system (progressive disclosure):

- Only each skill's NAME and DESCRIPTION enter the context, via a
  compact listing in the system prompt.  ~40 tokens per skill.
- The BODY stays on disk until the model invokes the skill through the
  generic `skill` tool, which returns the body as the tool result.
- The skill name is the directory name.  Frontmatter `description` is
  required; `when_to_use` optionally extends the listing line.

This replaces MCP doc-blob tools (`altinn_*_docs`) for the agent: the
same markdown ships with the agent, loads without a network round-trip,
and costs zero context until actually needed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

SKILL_FILENAME = "SKILL.md"
# Keep listing lines short — the full body loads on invocation, so a
# verbose description only wastes tokens on every request.
MAX_LISTING_DESCRIPTION_CHARS = 250

_DEFAULT_SKILLS_DIR = Path(__file__).parent.parent / "skills"

_FRONTMATTER_PATTERN = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


@dataclass(frozen=True)
class Skill:
    """One discovered skill.  The body is NOT held here — it is read
    from disk at invocation time so an unused skill costs nothing."""

    name: str
    description: str
    path: Path  # the SKILL.md file
    # Human-readable display title for the chat UI's source chip —
    # the directory name (`altinn-expressions`) means nothing to end
    # users.  Falls back to the name when absent.
    title: str = ""
    # Canonical official-docs page for the topic, shown as the chip's
    # link.  Must be a URL verified to resolve — this is the antidote
    # to the model inventing docs URLs from memory.
    docs_url: str = ""

    def load_body(self) -> str:
        """Read the skill body (markdown after the frontmatter).

        Frontmatter `include: <file>[, <file>…]` inlines sibling files
        after the body.  The loop's `read_file` is repo-scoped and can
        NEVER reach the skill directory, so anything the model must see
        (an index, a reference table) has to travel inside the skill
        body itself.
        """
        raw = self.path.read_text(encoding="utf-8")
        match = _FRONTMATTER_PATTERN.match(raw)
        body = raw[match.end():] if match else raw
        sections = [body.strip()]

        fields = _parse_frontmatter(raw)
        for file_name in _split_include_list(fields.get("include", "")):
            if "/" in file_name or ".." in file_name:
                log.warning("Skill %s: refusing non-sibling include %r", self.name, file_name)
                continue
            include_path = self.path.parent / file_name
            try:
                content = include_path.read_text(encoding="utf-8")
            except OSError as exc:
                log.warning("Skill %s: cannot read include %r — %s", self.name, file_name, exc)
                continue
            sections.append(f"## Included file: {file_name}\n\n{content.strip()}")

        return "\n\n".join(sections)


def _split_include_list(value: str) -> list[str]:
    """`include: llms.txt, table.md` → `['llms.txt', 'table.md']`."""
    return [name.strip() for name in value.split(",") if name.strip()]


def _parse_frontmatter(raw: str) -> dict[str, str]:
    """Parse the minimal `key: value` frontmatter block.

    Intentionally not full YAML — every field we support is a single-line
    string, and avoiding the yaml dependency keeps the loader trivially
    auditable.  Unknown keys are ignored (forward compatibility).
    """
    match = _FRONTMATTER_PATTERN.match(raw)
    if not match:
        return {}
    fields: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip().lower()] = value.strip()
    return fields


def discover_skills(skills_dir: Path | None = None) -> list[Skill]:
    """Scan the skills directory and return all valid skills, sorted by name.

    A valid skill is a subdirectory containing SKILL.md with a non-empty
    `description` in its frontmatter.  Invalid entries are logged and
    skipped — a broken skill must not take down the loop.
    """
    root = skills_dir or _DEFAULT_SKILLS_DIR
    if not root.is_dir():
        return []

    skills: list[Skill] = []
    for entry in sorted(root.iterdir()):
        if not entry.is_dir():
            continue
        skill_file = entry / SKILL_FILENAME
        if not skill_file.is_file():
            continue
        try:
            fields = _parse_frontmatter(skill_file.read_text(encoding="utf-8"))
        except OSError as exc:
            log.warning("Skipping unreadable skill %s: %s", entry.name, exc)
            continue
        description = fields.get("description", "")
        if not description:
            log.warning("Skipping skill %s: no description in frontmatter", entry.name)
            continue
        when_to_use = fields.get("when_to_use", "")
        if when_to_use:
            description = f"{description} {when_to_use}"
        skills.append(
            Skill(
                name=entry.name,
                description=description,
                path=skill_file,
                title=fields.get("title", ""),
                docs_url=fields.get("docs_url", ""),
            )
        )
    return skills


def format_skill_listing(skills: list[Skill]) -> str:
    """Render the compact listing that goes into the system prompt.

    One line per skill: `- name: description` with the description
    truncated to keep every request cheap.
    """
    lines = []
    for skill in skills:
        description = skill.description
        if len(description) > MAX_LISTING_DESCRIPTION_CHARS:
            description = description[: MAX_LISTING_DESCRIPTION_CHARS - 1] + "…"
        lines.append(f"- {skill.name}: {description}")
    return "\n".join(lines)
