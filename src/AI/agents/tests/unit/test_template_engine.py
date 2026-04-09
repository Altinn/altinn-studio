"""Tests for the prompt template engine.

Covers:
- Identifier-only regex (no false matches on JSON examples)
- Langfuse variable-drop protection
- Missing variable detection
- None variable handling
"""

import pytest
from unittest.mock import Mock, patch, MagicMock

from agents.prompts.loader import _compile_template, render_template


# ---------------------------------------------------------------------------
# _compile_template — identifier matching
# ---------------------------------------------------------------------------

class TestCompileTemplateIdentifiers:
    """Only valid Python identifiers inside {{...}} should be treated as variables."""

    def test_simple_variable_substitution(self):
        result = _compile_template("Hello {{name}}!", {"name": "World"})
        assert result == "Hello World!"

    def test_multiple_variables(self):
        result = _compile_template(
            "{{greeting}} {{name}}!",
            {"greeting": "Hi", "name": "Alice"},
        )
        assert result == "Hi Alice!"

    def test_none_variable_becomes_empty_string(self):
        result = _compile_template("Value: {{val}}", {"val": None})
        assert result == "Value: "

    def test_missing_variable_raises(self):
        with pytest.raises(ValueError, match="Missing required template variable"):
            _compile_template("Hello {{missing}}", {})

    def test_json_example_not_treated_as_variable(self):
        """Double-braced JSON examples like {{"key": "value"}} should become literal braces."""
        template = 'Example: {{"id": "app.field.name", "value": "Navn"}}'
        result = _compile_template(template, {})
        assert result == 'Example: {"id": "app.field.name", "value": "Navn"}'

    def test_json_with_simpleBinding_not_treated_as_variable(self):
        """The exact pattern that caused the original crash."""
        template = '{{"simpleBinding": "sokerensNavn"}}'
        result = _compile_template(template, {})
        assert result == '{"simpleBinding": "sokerensNavn"}'

    def test_mixed_variables_and_json_examples(self):
        template = (
            "Goal: {{user_goal}}\n"
            'Example: {{"op": "insert", "file": "test.json"}}\n'
            "Step: {{step}}"
        )
        result = _compile_template(
            template, {"user_goal": "Add field", "step": "1"}
        )
        assert 'Goal: Add field' in result
        assert 'Example: {"op": "insert", "file": "test.json"}' in result
        assert 'Step: 1' in result

    def test_underscore_variable(self):
        result = _compile_template("{{my_var}}", {"my_var": "ok"})
        assert result == "ok"

    def test_numeric_suffix_variable(self):
        result = _compile_template("{{var2}}", {"var2": "two"})
        assert result == "two"

    def test_leading_digit_not_identifier(self):
        """{{2var}} is not a valid identifier — should become literal."""
        result = _compile_template("{{2var}}", {})
        assert result == "{2var}"

    def test_whitespace_around_identifier_stripped(self):
        result = _compile_template("{{ name }}", {"name": "trimmed"})
        assert result == "trimmed"

    def test_empty_braces_pass_through(self):
        result = _compile_template("{{}}", {})
        # Regex requires at least one char inside — passes through untouched
        assert result == "{{}}"


# ---------------------------------------------------------------------------
# render_template — Langfuse variable-drop protection
# ---------------------------------------------------------------------------

class TestRenderTemplateLangfuseProtection:
    """Langfuse templates that silently drop variables should fall back to local."""

    def test_falls_back_when_langfuse_missing_placeholders(self, tmp_path):
        """If Langfuse template doesn't have all our variables, use local."""
        # Create a local template file
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        local_template = templates_dir / "test_tpl.md"
        local_template.write_text("Goal: {{user_goal}}, Spec: {{form_spec}}")

        # Mock Langfuse returning a template WITHOUT {{form_spec}}
        mock_lf_prompt = Mock()
        mock_lf_prompt.prompt = "Goal: {{user_goal}}"  # missing form_spec!
        mock_lf_prompt.compile = Mock(return_value="Goal: Add field")

        with patch("agents.prompts.loader.get_raw_langfuse_prompt", return_value=mock_lf_prompt):
            with patch("agents.prompts.loader.PROMPTS_DIR", tmp_path):
                result = render_template(
                    "test_tpl",
                    user_goal="Add field",
                    form_spec="FORM SPEC: ...",
                )

        # Should have used local template (has both variables)
        assert "Spec: FORM SPEC: ..." in result
        # Langfuse compile should NOT have been called
        mock_lf_prompt.compile.assert_not_called()

    def test_uses_langfuse_when_all_placeholders_present(self, tmp_path):
        """If Langfuse has all variables, use it."""
        mock_lf_prompt = Mock()
        mock_lf_prompt.prompt = "Goal: {{user_goal}}, Spec: {{form_spec}}"
        mock_lf_prompt.compile = Mock(return_value="Goal: Add field, Spec: SPEC")

        with patch("agents.prompts.loader.get_raw_langfuse_prompt", return_value=mock_lf_prompt):
            result = render_template(
                "test_tpl",
                user_goal="Add field",
                form_spec="SPEC",
            )

        assert result == "Goal: Add field, Spec: SPEC"
        mock_lf_prompt.compile.assert_called_once_with(user_goal="Add field", form_spec="SPEC")

    def test_falls_back_on_langfuse_compile_error(self, tmp_path):
        """If Langfuse compile() raises, fall back to local."""
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        local_template = templates_dir / "test_tpl.md"
        local_template.write_text("Hello {{name}}")

        mock_lf_prompt = Mock()
        mock_lf_prompt.prompt = "Hello {{name}}"
        mock_lf_prompt.compile = Mock(side_effect=RuntimeError("Langfuse broke"))

        with patch("agents.prompts.loader.get_raw_langfuse_prompt", return_value=mock_lf_prompt):
            with patch("agents.prompts.loader.PROMPTS_DIR", tmp_path):
                result = render_template("test_tpl", name="World")

        assert result == "Hello World"

    def test_falls_back_when_langfuse_unavailable(self, tmp_path):
        """If Langfuse returns None, use local template."""
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        local_template = templates_dir / "test_tpl.md"
        local_template.write_text("Value: {{x}}")

        with patch("agents.prompts.loader.get_raw_langfuse_prompt", return_value=None):
            with patch("agents.prompts.loader.PROMPTS_DIR", tmp_path):
                result = render_template("test_tpl", x="42")

        assert result == "Value: 42"

    def test_missing_local_template_raises(self, tmp_path):
        with patch("agents.prompts.loader.get_raw_langfuse_prompt", return_value=None):
            with patch("agents.prompts.loader.PROMPTS_DIR", tmp_path):
                with pytest.raises(FileNotFoundError):
                    render_template("nonexistent_template", x="1")
