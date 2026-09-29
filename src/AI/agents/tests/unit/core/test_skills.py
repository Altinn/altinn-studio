"""Tests for skill discovery, listing, and the skill tool."""

from __future__ import annotations

from pathlib import Path

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE, AppVersionProfile
from agents.core.skills import (
    MAX_LISTING_DESCRIPTION_CHARS,
    Skill,
    discover_skills,
    format_skill_listing,
)
from agents.core.tool import LoopContext
from agents.core.tools.skill_tool import SkillArgs, SkillTool


def _write_skill(root: Path, name: str, description: str, body: str = "# Content") -> Path:
    skill_dir = root / name
    skill_dir.mkdir(parents=True)
    skill_file = skill_dir / "SKILL.md"
    skill_file.write_text(f"---\ndescription: {description}\n---\n\n{body}\n", encoding="utf-8")
    return skill_file


def _write_app_version_texts(skill_file: Path) -> None:
    (skill_file.parent / "v8.md").write_text("## In v8 apps", encoding="utf-8")
    (skill_file.parent / "v9.md").write_text("## In v9 apps", encoding="utf-8")


def _ctx(app_version_profile: AppVersionProfile = V8_PROFILE) -> LoopContext:
    return LoopContext(
        session_id="s1",
        repo_path="/tmp/repo",
        allow_app_changes=True,
        app_version_profile=app_version_profile,
    )


class TestDiscoverSkills:
    def test_discovers_valid_skills_sorted_by_name(self, tmp_path):
        _write_skill(tmp_path, "b-skill", "Covers B.")
        _write_skill(tmp_path, "a-skill", "Covers A.")

        skills = discover_skills(tmp_path)

        assert [s.name for s in skills] == ["a-skill", "b-skill"]
        assert skills[0].description == "Covers A."

    def test_skips_dir_without_skill_md(self, tmp_path):
        (tmp_path / "empty-dir").mkdir()
        _write_skill(tmp_path, "real", "Real skill.")

        assert [s.name for s in discover_skills(tmp_path)] == ["real"]

    def test_skips_skill_without_description(self, tmp_path):
        skill_dir = tmp_path / "no-desc"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\nname: x\n---\nBody", encoding="utf-8")

        assert discover_skills(tmp_path) == []

    def test_description_value_may_contain_colons(self, tmp_path):
        _write_skill(tmp_path, "colons", "Topic: the details, see also: more.")

        skills = discover_skills(tmp_path)
        assert skills[0].description == "Topic: the details, see also: more."

    def test_when_to_use_appends_to_description(self, tmp_path):
        skill_dir = tmp_path / "wtu"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\ndescription: Base.\nwhen_to_use: Use when testing.\n---\nBody",
            encoding="utf-8",
        )

        skills = discover_skills(tmp_path)
        assert skills[0].description == "Base. Use when testing."

    def test_title_and_docs_url_parsed_from_frontmatter(self, tmp_path):
        skill_dir = tmp_path / "titled"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\n"
            "description: Base.\n"
            "title: Dynamiske uttrykk\n"
            "docs_url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/\n"
            "---\nBody",
            encoding="utf-8",
        )

        skills = discover_skills(tmp_path)
        assert skills[0].title == "Dynamiske uttrykk"
        assert skills[0].docs_url == ("https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/")

    def test_title_and_docs_url_default_to_empty(self, tmp_path):
        _write_skill(tmp_path, "plain", "Desc.")

        skills = discover_skills(tmp_path)
        assert skills[0].title == ""
        assert skills[0].docs_url == ""

    def test_bundled_skills_all_have_display_titles(self):
        # The source chip in the chat UI shows the title; a bundled skill
        # without one falls back to its directory name, which means
        # nothing to end users.
        skills = discover_skills()
        assert skills, "expected bundled skills to be discoverable"
        untitled = [s.name for s in skills if not s.title]
        assert untitled == [], f"bundled skills missing frontmatter title: {untitled}"

    def test_missing_root_returns_empty(self, tmp_path):
        assert discover_skills(tmp_path / "nonexistent") == []

    def test_non_skill_files_in_root_are_ignored(self, tmp_path):
        (tmp_path / "README.md").write_text("readme", encoding="utf-8")
        _write_skill(tmp_path, "real", "Real skill.")

        assert [s.name for s in discover_skills(tmp_path)] == ["real"]


