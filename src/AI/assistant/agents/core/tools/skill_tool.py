"""The generic `skill` tool — loads a skill's full instructions on demand.

One tool for all skills (mirroring Claude Code's design): the model
sees a compact listing of available skills in the system prompt and
calls `skill(name)` to pull the full body into the conversation as an
ordinary tool result.

Compared to per-topic MCP doc tools this saves a network round-trip,
keeps the tool catalog small, and lets the documentation ship (and be
versioned) with the agent itself.
"""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, Field

from agents.core.skills import Skill, SkillFileError
from agents.core.tool import LoopContext, Tool, ToolResult

from .utils.text_parts import PartLimit, PartOffset, text_part


class SkillArgs(BaseModel):
    # Models reach for `name` first; accepting it costs a wasted turn per skill.
    skill: str = Field(
        validation_alias=AliasChoices("skill", "name"),
        description="Name of the skill to load, exactly as it appears in the skill listing.",
    )
    file: str | None = Field(
        default=None,
        description=(
            "A file the skill links to, relative to the skill, such as `references/task-types.md`. "
            "Leave it out to load the skill itself."
        ),
    )
    offset: PartOffset = 1
    limit: PartLimit = None


class SkillTool(Tool[SkillArgs]):
    """Load a skill's full instructions, or a file it links to."""

    name = "skill"
    is_concurrency_safe = True
    input_schema = SkillArgs

    def __init__(self, skills: list[Skill]) -> None:
        self._skills = {s.name: s for s in skills}
        names = ", ".join(sorted(self._skills)) or "(none available)"
        self.description = (
            "Load the full instructions for a skill: curated knowledge about one part of an Altinn app. "
            "The skill listing in your system prompt shows what each skill covers. Load the skill BEFORE "
            "you work on its topic; the content is authoritative. "
            "A skill links files under `references/`, such as the file for the app's version. "
            "Load one with `file` when the skill tells you to. "
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
            content = skill.load_file(args.file) if args.file else skill.load_body()
        except SkillFileError as exc:
            files = ", ".join(skill.linked_files()) or "(none)"
            return ToolResult(content=f"{exc} Files in this skill: {files}.", is_error=True)
        except OSError as exc:
            return ToolResult(
                content=f"Failed to load skill {args.skill!r}: {exc}",
                is_error=True,
            )
        if args.file:
            key = f"skill:{skill.name}/{args.file}"
            part_source = f"`{args.file}` in the {skill.name} skill"
            same_args = "the same `skill` and `file`"
        else:
            key = f"skill:{skill.name}"
            part_source = f"the {skill.name} skill"
            same_args = "the same `skill`"
        result = text_part(
            ctx,
            content,
            offset=args.offset,
            limit=args.limit,
            key=key,
            source=part_source,
            tool=self.name,
            same_args=same_args,
        )
        if result.is_error:
            return result
        source: dict[str, str] = {"title": skill.title or skill.name, "kind": "skill"}
        docs_url = skill.docs_url_for(version_label)
        if docs_url:
            source["url"] = docs_url
        result.metadata.update({"skill": skill.name, "source": source})
        if args.file:
            result.metadata["file"] = args.file
        return result
