"""The models axis, and telling apart what the agent ran from what this checkout resolves."""

from __future__ import annotations

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