class TestLoadBody:
    def test_body_excludes_frontmatter(self, tmp_path):
        _write_skill(tmp_path, "my-skill", "Desc.", body="# The Guide\nLine two.")
        skill = discover_skills(tmp_path)[0]

        body = skill.load_body("v8")

        assert body.startswith("# The Guide")
        assert "description: Desc." not in body

    def test_include_inlines_sibling_file(self, tmp_path):
        skill_dir = tmp_path / "docs-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\ndescription: Docs.\ninclude: index.txt\n---\n\n# Docs\n",
            encoding="utf-8",
        )
        (skill_dir / "index.txt").write_text("[Page](https://x/y): about y", encoding="utf-8")

        body = discover_skills(tmp_path)[0].load_body("v8")

        assert "## Included file: index.txt" in body
        assert "[Page](https://x/y): about y" in body

    def test_include_skips_missing_and_non_sibling_files(self, tmp_path):
        skill_dir = tmp_path / "docs-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\ndescription: Docs.\ninclude: gone.txt, ../escape.txt\n---\n\n# Docs\n",
            encoding="utf-8",
        )

        body = discover_skills(tmp_path)[0].load_body("v8")

        assert body.startswith("# Docs")
        assert "Included file" not in body

    def test_app_version_text_comes_between_body_and_included_files(self, tmp_path):
        skill_dir = tmp_path / "docs-skill"
        skill_dir.mkdir()
        skill_file = skill_dir / "SKILL.md"
        skill_file.write_text(
            "---\ndescription: Docs.\ninclude: index.txt\n---\n\n# Docs\n",
            encoding="utf-8",
        )
        (skill_dir / "index.txt").write_text("[Page](https://x/y): about y", encoding="utf-8")
        _write_app_version_texts(skill_file)

        body = discover_skills(tmp_path)[0].load_body("v9")

        assert body.index("# Docs") < body.index("## In v9 apps") < body.index("Included file")

    def test_body_without_frontmatter_loads_whole_file(self, tmp_path):
        skill_file = tmp_path / "raw" / "SKILL.md"
        skill_file.parent.mkdir()
        skill_file.write_text("Just content, no frontmatter.", encoding="utf-8")
        skill = Skill(name="raw", description="d", path=skill_file)

        assert "Just content, no frontmatter." in skill.load_body("v8")


class TestFormatSkillListing:
    def test_one_line_per_skill(self, tmp_path):
        _write_skill(tmp_path, "alpha", "First skill.")
        _write_skill(tmp_path, "beta", "Second skill.")
        listing = format_skill_listing(discover_skills(tmp_path))

        assert listing == "- alpha: First skill.\n- beta: Second skill."

    def test_long_description_truncated(self, tmp_path):
        _write_skill(tmp_path, "long", "x" * 400)
        listing = format_skill_listing(discover_skills(tmp_path))

        # "- long: " prefix + capped description
        assert len(listing) <= len("- long: ") + MAX_LISTING_DESCRIPTION_CHARS
        assert listing.endswith("…")


class TestSkillTool:
    @pytest.mark.asyncio
    async def test_loads_known_skill(self, tmp_path):
        _write_skill(tmp_path, "known", "Desc.", body="# Skill body here")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known"), _ctx())

        assert not result.is_error
        assert "# Skill body here" in result.content

    @pytest.mark.asyncio
    async def test_adds_the_v9_text_in_a_v9_app(self, tmp_path):
        skill_file = _write_skill(tmp_path, "known", "Desc.", body="# Skill body here")
        _write_app_version_texts(skill_file)
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known"), _ctx(V9_PROFILE))

        assert result.content == "# Skill body here\n\n## In v9 apps"

    @pytest.mark.asyncio
    async def test_adds_the_v8_text_in_a_v8_app(self, tmp_path):
        skill_file = _write_skill(tmp_path, "known", "Desc.", body="# Skill body here")
        _write_app_version_texts(skill_file)
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known"), _ctx(V8_PROFILE))

        assert result.content == "# Skill body here\n\n## In v8 apps"

    @pytest.mark.asyncio
    async def test_returns_the_shared_body_when_there_is_no_text_for_the_app_version(self, tmp_path):
        _write_skill(tmp_path, "known", "Desc.", body="# Skill body here")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known"), _ctx(V9_PROFILE))

        assert result.content == "# Skill body here"

    @pytest.mark.asyncio
    async def test_unknown_skill_is_error_listing_available(self, tmp_path):
        _write_skill(tmp_path, "known", "Desc.")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="nope"), _ctx())

        assert result.is_error
        assert "known" in result.content

    @pytest.mark.asyncio
    async def test_deleted_file_is_error_not_crash(self, tmp_path):
        skill_file = _write_skill(tmp_path, "gone", "Desc.")
        tool = SkillTool(discover_skills(tmp_path))
        skill_file.unlink()

        result = await tool.run(SkillArgs(skill="gone"), _ctx())

        assert result.is_error

    def test_description_names_available_skills(self, tmp_path):
        _write_skill(tmp_path, "alpha", "A.")
        _write_skill(tmp_path, "beta", "B.")
        tool = SkillTool(discover_skills(tmp_path))

        assert "alpha" in tool.description
        assert "beta" in tool.description

    @pytest.mark.asyncio
    async def test_source_record_uses_display_title_and_docs_url(self, tmp_path):
        skill_dir = tmp_path / "titled"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\n"
            "description: Base.\n"
            "title: Dynamiske uttrykk\n"
            "docs_url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/\n"
            "---\nBody",
            encoding="utf-8",
        )
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="titled"), _ctx())

        assert result.metadata["source"] == {
            "title": "Dynamiske uttrykk",
            "kind": "skill",
            "url": "https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/",
        }

    @pytest.mark.asyncio
    async def test_source_record_falls_back_to_name_without_url(self, tmp_path):
        _write_skill(tmp_path, "plain", "Desc.")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="plain"), _ctx())

        assert result.metadata["source"] == {"title": "plain", "kind": "skill"}
