"""Tests for the verifier auto-fix pipeline.

Covers:
- Deterministic dedup for duplicate resource IDs
- LLM-based fixer receiving correct file contents
- Error extraction from various MCP response formats
- Mixed deterministic + LLM error handling
"""

import json
import pytest
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch, MagicMock

from agents.graph.nodes.verifier_node import (
    _attempt_auto_fix,
    _apply_deterministic_fixes,
    _error_to_str,
    _generate_fix_patch,
)
from agents.graph.state import AgentState
from agents.services.git.git_ops import deduplicate_resource_ids


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_resource_file(tmp: Path, rel_path: str, resources: list) -> str:
    """Create a resource JSON file and return its relative path."""
    full = tmp / rel_path
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(json.dumps({"resources": resources}, ensure_ascii=False, indent=2))
    return rel_path


def _make_state(tmp_dir: str, changed_files: list | None = None, repo_facts: dict | None = None) -> AgentState:
    return AgentState(
        session_id="test-session",
        user_goal="test",
        repo_path=tmp_dir,
        changed_files=changed_files or [],
        repo_facts=repo_facts,
    )


def _make_verification_result(tool_results: list | None = None, errors: list | None = None):
    """Create a mock MCPVerificationResult."""
    result = Mock()
    result.passed = False
    result.errors = errors or []
    result.tool_results = tool_results
    return result


# ---------------------------------------------------------------------------
# deduplicate_resource_ids (git_ops)
# ---------------------------------------------------------------------------

