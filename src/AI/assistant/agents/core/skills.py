"""Skill discovery and loading for the agentic loop.

A skill uses the Agent Skills format (https://agentskills.io/specification),
so the same directory also works for other coding agents.
docs/modules/prompt-and-skills.md describes the frontmatter and files.

Only each skill's name and description enter the context, through a
compact listing in the system prompt.  The body stays on disk until the
model loads it with the `skill` tool.

The loop's `read_file` reads only the app repository, so it can never
reach a skill's own files.  The `skill` tool therefore loads any file the
body links to on request, such as the version file for the app.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

import yaml

from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

SKILL_FILENAME = "SKILL.md"
REFERENCES_DIRNAME = "references"
# Keep listing lines short — the full body loads on invocation, so a
# verbose description only wastes tokens on every request.
MAX_LISTING_DESCRIPTION_CHARS = 250

_DEFAULT_SKILLS_DIR = Path(__file__).parent.parent / "skills"

_FRONTMATTER_PATTERN = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


class SkillFileError(ValueError):
    """A requested skill file is outside the skill or does not exist."""


@dataclass(frozen=True)
class Skill:
    """One discovered skill.  The body is NOT held here — it is read
    from disk at invocation time so an unused skill costs nothing."""

    name: str
    description: str
    path: Path  # the SKILL.md file
    # Display title for the chat UI's source chip.  The skill name
    # (`studio-expressions`) means nothing to end users.
    title: str = ""
    # Canonical docs page for the topic, shown as the chip's link.  Must
    # be a URL verified to resolve, so the model never needs to invent one.
    docs_url: str = ""
    docs_url_v9: str = ""

    @property
    def directory(self) -> Path:
        return self.path.parent

    def docs_url_for(self, version_label: str) -> str:
        if version_label == "v9" and self.docs_url_v9:
            return self.docs_url_v9
        return self.docs_url

    def load_body(self) -> str:
        """The body of SKILL.md, without the frontmatter."""
        raw = self.path.read_text(encoding="utf-8")
        match = _FRONTMATTER_PATTERN.match(raw)
        return (raw[match.end() :] if match else raw).strip()

    def load_file(self, relative_path: str) -> str:
        return self._resolve(relative_path).read_text(encoding="utf-8")

    def linked_files(self) -> list[str]:
        """The files under `references/`, relative to the skill directory."""
        references = self.directory / REFERENCES_DIRNAME
        if not references.is_dir():
            return []
        return sorted(path.relative_to(self.directory).as_posix() for path in references.rglob("*") if path.is_file())

    def _resolve(self, relative_path: str) -> Path:
        candidate = PurePosixPath(relative_path.strip())
        if candidate.is_absolute() or ".." in candidate.parts or not candidate.parts:
            raise SkillFileError(f"{relative_path!r} is not a path inside the skill.")
        resolved = (self.directory / candidate).resolve()
        if not resolved.is_relative_to(self.directory.resolve()) or not resolved.is_file():
            raise SkillFileError(f"The skill {self.name!r} has no file {relative_path!r}.")
        return resolved


def _parse_frontmatter(raw: str) -> dict[str, object]:
    match = _FRONTMATTER_PATTERN.match(raw)
    if not match:
        return {}
    try:
        fields = yaml.safe_load(match.group(1))
    # PyYAML raises ValueError, not YAMLError, for an unquoted date that does not exist, such as 2026-13-01.
    except (yaml.YAMLError, ValueError) as exc:
        log.warning("Invalid skill frontmatter: %s", exc)
        return {}
    return fields if isinstance(fields, dict) else {}


def _metadata_text(metadata: object, key: str) -> str:
    if not isinstance(metadata, dict):
        return ""
    value = metadata.get(key, "")
    return value if isinstance(value, str) else ""


def discover_skills(skills_dir: Path | None = None) -> list[Skill]:
    """Scan the skills directory and return all valid skills, sorted by name.

    A valid skill is a subdirectory containing SKILL.md whose frontmatter
    has a `name` equal to the directory name and a non-empty
    `description`.  Invalid entries are logged and skipped — a broken
    skill must not take down the loop.
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
        name = fields.get("name")
        if name != entry.name:
            log.warning("Skipping skill %s: frontmatter name %r is not the directory name", entry.name, name)
            continue
        description = fields.get("description")
        if not isinstance(description, str) or not description.strip():
            log.warning("Skipping skill %s: no description in frontmatter", entry.name)
            continue
        metadata = fields.get("metadata")
        skills.append(
            Skill(
                name=entry.name,
                description=description.strip(),
                path=skill_file,
                title=_metadata_text(metadata, "studio-title"),
                docs_url=_metadata_text(metadata, "studio-docs-url"),
                docs_url_v9=_metadata_text(metadata, "studio-docs-url-v9"),
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
