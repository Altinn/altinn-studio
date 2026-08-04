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

from pydantic import BaseModel, Field

from agents.core.skills import Skill
from agents.core.tool import LoopContext, Tool, ToolResult


class SkillArgs(BaseModel):
    skill: str = Field(description="Name of the skill to load, exactly as it appears in the skill listing.")


class SkillTool(Tool):
    """Load a skill's full instructions into the conversation."""

    name = "skill"
    is_concurrency_safe = True
    is_read_only = True
    input_schema = SkillArgs

    def __init__(self, skills: list[Skill]) -> None:
        self._skills = {s.name: s for s in skills}
        names = ", ".join(sorted(self._skills)) or "(none available)"
        self.description = (
            "Load the full instructions for a skill — curated domain knowledge for a "
            "specific Altinn topic (data models, policy, text resources, prefill, "
            "dynamic expressions, planning). The skill listing in your system prompt "
            "shows what each skill covers. Call this BEFORE working on a topic you "
            f"have a skill for; the content is authoritative. Available: {names}."
        )

    async def run(self, args: SkillArgs, ctx: LoopContext) -> ToolResult:
        skill = self._skills.get(args.skill)
        if skill is None:
            known = ", ".join(sorted(self._skills)) or "(none)"
            return ToolResult(
                content=f"Unknown skill {args.skill!r}. Available skills: {known}.",
                is_error=True,
            )
        try:
            body = skill.load_body()
        except OSError as exc:
            return ToolResult(
                content=f"Failed to load skill {args.skill!r}: {exc}",
                is_error=True,
            )
        source: dict[str, str] = {"title": skill.title or skill.name, "kind": "skill"}
        if skill.docs_url:
            source["url"] = skill.docs_url
        return ToolResult(
            content=body,
            metadata={"skill": skill.name, "source": source},
        )