class TestDeduplicateResourceIds:
    """Unit tests for the dedup function in git_ops."""

    def test_removes_duplicate_keeps_last(self, tmp_path):
        resources = [
            {"id": "app.field.name", "value": "Old Name"},
            {"id": "app.field.age", "value": "Age"},
            {"id": "app.field.name", "value": "New Name"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        modified = deduplicate_resource_ids(str(tmp_path), [rel])

        assert modified == [rel]
        data = json.loads((tmp_path / rel).read_text())
        ids = [r["id"] for r in data["resources"]]
        assert ids == ["app.field.age", "app.field.name"]
        # The kept entry should be the last one ("New Name")
        name_entry = next(r for r in data["resources"] if r["id"] == "app.field.name")
        assert name_entry["value"] == "New Name"

    def test_no_duplicates_no_modification(self, tmp_path):
        resources = [
            {"id": "app.field.name", "value": "Name"},
            {"id": "app.field.age", "value": "Age"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        modified = deduplicate_resource_ids(str(tmp_path), [rel])

        assert modified == []

    def test_multiple_duplicates(self, tmp_path):
        resources = [
            {"id": "a", "value": "1"},
            {"id": "b", "value": "2"},
            {"id": "a", "value": "3"},
            {"id": "b", "value": "4"},
            {"id": "c", "value": "5"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        modified = deduplicate_resource_ids(str(tmp_path), [rel])

        assert len(modified) == 1
        data = json.loads((tmp_path / rel).read_text())
        ids = [r["id"] for r in data["resources"]]
        assert len(ids) == 3
        assert len(set(ids)) == 3  # all unique

    def test_missing_file_skipped(self, tmp_path):
        modified = deduplicate_resource_ids(
            str(tmp_path), ["App/config/texts/nonexistent.json"]
        )
        assert modified == []

    def test_non_dict_resources_skipped(self, tmp_path):
        """Files with non-standard structure should be left alone."""
        full = tmp_path / "App/config/texts/resource.nb.json"
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(json.dumps(["not", "a", "dict"]))

        modified = deduplicate_resource_ids(
            str(tmp_path), ["App/config/texts/resource.nb.json"]
        )
        assert modified == []

    def test_entries_without_id_preserved(self, tmp_path):
        resources = [
            {"id": "a", "value": "1"},
            {"value": "no-id-entry"},
            {"id": "a", "value": "2"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        modified = deduplicate_resource_ids(str(tmp_path), [rel])

        assert len(modified) == 1
        data = json.loads((tmp_path / rel).read_text())
        # The no-id entry has a unique index so it survives
        assert len(data["resources"]) == 2


# ---------------------------------------------------------------------------
# _apply_deterministic_fixes
# ---------------------------------------------------------------------------

class TestApplyDeterministicFixes:
    """Tests for the deterministic fix dispatcher."""

    def test_fixes_duplicate_resource_id_error(self, tmp_path):
        resources = [
            {"id": "app.field.sendIn", "value": "Send inn"},
            {"id": "app.field.name", "value": "Navn"},
            {"id": "app.field.sendIn", "value": "Send inn skjema"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)
        repo_facts = {"resources": [rel]}
        errors = ["Duplicate resource IDs: ['app.field.sendIn']"]

        fixed = _apply_deterministic_fixes(str(tmp_path), repo_facts, errors)

        assert len(fixed) == 1
        assert "Deduplicated" in fixed[0]

    def test_no_match_returns_empty(self, tmp_path):
        errors = ["Missing required property 'value' in component header-1"]
        fixed = _apply_deterministic_fixes(str(tmp_path), {}, errors)
        assert fixed == []

    def test_fallback_discovers_resource_files(self, tmp_path):
        """When repo_facts has no resources key, discover files from disk."""
        resources = [
            {"id": "x", "value": "1"},
            {"id": "x", "value": "2"},
        ]
        _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        errors = ["Duplicate resource IDs: ['x']"]
        fixed = _apply_deterministic_fixes(str(tmp_path), {}, errors)

        assert len(fixed) == 1

    def test_dict_error_format(self, tmp_path):
        """Errors can be dicts with a 'message' key."""
        resources = [
            {"id": "y", "value": "1"},
            {"id": "y", "value": "2"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        errors = [{"message": "Duplicate resource IDs: ['y']", "path": "resources"}]
        fixed = _apply_deterministic_fixes(str(tmp_path), {"resources": [rel]}, errors)

        assert len(fixed) == 1


# ---------------------------------------------------------------------------
# _error_to_str
# ---------------------------------------------------------------------------

class TestErrorToStr:
    def test_string_passthrough(self):
        assert _error_to_str("some error") == "some error"

    def test_dict_with_message(self):
        assert _error_to_str({"message": "bad thing"}) == "bad thing"

    def test_dict_without_message(self):
        result = _error_to_str({"code": 42})
        assert "42" in result

    def test_other_type(self):
        assert _error_to_str(42) == "42"


# ---------------------------------------------------------------------------
# _attempt_auto_fix — integration-level
# ---------------------------------------------------------------------------

class TestAttemptAutoFix:
    """Integration tests for the full auto-fix dispatch."""

    @pytest.mark.asyncio
    async def test_deterministic_fix_takes_priority_over_llm(self, tmp_path):
        """When a deterministic fix exists, the LLM should NOT be called."""
        resources = [
            {"id": "dup", "value": "1"},
            {"id": "dup", "value": "2"},
        ]
        rel = _make_resource_file(tmp_path, "App/config/texts/resource.nb.json", resources)

        state = _make_state(
            str(tmp_path),
            changed_files=[rel],
            repo_facts={"resources": [rel]},
        )

        # Simulate MCP tool result with duplicate ID error
        tool_result_data = [Mock(text=json.dumps({
            "valid": False,
            "errors": ["Duplicate resource IDs: ['dup']"],
        }))]
        verification = _make_verification_result(
            tool_results=[{"tool": "altinn_resource_validate", "file": rel, "result": tool_result_data}],
            errors=[f"resource_validation: {rel}: Duplicate resource IDs: ['dup']"],
        )

        with patch(
            "agents.graph.nodes.verifier_node._generate_fix_patch",
            new_callable=AsyncMock,
        ) as mock_llm:
            result = await _attempt_auto_fix(state, verification)

        assert result is True
        mock_llm.assert_not_called()

        # Verify the file was actually deduped
        data = json.loads((tmp_path / rel).read_text())
        assert len(data["resources"]) == 1

    @pytest.mark.asyncio
    async def test_llm_fix_called_for_non_deterministic_errors(self, tmp_path):
        """Non-matching errors fall through to the LLM fixer."""
        state = _make_state(
            str(tmp_path),
            changed_files=["App/ui/form/layouts/Side1.json"],
        )

        tool_result_data = [Mock(text=json.dumps({
            "valid": False,
            "errors": ["Missing required property 'value'"],
        }))]
        verification = _make_verification_result(
            tool_results=[{
                "tool": "altinn_layout_validate",
                "file": "App/ui/form/layouts/Side1.json",
                "result": tool_result_data,
            }],
        )

        fake_patch = {
            "files": ["App/ui/form/layouts/Side1.json"],
            "changes": [{"file": "App/ui/form/layouts/Side1.json", "op": "replace_text", "old_text": "x", "new_text": "y"}],
        }

        with patch(
            "agents.graph.nodes.verifier_node._generate_fix_patch",
            new_callable=AsyncMock,
            return_value=fake_patch,
        ) as mock_llm:
            with patch("agents.services.git.git_ops.apply") as mock_apply:
                result = await _attempt_auto_fix(state, verification)

        assert result is True
        mock_llm.assert_called_once()
        mock_apply.assert_called_once()

    @pytest.mark.asyncio
    async def test_affected_files_collected_from_tool_results(self, tmp_path):
        """The LLM fixer should receive files from tool_results AND changed_files."""
        layout = tmp_path / "App/ui/form/layouts/Side1.json"
        layout.parent.mkdir(parents=True, exist_ok=True)
        layout.write_text('{"data": {"layout": []}}')

        resource = tmp_path / "App/config/texts/resource.nb.json"
        resource.parent.mkdir(parents=True, exist_ok=True)
        resource.write_text('{"resources": []}')

        state = _make_state(
            str(tmp_path),
            changed_files=[
                "App/ui/form/layouts/Side1.json",
                "App/config/texts/resource.nb.json",
            ],
        )

        tool_result_data = [Mock(text=json.dumps({
            "valid": False,
            "errors": ["Component 'header-1' missing 'value'"],
        }))]
        verification = _make_verification_result(
            tool_results=[{
                "tool": "altinn_layout_validate",
                "file": "App/ui/form/layouts/Side1.json",
                "result": tool_result_data,
            }],
        )

        captured_files = []

        async def capture_fix_patch(repo_path, affected_files, errors, st):
            captured_files.extend(affected_files)
            return {}  # Empty = fix failed (that's fine, we're testing the input)

        with patch(
            "agents.graph.nodes.verifier_node._generate_fix_patch",
            side_effect=capture_fix_patch,
        ):
            await _attempt_auto_fix(state, verification)

        # Both the tool-result file AND changed_files should be included
        assert "App/ui/form/layouts/Side1.json" in captured_files
        assert "App/config/texts/resource.nb.json" in captured_files

    @pytest.mark.asyncio
    async def test_no_errors_returns_false(self, tmp_path):
        """When no structured errors are found, return False."""
        state = _make_state(str(tmp_path), changed_files=["some/file.json"])
        verification = _make_verification_result(tool_results=[])

        result = await _attempt_auto_fix(state, verification)
        assert result is False


# ---------------------------------------------------------------------------
# _generate_fix_patch
# ---------------------------------------------------------------------------

class TestGenerateFixPatch:
    """Tests for the LLM-based fix patch generator."""

    @pytest.mark.asyncio
    async def test_reads_all_affected_file_contents(self, tmp_path):
        layout = tmp_path / "App/ui/form/layouts/Side1.json"
        layout.parent.mkdir(parents=True, exist_ok=True)
        layout.write_text('{"data": {"layout": [{"id": "h1", "type": "Header"}]}}')

        resource = tmp_path / "App/config/texts/resource.nb.json"
        resource.parent.mkdir(parents=True, exist_ok=True)
        resource.write_text('{"resources": [{"id": "app.title", "value": "Test"}]}')

        state = _make_state(str(tmp_path))

        captured_prompt = []

        class FakeLLM:
            def __init__(self, **kwargs):
                pass

            def call_sync(self, system, user, **kwargs):
                captured_prompt.append(user)
                return json.dumps({"files": [], "changes": []})

        with patch("agents.graph.nodes.verifier_node.LLMClient", FakeLLM):
            with patch("agents.graph.nodes.verifier_node.get_prompt_with_langfuse", return_value=("system", None)):
                with patch("agents.graph.nodes.verifier_node.render_template") as mock_render:
                    mock_render.return_value = "fake prompt"
                    result = await _generate_fix_patch(
                        str(tmp_path),
                        [
                            "App/ui/form/layouts/Side1.json",
                            "App/config/texts/resource.nb.json",
                        ],
                        ["Missing 'value' on header-1"],
                        state,
                    )

        # Verify render_template was called with file_contents containing both files
        call_kwargs = mock_render.call_args
        file_contents_str = call_kwargs.kwargs.get("file_contents") or call_kwargs[1].get("file_contents", "")
        assert "Side1.json" in file_contents_str
        assert "resource.nb.json" in file_contents_str

    @pytest.mark.asyncio
    async def test_returns_empty_on_no_files(self, tmp_path):
        state = _make_state(str(tmp_path))

        result = await _generate_fix_patch(
            str(tmp_path),
            ["nonexistent/file.json"],
            ["some error"],
            state,
        )

        assert result == {}

    @pytest.mark.asyncio
    async def test_handles_llm_returning_invalid_json(self, tmp_path):
        layout = tmp_path / "f.json"
        layout.write_text("{}")

        state = _make_state(str(tmp_path))

        class FakeLLM:
            def __init__(self, **kwargs):
                pass

            def call_sync(self, system, user, **kwargs):
                return "This is not JSON at all"

        with patch("agents.graph.nodes.verifier_node.LLMClient", FakeLLM):
            with patch("agents.graph.nodes.verifier_node.get_prompt_with_langfuse", return_value=("sys", None)):
                with patch("agents.graph.nodes.verifier_node.render_template", return_value="prompt"):
                    result = await _generate_fix_patch(
                        str(tmp_path), ["f.json"], ["err"], state
                    )

        assert result == {}
