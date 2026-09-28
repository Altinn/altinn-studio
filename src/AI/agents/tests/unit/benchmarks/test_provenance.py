"""The models axis, the actor prompt and tools digests, and what the agent ran against."""

from __future__ import annotations

from dataclasses import replace

from agents.altinn import app_version
from agents.core import skills
from benchmarks import provenance


class TestModelsAxisProvenance:
    def test_agent_models_override_the_local_ones(self):
        state = provenance.collect(agent_models={"actor": "gpt-9-agent"})

        assert state.models["actor"] == "gpt-9-agent"

    def test_agent_models_are_noted_as_coming_from_the_agent(self):
        state = provenance.collect(agent_models={"actor": "gpt-9-agent"})

        assert any("agent" in note for note in state.notes)

    def test_no_note_when_nothing_came_from_the_agent(self):
        state = provenance.collect(agent_models={})

        assert not any("agent" in note for note in state.notes)

    def test_a_role_the_agent_does_not_run_is_ignored(self):
        state = provenance.collect(agent_models={"not-a-live-role": "x"})

        assert "not-a-live-role" not in state.models
        assert not any("agent" in note for note in state.notes)


class TestDigestsCoverEveryAppVersion:
    """A change to the v9 prompt text or to a skill file must change a digest."""

    def test_the_v9_prompt_text_moves_the_actor_prompt_digest(self, monkeypatch):
        before = provenance._actor_prompt_digest()
        changed = replace(app_version.V9_PROFILE, version_rules_prompt="changed")
        monkeypatch.setattr(app_version, "APP_VERSION_PROFILES", (app_version.V8_PROFILE, changed))

        assert before is not None
        assert provenance._actor_prompt_digest() != before

    def test_a_skill_description_moves_the_actor_prompt_digest(self, monkeypatch):
        before = provenance._actor_prompt_digest()
        monkeypatch.setattr(skills, "format_skill_listing", lambda _skills: "changed")

        assert provenance._actor_prompt_digest() != before

    def test_the_skill_text_for_one_app_version_moves_the_tools_digest(self, tmp_path, monkeypatch):
        skill_dir = tmp_path / "altinn-example"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\ndescription: An example.\n---\nBody.\n")
        (skill_dir / "v9.md").write_text("Old v9 text.\n")
        monkeypatch.setattr(skills, "_DEFAULT_SKILLS_DIR", tmp_path)
        before = provenance._tools_digest()
        (skill_dir / "v9.md").write_text("New v9 text.\n")

        assert before is not None
        assert provenance._tools_digest() != before
