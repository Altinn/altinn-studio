"""The generic `skill` tool — loads a skill's full instructions on demand.

One tool for all skills (mirroring Claude Code's design): the model
sees a compact listing of available skills in the system prompt and
calls `skill(name)` to pull the full body into the conversation as an
ordinary tool result.  A skill links further files under `references/`;
`skill(name, file=...)` loads one of them, since `read_file` cannot reach
the skill directory.

Compared to per-topic MCP doc tools this saves a network round-trip,
keeps the tool catalog small, and lets the documentation ship (and be
versioned) with the agent itself.
"""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, Field

from agents.core.skills import Skill, SkillFileError
from agents.core.tool import LoopContext, Tool, ToolResult


class SkillArgs(BaseModel):
    # Models reach for `name` first; accepting it costs a wasted turn per skill.
    skill: str = Field(
        validation_alias=AliasChoices("skill", "name"),
        description="Name of the skill to load, exactly as it appears in the skill listing.",
    )
    file: str | None = Field(
        default=None,
        description=(
            "A file the skill links to, relative to the skill, such as `references/access-packages.md`. "
            "Leave it out to load the skill itself."
        ),
    )


class SkillTool(Tool[SkillArgs]):
    """Load a skill's full instructions, or a file it links to."""

    name = "skill"
    is_concurrency_safe = True
    input_schema = SkillArgs

    def __init__(self, skills: list[Skill], *, append_version_file: bool = True) -> None:
        self._skills = {s.name: s for s in skills}
        self._append_version_file = append_version_file
        names = ", ".join(sorted(self._skills)) or "(none available)"
        if append_version_file:
            references = (
                "The text for this app's version (`references/v8.md` or `references/v9.md`) is already appended, "
                "so do not load it again. When a skill links another file under `references/`, load it with `file`. "
            )
        else:
            references = (
                "A skill links files under `references/`, such as the file for the app's version. "
                "Load one with `file` when the skill tells you to. "
            )
        self.description = (
            "Load the full instructions for a skill: curated knowledge about one part of an Altinn app. "
            "The skill listing in your system prompt shows what each skill covers. Load the skill BEFORE "
            f"you work on its topic; the content is authoritative. {references}"
            f"Available: {names}."
        )

    async def run(self, args: SkillArgs, ctx: LoopContext) -> ToolResult:
        skill = self._skills.get(args.skill)
        if skill is None:
            known = ", ".join(sorted(self._skills)) or "(none)"
            return ToolResult(
                content=f"Unknown skill {args.skill!r}. Available skills: {known}.",
                is_error=True,
            )
        version_label = ctx.app_version_profile.version_label
        try:
            if args.file:
                content = skill.load_file(args.file)
            else:
                content = skill.load_body(version_label, append_version_file=self._append_version_file)
        except SkillFileError as exc:
            files = ", ".join(skill.linked_files()) or "(none)"
            return ToolResult(content=f"{exc} Files in this skill: {files}.", is_error=True)
        except OSError as exc:
            return ToolResult(
                content=f"Failed to load skill {args.skill!r}: {exc}",
                is_error=True,
            )
        source: dict[str, str] = {"title": skill.title or skill.name, "kind": "skill"}
        docs_url = skill.docs_url_for(version_label)
        if docs_url:
            source["url"] = docs_url
        metadata: dict[str, object] = {"skill": skill.name, "source": source}
        if args.file:
            metadata["file"] = args.file
        return ToolResult(content=content, metadata=metadata)
