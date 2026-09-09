"""Tests for the system-prompt assembler."""

from __future__ import annotations

from datetime import date

from agents.core import SessionContext, build_system_prompt


def _base_ctx(**overrides) -> SessionContext:
    base = dict(
        session_id="s1",
        repo_path="/repo",
        user_goal="Add a date field",
        allow_app_changes=True,
        today=date(2026, 5, 22),
    )
    base.update(overrides)
    return SessionContext(**base)


class TestRequiredSections:
    def test_identity_present(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Altinity" in prompt

    def test_goal_present(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Add a date field" in prompt

    def test_repo_path_present(self):
        prompt = build_system_prompt(_base_ctx())
        assert "/repo" in prompt

    def test_date_present(self):
        prompt = build_system_prompt(_base_ctx())
        assert "2026-05-22" in prompt


class TestMode:
    def test_write_mode_message(self):
        prompt = build_system_prompt(_base_ctx(allow_app_changes=True))
        assert "WRITE" in prompt
        assert "READ-ONLY" not in prompt

    def test_read_only_mode_message(self):
        prompt = build_system_prompt(_base_ctx(allow_app_changes=False))
        assert "READ-ONLY" in prompt


class TestOptionalSections:
    def test_repo_facts_omitted_when_absent(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Repo facts" not in prompt

    def test_repo_facts_rendered_when_present(self):
        prompt = build_system_prompt(
            _base_ctx(repo_facts={"layouts": ["a", "b", "c"], "model": "Form"})
        )
        assert "Repo facts" in prompt
        assert "layouts" in prompt
        assert "Form" in prompt

    def test_form_spec_omitted_when_absent(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Form spec" not in prompt

    def test_form_spec_rendered_when_present(self):
        prompt = build_system_prompt(_base_ctx(form_spec_summary="FORM SPEC: foo"))
        assert "Form spec" in prompt
        assert "FORM SPEC: foo" in prompt


class TestStableOrdering:
    def test_sections_in_documented_order(self):
        prompt = build_system_prompt(
            _base_ctx(
                repo_facts={"x": 1},
                form_spec_summary="FORM SPEC: y",
            )
        )
        # identity → principles → anatomy → rules → tool-use → session →
        # repo facts → form spec → final answer
        order = [
            "Altinity",
            "Operating principles",
            "Altinn app anatomy",
            "Critical rules",
            "Working with tools",
            "Session",
            "Repo facts",
            "Form spec",
            "Final response",
        ]
        positions = [prompt.index(landmark) for landmark in order]
        assert positions == sorted(positions), (
            f"Sections out of order: {list(zip(order, positions))}"
        )


class TestDomainKnowledge:
    """The new prompt must teach the model the Altinn-specific
    constraints that the legacy prompts repeatedly enforced.  These
    landmark checks fail if a future edit accidentally drops them."""

    def test_anatomy_names_the_four_file_groups(self):
        prompt = build_system_prompt(_base_ctx())
        for landmark in ("Layouts", "Data models", "Text resources", "Policy"):
            assert landmark in prompt, f"anatomy missing: {landmark}"

    def test_critical_rules_present(self):
        prompt = build_system_prompt(_base_ctx())
        # ID regex tail — the specific gotcha the legacy prompts called
        # out (suffix `-42` is invalid).
        assert "-42" in prompt
        # Binding-type rule.
        assert "simpleBinding" in prompt
        # Naming-layer rule.
        assert "kebab-case" in prompt
        assert "camelCase" in prompt
        # Dynamic expression shape — array-based, not boolean.
        assert "equals" in prompt or "dataModel" in prompt

    def test_tool_use_section_calls_out_parallelism(self):
        prompt = build_system_prompt(_base_ctx())
        # Read-parallel / write-serial guidance.
        assert "parallel" in prompt.lower() or "Parallelise" in prompt

    def test_prompt_encourages_batching_independent_writes(self):
        """The 'one write per turn' anti-pattern is the main latency cost
        in compound tasks — 8 file writes = 8 LLM round-trips.  The
        prompt must explicitly tell the model to batch writes to
        different paths in the same turn.  Without this guidance the
        model defaults to one tool call at a time."""
        prompt = build_system_prompt(_base_ctx())
        text = prompt.lower()
        # "different files" + "same turn" together are the load-bearing
        # phrase — either alone is too generic.
        assert "different" in text and "same turn" in text, (
            "operating principles should tell the model to batch writes "
            "to different files into the same turn"
        )


class TestFinalAnswerContract:
    def test_mentions_conventional_commit_style(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Conventional Commit" in prompt or "feat" in prompt
        # And cites format guidance for Q&A mode too.
        assert "SOURCES" in prompt

    def test_forbids_markdown_tables(self):
        """The frontend's markdown renderer doesn't handle GFM tables —
        they show up as literal `| col | col |` lines.  The system
        prompt must steer the model to bullet lists instead."""
        prompt = build_system_prompt(_base_ctx())
        assert "Tables are NOT" in prompt or "tables are not" in prompt.lower()
        # And it should give an example of the preferred shape.
        assert "bullet list" in prompt.lower()
