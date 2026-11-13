"""Tests for the system-prompt assembler."""

from __future__ import annotations

from dataclasses import replace
from datetime import date

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE
from agents.core import SessionContext, build_system_prompt


def _base_ctx(**overrides) -> SessionContext:
    base = {
        "session_id": "s1",
        "repo_path": "/repo",
        "user_goal": "Add a date field",
        "allow_app_changes": True,
        "today": date(2026, 5, 22),
    }
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
        assert "Mode: WRITE" in prompt

    def test_read_mode_says_a_write_asks_rather_than_fails(self):
        """ "Write tools are disabled" contradicted the rule to try and let the
        user answer the permission prompt, and the model believed the ban."""
        prompt = build_system_prompt(_base_ctx(allow_app_changes=False))

        assert "Mode: READ (a write tool asks the user for permission" in prompt
        assert "disabled" not in prompt

    def test_read_mode_names_the_switch_the_user_has_to_turn_on(self):
        prompt = build_system_prompt(_base_ctx(allow_app_changes=False))

        assert "Tillat endringer i appen" in prompt


class TestOptionalSections:
    def test_form_spec_omitted_when_absent(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Form spec" not in prompt

    def test_form_spec_rendered_when_present(self):
        prompt = build_system_prompt(_base_ctx(form_spec_summary="FORM SPEC: foo"))
        assert "Form spec" in prompt
        assert "FORM SPEC: foo" in prompt


class TestStableOrdering:
    def test_sections_in_documented_order(self):
        prompt = build_system_prompt(_base_ctx(form_spec_summary="FORM SPEC: y"))
        # identity → principles → anatomy → rules → tool-use → session →
        # form spec → final answer
        order = [
            "Altinity",
            "Operating principles",
            "Altinn app anatomy",
            "Critical rules",
            "Working with tools",
            "Session",
            "Form spec",
            "Final response",
        ]
        positions = [prompt.index(landmark) for landmark in order]
        assert positions == sorted(positions), f"Sections out of order: {list(zip(order, positions, strict=False))}"


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

    def test_a_datepicker_is_paired_with_timestamp_false(self):
        prompt = build_system_prompt(_base_ctx())
        assert "Datepicker" in prompt
        assert '"timeStamp": false' in prompt

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
            "operating principles should tell the model to batch writes to different files into the same turn"
        )


class TestAppVersion:
    def test_anatomy_describes_the_ui_files_of_the_app_version(self):
        profile = replace(V8_PROFILE, ui_anatomy_prompt="- **UI files** of this version")

        prompt = build_system_prompt(_base_ctx(app_version_profile=profile))

        assert "- **UI files** of this version\n- **Data models**" in prompt

    def test_critical_rules_end_with_the_rules_of_the_app_version(self):
        profile = replace(V8_PROFILE, version_rules_prompt="8.  **A rule of this version.**")

        prompt = build_system_prompt(_base_ctx(app_version_profile=profile))

        assert "without one.\n\n8.  **A rule of this version.**" in prompt

    def test_session_states_the_app_version(self):
        prompt = build_system_prompt(_base_ctx(app_version_profile=V9_PROFILE))

        assert "- App version: v9" in prompt

    def test_a_v9_app_edits_layouts_in_the_folder_of_its_process_task(self):
        prompt = build_system_prompt(_base_ctx(app_version_profile=V9_PROFILE))

        assert "App/ui/<taskId>/layouts/" in prompt
        assert "App/ui/<layoutSetId>/" not in prompt

    def test_a_v9_app_is_told_headings_use_the_heading_component(self):
        prompt = build_system_prompt(_base_ctx(app_version_profile=V9_PROFILE))

        assert "Headings use the `Heading` component" in prompt


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

    @pytest.mark.parametrize("allow_app_changes", [True, False])
    def test_reports_errors_from_before_the_session_without_fixing_them(self, allow_app_changes: bool):
        """`verify_changes` does not stop for old errors, so only the final message tells the user about them.

        A read-only session that gets permission keeps the read-only contract, so the two contracts have the rule.
        """
        prompt = build_system_prompt(_base_ctx(allow_app_changes=allow_app_changes))

        assert "listed `old_errors`" in prompt
        assert "name them after the files and offer to fix them" in prompt
        assert "Don't fix them unasked" in prompt


class TestPreviewRenderCheck:
    """The model hears about the render check only where the check is registered.
    A model that is told to run a check that cannot run tells the user about it."""

    @pytest.mark.parametrize("enabled", [True, False])
    def test_the_prompt_names_the_check_only_when_the_registry_has_it(self, monkeypatch, enabled: bool):
        from agents.graph.nodes.agentic_loop_node import _build_registry
        from shared.config.base_config import BaseConfig

        monkeypatch.setattr(BaseConfig, "PREVIEW_CHECK_ENABLED", enabled)

        for allow_app_changes in (True, False):
            prompt = build_system_prompt(_base_ctx(allow_app_changes=allow_app_changes))
            assert ("preview_render_check" in prompt) is enabled
        assert ("preview_render_check" in _build_registry([])) is enabled

    def test_the_check_comes_after_the_tool_use_section(self, monkeypatch):
        from shared.config.base_config import BaseConfig

        monkeypatch.setattr(BaseConfig, "PREVIEW_CHECK_ENABLED", True)

        prompt = build_system_prompt(_base_ctx())

        assert prompt.index("Working with tools") < prompt.index("Render check before you finish")
        assert prompt.index("Render check before you finish") < prompt.index("## Session")
