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
        before = provenance._hash_actor_prompt()
        changed = replace(app_version.V9_PROFILE, version_rules_prompt="changed")
        monkeypatch.setattr(app_version, "APP_VERSION_PROFILES", (app_version.V8_PROFILE, changed))

        assert provenance._hash_actor_prompt() != before

    def test_a_skill_description_moves_the_actor_prompt_digest(self, monkeypatch):
        before = provenance._hash_actor_prompt()
        monkeypatch.setattr(skills, "format_skill_listing", lambda _skills: "changed")

        assert provenance._hash_actor_prompt() != before

    def test_the_final_answer_text_moves_the_actor_prompt_digest(self, monkeypatch):
        """`build_system_prompt` adds this section after the stable prefix."""
        from agents.core import context

        before = provenance._hash_actor_prompt()
        monkeypatch.setattr(context, "_FINAL_ANSWER", "changed")

        assert provenance._hash_actor_prompt() != before

    def test_the_read_only_final_answer_text_moves_the_actor_prompt_digest(self, monkeypatch):
        from agents.core import context

        before = provenance._hash_actor_prompt()
        monkeypatch.setattr(context, "_FINAL_ANSWER_READ_ONLY", "changed")

        assert provenance._hash_actor_prompt() != before

    def test_the_date_of_today_does_not_move_the_actor_prompt_digest(self, monkeypatch):
        """A digest that changes every day compares nothing."""
        from datetime import date

        from agents.core import context

        class LaterDate(date):
            @classmethod
            def today(cls):
                return cls(2099, 12, 31)

        before = provenance._hash_actor_prompt()
        monkeypatch.setattr(context, "date", LaterDate)

        assert provenance._hash_actor_prompt() == before

    def test_the_skill_text_for_one_app_version_moves_the_tools_digest(self, tmp_path, monkeypatch):
        skill_dir = tmp_path / "altinn-example"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\ndescription: An example.\n---\nBody.\n")
        (skill_dir / "v9.md").write_text("Old v9 text.\n")
        monkeypatch.setattr(skills, "_DEFAULT_SKILLS_DIR", tmp_path)
        before = provenance._hash_tools()
        (skill_dir / "v9.md").write_text("New v9 text.\n")

        assert provenance._hash_tools() != before

    def test_the_tool_list_moves_the_tools_digest(self, monkeypatch):
        """The tool list is in the graph node, which is not a tools file."""
        from agents.graph.nodes import agentic_loop_node

        before = provenance._hash_tools()
        all_tools = agentic_loop_node._internal_tools
        monkeypatch.setattr(agentic_loop_node, "_internal_tools", lambda skills: all_tools(skills)[1:])

        assert provenance._hash_tools() != before


class TestAFailedDigest:
    """A run records a failed digest as missing. The gate needs the error too."""

    def _fail(self):
        raise ImportError("no module named 'agents.core.skills'")

    def test_a_failed_digest_is_none(self, monkeypatch):
        monkeypatch.setitem(provenance.DIGEST_HASHERS, "tools", self._fail)

        measured = provenance.digests()

        assert measured["tools"] is None
        assert measured["actor_prompt"] is not None

    def test_the_caller_gets_the_error_of_a_failed_digest(self, monkeypatch):
        monkeypatch.setitem(provenance.DIGEST_HASHERS, "tools", self._fail)
        failures = []

        provenance.digests(on_failure=lambda axis, error: failures.append((axis, str(error))))

        assert failures == [("tools", "no module named 'agents.core.skills'")]
