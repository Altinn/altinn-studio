"""Tests for skill discovery, listing, and the skill tool."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE, AppVersionProfile
from agents.core.skills import (
    _DEFAULT_SKILLS_DIR,
    _FRONTMATTER_PATTERN,
    MAX_LISTING_DESCRIPTION_CHARS,
    Skill,
    SkillFileError,
    discover_skills,
    format_skill_listing,
)
from agents.core.tool import LoopContext
from agents.core.tools.skill_tool import SkillArgs, SkillTool
from agents.graph.nodes.agentic_loop_node import _build_registry

DOCS_URL = "https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/"
DOCS_URL_V9 = "https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/expressions/"
METADATA = {"studio-title": "Dynamiske uttrykk", "studio-docs-url": DOCS_URL, "studio-docs-url-v9": DOCS_URL_V9}


def _write_skill(
    root: Path,
    name: str,
    description: str = "Covers it.",
    body: str = "# Content",
    metadata: dict[str, str] | None = None,
    frontmatter_name: str | None = None,
) -> Path:
    skill_dir = root / name
    skill_dir.mkdir(parents=True)
    fields: dict[str, object] = {"name": frontmatter_name or name, "description": description}
    if metadata:
        fields["metadata"] = metadata
    skill_file = skill_dir / "SKILL.md"
    skill_file.write_text(f"---\n{yaml.safe_dump(fields, allow_unicode=True)}---\n\n{body}\n", encoding="utf-8")
    return skill_file


def _write_reference(skill_file: Path, relative_path: str, content: str) -> None:
    path = skill_file.parent / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_app_version_texts(skill_file: Path) -> None:
    _write_reference(skill_file, "references/v8.md", "## In v8 apps")
    _write_reference(skill_file, "references/v9.md", "## In v9 apps")


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
        _write_skill(tmp_path, "real")

        assert [s.name for s in discover_skills(tmp_path)] == ["real"]

    def test_skips_skill_whose_name_is_not_the_directory_name(self, tmp_path):
        _write_skill(tmp_path, "real", frontmatter_name="other")

        assert discover_skills(tmp_path) == []

    def test_skips_skill_without_description(self, tmp_path):
        skill_dir = tmp_path / "no-desc"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\nname: no-desc\n---\nBody", encoding="utf-8")

        assert discover_skills(tmp_path) == []

    def test_skips_skill_with_invalid_yaml(self, tmp_path):
        skill_dir = tmp_path / "broken"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\nname: broken\ndescription: Topic: unquoted colon\n---\nBody", encoding="utf-8"
        )

        assert discover_skills(tmp_path) == []

    def test_description_may_contain_colons_when_quoted(self, tmp_path):
        _write_skill(tmp_path, "colons", "Topic: the details, see also: more.")

        skills = discover_skills(tmp_path)
        assert skills[0].description == "Topic: the details, see also: more."

    def test_title_and_docs_urls_come_from_metadata(self, tmp_path):
        _write_skill(tmp_path, "titled", metadata=METADATA)

        skill = discover_skills(tmp_path)[0]

        assert skill.title == "Dynamiske uttrykk"
        assert skill.docs_url_for("v8") == DOCS_URL
        assert skill.docs_url_for("v9") == DOCS_URL_V9

    def test_v9_falls_back_to_the_main_docs_url(self, tmp_path):
        _write_skill(tmp_path, "titled", metadata={"studio-docs-url": DOCS_URL})

        assert discover_skills(tmp_path)[0].docs_url_for("v9") == DOCS_URL

    def test_title_and_docs_url_default_to_empty(self, tmp_path):
        _write_skill(tmp_path, "plain")

        skill = discover_skills(tmp_path)[0]
        assert skill.title == ""
        assert skill.docs_url_for("v8") == ""

    def test_missing_root_returns_empty(self, tmp_path):
        assert discover_skills(tmp_path / "nonexistent") == []

    def test_non_skill_files_in_root_are_ignored(self, tmp_path):
        (tmp_path / "README.md").write_text("readme", encoding="utf-8")
        _write_skill(tmp_path, "real")

        assert [s.name for s in discover_skills(tmp_path)] == ["real"]


class TestLoadBody:
    def test_body_excludes_frontmatter(self, tmp_path):
        _write_skill(tmp_path, "my-skill", "Desc.", body="# The Guide\nLine two.")
        skill = discover_skills(tmp_path)[0]

        body = skill.load_body("v8")

        assert body.startswith("# The Guide")
        assert "description: Desc." not in body

    @pytest.mark.parametrize("version_label", ["v8", "v9"])
    def test_appends_the_reference_for_the_app_version(self, tmp_path, version_label):
        skill_file = _write_skill(tmp_path, "my-skill", body="# Guide")
        _write_app_version_texts(skill_file)

        body = discover_skills(tmp_path)[0].load_body(version_label)

        assert body == (
            f"# Guide\n\nThe app is {version_label}, so references/{version_label}.md follows.\n\n"
            f"## In {version_label} apps"
        )

    def test_body_alone_when_the_version_file_loads_on_demand(self, tmp_path):
        skill_file = _write_skill(tmp_path, "my-skill", body="# Guide")
        _write_app_version_texts(skill_file)

        assert discover_skills(tmp_path)[0].load_body("v9", append_version_file=False) == "# Guide"

    def test_body_alone_when_there_is_no_reference_for_the_app_version(self, tmp_path):
        skill_file = _write_skill(tmp_path, "my-skill", body="# Guide")
        _write_reference(skill_file, "references/v8.md", "## In v8 apps")

        assert discover_skills(tmp_path)[0].load_body("v9") == "# Guide"

    def test_body_without_frontmatter_loads_whole_file(self, tmp_path):
        skill_file = tmp_path / "raw" / "SKILL.md"
        skill_file.parent.mkdir()
        skill_file.write_text("Just content, no frontmatter.", encoding="utf-8")
        skill = Skill(name="raw", description="d", path=skill_file)

        assert "Just content, no frontmatter." in skill.load_body("v8")


class TestLoadFile:
    def test_loads_a_file_inside_the_skill(self, tmp_path):
        skill_file = _write_skill(tmp_path, "my-skill")
        _write_reference(skill_file, "references/roles.md", "# Roles")

        assert discover_skills(tmp_path)[0].load_file("references/roles.md") == "# Roles"

    @pytest.mark.parametrize("path", ["../other/SKILL.md", "/etc/passwd", "references/missing.md", ""])
    def test_refuses_a_path_outside_the_skill_or_missing(self, tmp_path, path):
        _write_skill(tmp_path, "my-skill")
        _write_skill(tmp_path, "other")
        skill = next(s for s in discover_skills(tmp_path) if s.name == "my-skill")

        with pytest.raises(SkillFileError):
            skill.load_file(path)

    def test_lists_the_files_under_references(self, tmp_path):
        skill_file = _write_skill(tmp_path, "my-skill")
        _write_app_version_texts(skill_file)

        assert discover_skills(tmp_path)[0].linked_files() == ["references/v8.md", "references/v9.md"]


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
        _write_skill(tmp_path, "known", body="# Skill body here")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known"), _ctx())

        assert not result.is_error
        assert "# Skill body here" in result.content

    @pytest.mark.asyncio
    async def test_appends_the_v9_text_in_a_v9_app(self, tmp_path):
        skill_file = _write_skill(tmp_path, "known", body="# Skill body here")
        _write_app_version_texts(skill_file)
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known"), _ctx(V9_PROFILE))

        assert result.content.endswith("references/v9.md follows.\n\n## In v9 apps")

    @pytest.mark.asyncio
    async def test_on_demand_returns_the_skill_and_leaves_the_version_file_to_the_model(self, tmp_path):
        skill_file = _write_skill(tmp_path, "known", body="# Skill body here")
        _write_app_version_texts(skill_file)
        tool = SkillTool(discover_skills(tmp_path), append_version_file=False)

        skill = await tool.run(SkillArgs(skill="known"), _ctx(V9_PROFILE))
        version_file = await tool.run(SkillArgs(skill="known", file="references/v9.md"), _ctx(V9_PROFILE))

        assert skill.content == "# Skill body here"
        assert version_file.content == "## In v9 apps"

    def test_the_description_says_how_the_version_file_reaches_the_model(self, tmp_path):
        _write_skill(tmp_path, "known")
        skills = discover_skills(tmp_path)

        assert "already appended" in SkillTool(skills).description
        on_demand = SkillTool(skills, append_version_file=False).description
        assert "already appended" not in on_demand
        assert "the file for the app's version" in on_demand

    @pytest.mark.asyncio
    async def test_loads_a_linked_file(self, tmp_path):
        skill_file = _write_skill(tmp_path, "known")
        _write_reference(skill_file, "references/roles.md", "# Roles")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known", file="references/roles.md"), _ctx())

        assert not result.is_error
        assert result.content == "# Roles"
        assert result.metadata["file"] == "references/roles.md"

    @pytest.mark.asyncio
    async def test_a_missing_file_is_an_error_that_lists_the_files(self, tmp_path):
        skill_file = _write_skill(tmp_path, "known")
        _write_reference(skill_file, "references/roles.md", "# Roles")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="known", file="references/nope.md"), _ctx())

        assert result.is_error
        assert "references/roles.md" in result.content

    @pytest.mark.asyncio
    async def test_unknown_skill_is_error_listing_available(self, tmp_path):
        _write_skill(tmp_path, "known")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="nope"), _ctx())

        assert result.is_error
        assert "known" in result.content

    @pytest.mark.asyncio
    async def test_deleted_file_is_error_not_crash(self, tmp_path):
        skill_file = _write_skill(tmp_path, "gone")
        tool = SkillTool(discover_skills(tmp_path))
        skill_file.unlink()

        result = await tool.run(SkillArgs(skill="gone"), _ctx())

        assert result.is_error

    def test_description_names_available_skills(self, tmp_path):
        _write_skill(tmp_path, "alpha")
        _write_skill(tmp_path, "beta")
        tool = SkillTool(discover_skills(tmp_path))

        assert "alpha" in tool.description
        assert "beta" in tool.description

    @pytest.mark.asyncio
    @pytest.mark.parametrize(("profile", "url"), [(V8_PROFILE, DOCS_URL), (V9_PROFILE, DOCS_URL_V9)])
    async def test_source_record_uses_the_title_and_the_docs_url_for_the_app_version(self, tmp_path, profile, url):
        _write_skill(tmp_path, "titled", metadata=METADATA)
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="titled"), _ctx(profile))

        assert result.metadata["source"] == {"title": "Dynamiske uttrykk", "kind": "skill", "url": url}

    @pytest.mark.asyncio
    async def test_source_record_falls_back_to_name_without_url(self, tmp_path):
        _write_skill(tmp_path, "plain")
        tool = SkillTool(discover_skills(tmp_path))

        result = await tool.run(SkillArgs(skill="plain"), _ctx())

        assert result.metadata["source"] == {"title": "plain", "kind": "skill"}


# The bundled skills must follow the Agent Skills format
# (https://agentskills.io/specification), so the same directories also work
# for other coding agents, and must not depend on this assistant's tools.
_SPEC_FIELDS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
_STUDIO_METADATA = {"studio-title", "studio-docs-url", "studio-docs-url-v9"}
_NAME_PATTERN = re.compile(r"^studio-[a-z0-9]+(-[a-z0-9]+)*$")
# "skill" is an ordinary word, so only a call to that tool counts.
_ASSISTANT_TOOL_NAMES = (*(name for name in _build_registry([]).names() if name != "skill"), "skill(")
_RELATIVE_LINK = re.compile(r"\]\((?!https?://|#|mailto:)([^)\s#]+)")
_BUNDLED_SKILL_DIRS = sorted(path for path in _DEFAULT_SKILLS_DIR.iterdir() if path.is_dir())


def _frontmatter(skill_dir: Path) -> dict:
    raw = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    match = _FRONTMATTER_PATTERN.match(raw)
    assert match, f"{skill_dir.name}: SKILL.md has no frontmatter"
    return yaml.safe_load(match.group(1))


class TestBundledSkills:
    def test_every_directory_is_a_discoverable_skill(self):
        discovered = {skill.name for skill in discover_skills()}

        assert discovered == {path.name for path in _BUNDLED_SKILL_DIRS}

    @pytest.mark.parametrize("skill_dir", _BUNDLED_SKILL_DIRS, ids=lambda path: path.name)
    def test_frontmatter_follows_the_spec(self, skill_dir):
        fields = _frontmatter(skill_dir)

        assert set(fields) <= _SPEC_FIELDS
        assert fields["name"] == skill_dir.name
        assert _NAME_PATTERN.match(fields["name"])
        assert 0 < len(fields["description"]) <= MAX_LISTING_DESCRIPTION_CHARS
        metadata = fields.get("metadata", {})
        assert set(metadata) <= _STUDIO_METADATA
        assert all(isinstance(value, str) for value in metadata.values())
        # The source chip in the chat UI shows the title and links the docs page.
        assert metadata.get("studio-title")
        assert metadata.get("studio-docs-url", "").startswith("https://docs.altinn.studio/")

    @pytest.mark.parametrize("skill_dir", _BUNDLED_SKILL_DIRS, ids=lambda path: path.name)
    def test_links_resolve_and_every_reference_is_linked(self, skill_dir):
        """Relative links resolve from the skill's root, as the spec says. CI's link check reads only web links."""

        def links_in(path: Path) -> set[str]:
            return set(_RELATIVE_LINK.findall(path.read_text(encoding="utf-8")))

        linked_from_skill_md = links_in(skill_dir / "SKILL.md")
        linked = set().union(*(links_in(path) for path in skill_dir.rglob("*.md")))
        files = {
            path.relative_to(skill_dir).as_posix()
            for path in skill_dir.rglob("*")
            if path.is_file() and path.name != "SKILL.md"
        }

        assert all(".." not in Path(link).parts for link in linked)
        assert linked <= files | {"SKILL.md"}, f"broken links: {sorted(linked - files)}"
        assert files <= linked_from_skill_md, f"files not linked from SKILL.md: {sorted(files - linked_from_skill_md)}"
        assert all(path.startswith(("references/", "scripts/", "assets/")) for path in files)

    @pytest.mark.parametrize("skill_dir", _BUNDLED_SKILL_DIRS, ids=lambda path: path.name)
    def test_does_not_name_the_assistants_tools(self, skill_dir):
        for path in skill_dir.rglob("*.md"):
            text = path.read_text(encoding="utf-8")
            named = [tool for tool in _ASSISTANT_TOOL_NAMES if tool in text]
            assert named == [], f"{path.relative_to(skill_dir)} names {named}"
