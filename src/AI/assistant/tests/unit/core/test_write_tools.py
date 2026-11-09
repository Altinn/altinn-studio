"""Tests for the write tools: the read-only refusal of every tool that
needs write mode, and the behavior of verify_changes and
commit_session_branch.

The behavior of the file tools is tested in `test_file_tools.py`.

External services (git_ops, repo_manager, the CDN schema fetches)
are monkeypatched or stubbed — nothing in here touches the network.  The
v9 tests read the in-repo v9 schema and use real git repos in tmp_path.
"""

from __future__ import annotations

import json
import time
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE, AppVersionProfile
from agents.core import (
    CommitSessionBranchTool,
    DatamodelSyncTool,
    DiscardFileChangesTool,
    EditFileTool,
    LoopContext,
    PreviewRenderCheckTool,
    VerifyChangesTool,
    WriteFileTool,
)

from .git_repo import commit_all, create_committed_repo, git, write_files

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _write_ctx(
    *,
    repo_path: str = "/repo",
    allow_app_changes: bool = True,
    session_id: str = "session-abcdef12",
    changed: set[str] | None = None,
    verified: set[str] | None = None,
) -> LoopContext:
    ctx = LoopContext(
        session_id=session_id,
        repo_path=repo_path,
        allow_app_changes=allow_app_changes,
    )
    if changed is not None:
        ctx.extras["changed_files"] = changed
    if verified is not None:
        ctx.extras["verified_files"] = verified
    return ctx


@pytest.fixture
def permissive_schema(monkeypatch):
    """Schema fetch → empty schema (accepts any layout or text resource file)."""
    monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", lambda url: {})


# ---------------------------------------------------------------------------
# Permission gating (every tool that needs write mode must respect the flag)
# ---------------------------------------------------------------------------


class TestPermission:
    @pytest.mark.parametrize(
        "tool_factory,args",
        [
            (EditFileTool, {"path": "f.txt", "old_string": "a", "new_string": "b"}),
            (WriteFileTool, {"path": "f.txt", "content": "a"}),
            (DiscardFileChangesTool, {"path": "f.txt"}),
            (VerifyChangesTool, {}),
            (CommitSessionBranchTool, {"message": "msg"}),
            (PreviewRenderCheckTool, {}),
            (DatamodelSyncTool, {"schema_path": "App/models/model.schema.json"}),
        ],
    )
    async def test_denied_in_read_only_mode(self, tool_factory, args):
        tool = tool_factory()
        validated = tool.input_schema.model_validate(args)
        permission = await tool.check_permission(validated, _write_ctx(allow_app_changes=False))
        assert not permission.allowed
        assert "read-only" in permission.reason
        # The user can lift this denial interactively (permission prompt).
        assert permission.escalatable is True


# ---------------------------------------------------------------------------
# verify_changes
# ---------------------------------------------------------------------------


class TestVerifyChanges:
    async def test_layout_file_validated_in_process(self, tmp_path: Path, permissive_schema):
        layout_path = tmp_path / "App" / "ui" / "form" / "layouts" / "Page1.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {"layout": []}}', encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Page1.json"},
        )
        tool = VerifyChangesTool()
        result = await tool.run(tool.input_schema(), ctx)

        assert not result.is_error
        # Successful verify marks the file in verified_files.
        assert "App/ui/form/layouts/Page1.json" in ctx.extras["verified_files"]

    async def test_layout_is_validated_against_the_schema_of_the_app_version(self, tmp_path: Path, monkeypatch):
        layout_path = tmp_path / "App" / "ui" / "form" / "layouts" / "Page1.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {"layout": []}}', encoding="utf-8")
        requested_locations: list[str] = []

        def load_schema(schema_location: str) -> dict:
            requested_locations.append(schema_location)
            return {}

        monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", load_schema)
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Page1.json"},
        )
        ctx.app_version_profile = replace(V8_PROFILE, layout_schema_location="other-version/layout.schema.v1.json")

        await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert requested_locations == ["other-version/layout.schema.v1.json"]

    async def test_text_resource_validated_in_process(self, tmp_path: Path, monkeypatch):
        write_files(
            tmp_path,
            {
                f"App/config/texts/resource.{language}.json": json.dumps(
                    {"language": language, "resources": [{"id": resource_id, "value": "Tekst"}]}
                )
                for language, resource_id in (("nb", "title"), ("en", "subtitle"))
            },
        )
        requested_locations: list[str] = []

        def load_schema(schema_location: str) -> dict:
            requested_locations.append(schema_location)
            return {"$id": "text-resources"}

        monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", load_schema)
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/config/texts/resource.nb.json"},
        )
        ctx.app_version_profile = replace(
            V8_PROFILE, text_resources_schema_location="other-version/text-resources.schema.v1.json"
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error
        assert requested_locations == ["other-version/text-resources.schema.v1.json"]
        # The warning compares the file with the other languages in the repo, so it knows the file is `nb`.
        assert (
            "App/config/texts/resource.nb.json: warning: Missing translations from en: ['subtitle']"
            in json.loads(result.content)["notes"]
        )

    async def test_a_text_resource_schema_that_cannot_load_is_not_blamed_on_the_file(self, tmp_path: Path, monkeypatch):
        resource_path = tmp_path / "App" / "config" / "texts" / "resource.nb.json"
        resource_path.parent.mkdir(parents=True)
        resource_path.write_text('{"language": "nb", "resources": []}', encoding="utf-8")

        def fail_to_load(schema_location: str) -> dict:
            raise FileNotFoundError(schema_location)

        monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", fail_to_load)
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/config/texts/resource.nb.json"},
        )

        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        body = json.loads(result.content)
        assert result.is_error
        assert any(
            note.startswith("App/config/texts/resource.nb.json: could not load text resource schema")
            for note in body["notes"]
        )
        assert not any("resource validation failed" in note for note in body["notes"])
        assert not ctx.extras.get("verified_files")

    async def test_other_json_uses_basic_parse_check(self, tmp_path: Path):
        misc_path = tmp_path / "App" / "config" / "applicationmetadata.json"
        misc_path.parent.mkdir(parents=True)
        misc_path.write_text('{"id": "x"}', encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/config/applicationmetadata.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        assert not result.is_error
        body = json.loads(result.content)
        assert any("JSON parses" in note for note in body["notes"])

    async def test_non_json_file_is_noted_but_passes(self, tmp_path: Path):
        cs_path = tmp_path / "App" / "logic" / "InstantiationHandler.cs"
        cs_path.parent.mkdir(parents=True)
        cs_path.write_text("public class Foo {}", encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/logic/InstantiationHandler.cs"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        assert not result.is_error
        body = json.loads(result.content)
        assert any("no automated validator" in note for note in body["notes"])

    async def test_multipage_layout_without_navigation_fails(self, tmp_path: Path, permissive_schema):
        layouts_dir = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts_dir.mkdir(parents=True)
        settings = {"pages": {"order": ["Side1", "Side2"]}}
        (layouts_dir.parent / "Settings.json").write_text(json.dumps(settings), encoding="utf-8")
        page = {"data": {"layout": [{"id": "name-input", "type": "Input"}]}}
        (layouts_dir / "Side2.json").write_text(json.dumps(page), encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Side2.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert result.is_error
        body = json.loads(result.content)
        assert not body["passed"]
        assert any("NavigationButtons" in note for note in body["notes"])
        assert "verified_files" not in ctx.extras or not ctx.extras["verified_files"]

    async def test_multipage_layout_with_navigation_passes(self, tmp_path: Path, permissive_schema):
        layouts_dir = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts_dir.mkdir(parents=True)
        settings = {"pages": {"order": ["Side1", "Side2"]}}
        (layouts_dir.parent / "Settings.json").write_text(json.dumps(settings), encoding="utf-8")
        page = {
            "data": {
                "layout": [
                    {"id": "name-input", "type": "Input"},
                    {"id": "nav-buttons", "type": "NavigationButtons"},
                ]
            }
        }
        (layouts_dir / "Side2.json").write_text(json.dumps(page), encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Side2.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error

    async def test_single_page_layout_needs_no_navigation(self, tmp_path: Path, permissive_schema):
        layouts_dir = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts_dir.mkdir(parents=True)
        settings = {"pages": {"order": ["Side1"]}}
        (layouts_dir.parent / "Settings.json").write_text(json.dumps(settings), encoding="utf-8")
        page = {"data": {"layout": [{"id": "name-input", "type": "Input"}]}}
        (layouts_dir / "Side1.json").write_text(json.dumps(page), encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Side1.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error

    async def test_page_outside_order_array_needs_no_navigation(self, tmp_path: Path, permissive_schema):
        layouts_dir = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts_dir.mkdir(parents=True)
        settings = {"pages": {"order": ["Side1", "Side2"]}}
        (layouts_dir.parent / "Settings.json").write_text(json.dumps(settings), encoding="utf-8")
        page = {"data": {"layout": [{"id": "summary-text", "type": "Paragraph"}]}}
        (layouts_dir / "Hidden.json").write_text(json.dumps(page), encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Hidden.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error

    async def test_layout_validation_failure_marks_is_error(self, tmp_path: Path, monkeypatch):
        layout_path = tmp_path / "App" / "ui" / "layouts" / "P.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {}}', encoding="utf-8")

        monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", lambda url: {})
        monkeypatch.setattr(
            "agents.core.tools.verify_changes_tool.validate_layout_json",
            lambda layout, schema, referenced_schemas: {
                "status": "validation_failed",
                "message": "Layout validation failed with 1 error(s)",
                "validation_errors": [{"path": "$.data.layout", "message": "is required"}],
            },
        )
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/layouts/P.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert result.is_error
        assert "$.data.layout" in result.content
        # A failed validation must NOT mark anything verified.
        assert ctx.extras.get("verified_files", set()) == set()

    async def test_layout_failure_appends_altinn_layout_props_breadcrumb(self, tmp_path: Path, monkeypatch):
        layout_path = tmp_path / "App" / "ui" / "layouts" / "P.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {"layout": []}}', encoding="utf-8")

        monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", lambda url: {})
        monkeypatch.setattr(
            "agents.core.tools.verify_changes_tool.validate_layout_json",
            lambda layout, schema, referenced_schemas: {
                "status": "validation_failed",
                "message": "Layout validation failed with 1 error(s)",
                "validation_errors": [
                    {
                        "path": "$.data.layout[0]",
                        "message": "Property 'placeholder' is not allowed",
                        "component_type": "Input",
                    }
                ],
            },
        )
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/layouts/P.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert result.is_error
        assert "altinn_layout_props" in result.content
        assert "Input" in result.content

    async def test_schema_fetch_failure_fails_closed(self, tmp_path: Path, monkeypatch):
        """CDN down → the layout can't be validated → not verified."""
        layout_path = tmp_path / "App" / "ui" / "layouts" / "P.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {"layout": []}}', encoding="utf-8")

        def boom(url):
            raise RuntimeError("CDN unreachable")

        monkeypatch.setattr("agents.core.tools.verify_changes_tool.get_layout_schema", boom)
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/layouts/P.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        assert result.is_error
        assert ctx.extras.get("verified_files", set()) == set()

    async def test_invalid_json_in_basic_check_fails(self, tmp_path: Path):
        path = tmp_path / "broken.json"
        path.write_text("{not valid json", encoding="utf-8")
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"broken.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        assert result.is_error
        assert "invalid JSON" in result.content

    async def test_no_changed_files_returns_error(self):
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), _write_ctx())
        assert result.is_error
        assert "No changed files" in result.content


# ---------------------------------------------------------------------------
# verify_changes in a v9 app, against the in-repo v9 schema and a real git repo
# ---------------------------------------------------------------------------

V9_LAYOUT_PATH = "App/ui/Task_1/layouts/Side1.json"


def _v9_ctx(repo: Path, changed: set[str]) -> LoopContext:
    ctx = _write_ctx(repo_path=str(repo), changed=changed)
    ctx.app_version_profile = V9_PROFILE
    return ctx


def _write_v9_layout(repo: Path, component: dict[str, Any], encoding: str = "utf-8") -> None:
    layout_path = repo / V9_LAYOUT_PATH
    layout_path.parent.mkdir(parents=True, exist_ok=True)
    layout_path.write_text(json.dumps({"data": {"layout": [component]}}), encoding=encoding)


def _is_blank(field: str) -> list:
    return ["or", ["equals", ["dataModel", field], None], ["equals", ["dataModel", field], " "]]


def _heading(component_type: str = "Heading", **properties: Any) -> dict[str, Any]:
    return {
        "id": "title",
        "type": component_type,
        "size": "L",
        "textResourceBindings": {"title": "app.title"},
        **properties,
    }


async def _verify(ctx: LoopContext):
    return await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)


async def _verify_notes(
    repo: Path,
    changed: set[str],
    profile: AppVersionProfile = V8_PROFILE,
    *,
    start_commit: str | None = None,
):
    ctx = _write_ctx(repo_path=str(repo), changed=changed)
    ctx.app_version_profile = profile
    ctx.start_commit = start_commit
    result = await _verify(ctx)
    return result, json.loads(result.content)


def _start_session(repo: Path, files: dict[str, str]) -> str:
    """Commit the files as the app the session starts from, and return that commit."""
    create_committed_repo(repo, files)
    return git(repo, "rev-parse", "HEAD")


class TestVerifyChangesInAV9App:
    async def test_accepts_a_heading(self, tmp_path: Path):
        _write_v9_layout(tmp_path, _heading())

        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert not result.is_error

    async def test_rejects_a_header(self, tmp_path: Path):
        _write_v9_layout(tmp_path, _heading(component_type="Header"))

        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert result.is_error

    async def test_accepts_an_expression_function_only_v9_has(self, tmp_path: Path):
        count_children = ["count", ["dataModel", "children"]]
        _write_v9_layout(tmp_path, _heading(hidden=["equals", count_children, 0]))

        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert not result.is_error

    async def test_validates_a_nested_expression_within_seconds(self, tmp_path: Path):
        _write_v9_layout(tmp_path, _heading(hidden=["not", _is_blank("unit")]))

        started = time.perf_counter()
        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert time.perf_counter() - started < 5
        assert not result.is_error

    async def test_rejects_an_unknown_expression_function(self, tmp_path: Path):
        _write_v9_layout(tmp_path, _heading(hidden=["isBlank", ["dataModel", "unit"]]))

        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert result.is_error

    async def test_rejects_an_expression_function_with_too_many_arguments(self, tmp_path: Path):
        _write_v9_layout(tmp_path, _heading(hidden=["not", True, False]))

        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert result.is_error

    async def test_accepts_a_layout_that_starts_with_a_bom(self, tmp_path: Path):
        _write_v9_layout(tmp_path, _heading(), encoding="utf-8-sig")

        result = await _verify(_v9_ctx(tmp_path, {V9_LAYOUT_PATH}))

        assert not result.is_error

    async def test_rejects_a_new_rule_configuration_file(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/App.csproj": "v9"})
        write_files(repo, {"App/ui/Task_1/RuleConfiguration.json": "{}"})

        result = await _verify(_v9_ctx(repo, {"App/ui/Task_1/RuleConfiguration.json"}))

        assert result.is_error
        assert "`hidden` expression" in result.content

    async def test_accepts_an_edit_to_layout_sets_left_by_an_unfinished_upgrade(self, tmp_path: Path):
        repo = create_committed_repo(tmp_path, {"App/ui/layout-sets.json": '{"sets": []}'})
        write_files(repo, {"App/ui/layout-sets.json": '{"sets": [{"id": "form"}]}'})

        result = await _verify(_v9_ctx(repo, {"App/ui/layout-sets.json"}))

        assert not result.is_error

    async def test_a_v8_app_accepts_a_new_layout_sets_file(self, tmp_path: Path):
        write_files(tmp_path, {"App/ui/layout-sets.json": '{"sets": []}'})

        result = await _verify(_write_ctx(repo_path=str(tmp_path), changed={"App/ui/layout-sets.json"}))

        assert not result.is_error


# ---------------------------------------------------------------------------
# commit_session_branch
# ---------------------------------------------------------------------------


class TestCommitSessionBranch:
    async def test_commits_pushes_and_reuses_branch(self, monkeypatch):
        seen: dict[str, Any] = {}

        def fake_commit(message, repo_path, branch_name):
            seen.setdefault("commits", []).append({"message": message, "repo_path": repo_path, "branch": branch_name})
            return "abc12345"

        class FakeRepoManager:
            def push_branch(self, session_id, branch_name):
                seen.setdefault("pushes", []).append((session_id, branch_name))
                return True

        monkeypatch.setattr("agents.core.tools.commit_session_branch_tool.git_ops.commit", fake_commit)
        monkeypatch.setattr(
            "agents.services.git.repo_manager.get_repo_manager",
            lambda: FakeRepoManager(),
        )

        tool = CommitSessionBranchTool()
        ctx = _write_ctx(session_id="session-abcdef12345")
        args = tool.input_schema.model_validate({"message": "first commit"})
        result = await tool.run(args, ctx)

        assert not result.is_error
        # Cached branch name persists across the session.
        assert ctx.extras["session_branch"].startswith("assistant_")
        # The auto-commit safety net keys off this flag.
        assert ctx.extras.get("session_committed") is True

        # Second commit should reuse the cached branch.
        args2 = tool.input_schema.model_validate({"message": "second"})
        await tool.run(args2, ctx)
        branches = [c["branch"] for c in seen["commits"]]
        assert branches[0] == branches[1]
        assert seen["pushes"][0][0] == ctx.session_id

    async def test_empty_tree_returns_error(self, monkeypatch):
        monkeypatch.setattr(
            "agents.core.tools.commit_session_branch_tool.git_ops.commit",
            lambda m, r, b: None,
        )

        tool = CommitSessionBranchTool()
        result = await tool.run(tool.input_schema.model_validate({"message": "x"}), _write_ctx())
        assert result.is_error
        assert "Nothing to commit" in result.content

    async def test_push_failure_keeps_commit_but_flags_error(self, monkeypatch):
        monkeypatch.setattr(
            "agents.core.tools.commit_session_branch_tool.git_ops.commit",
            lambda m, r, b: "deadbeef",
        )

        class FakeRepoManager:
            def push_branch(self, session_id, branch_name):
                return False

        monkeypatch.setattr(
            "agents.services.git.repo_manager.get_repo_manager",
            lambda: FakeRepoManager(),
        )

        tool = CommitSessionBranchTool()
        result = await tool.run(tool.input_schema.model_validate({"message": "x"}), _write_ctx())
        assert result.is_error
        assert "deadbeef" in result.content
        assert "rejected" in result.content.lower()

    async def test_refuses_when_changed_files_have_not_been_verified(self, monkeypatch):
        # git_ops.commit must NOT be called when the gate fires.
        called: dict[str, Any] = {}

        def fake_commit(*args, **kwargs):
            called["commit"] = True
            return "abc12345"

        monkeypatch.setattr("agents.core.tools.commit_session_branch_tool.git_ops.commit", fake_commit)

        ctx = _write_ctx(
            changed={"App/ui/layouts/P.json"},
            verified=set(),  # nothing verified yet
        )
        result = await CommitSessionBranchTool().run(
            CommitSessionBranchTool.input_schema.model_validate({"message": "x"}),
            ctx,
        )
        assert result.is_error
        assert "have not been verified" in result.content
        assert "App/ui/layouts/P.json" in result.content
        assert "commit" not in called

    async def test_proceeds_when_all_changed_files_are_verified(self, monkeypatch):
        monkeypatch.setattr(
            "agents.core.tools.commit_session_branch_tool.git_ops.commit",
            lambda m, r, b: "abc12345",
        )

        class FakeRepoManager:
            def push_branch(self, session_id, branch_name):
                return True

        monkeypatch.setattr(
            "agents.services.git.repo_manager.get_repo_manager",
            lambda: FakeRepoManager(),
        )

        ctx = _write_ctx(
            changed={"App/ui/layouts/P.json"},
            verified={"App/ui/layouts/P.json"},
        )
        result = await CommitSessionBranchTool().run(
            CommitSessionBranchTool.input_schema.model_validate({"message": "feat: x"}),
            ctx,
        )
        assert not result.is_error
        assert "abc12345" in result.content

    async def test_push_raises_keeps_commit_but_flags_error(self, monkeypatch):
        monkeypatch.setattr(
            "agents.core.tools.commit_session_branch_tool.git_ops.commit",
            lambda m, r, b: "feedface",
        )

        class FakeRepoManager:
            def push_branch(self, session_id, branch_name):
                raise ConnectionError("gitea unreachable")

        monkeypatch.setattr(
            "agents.services.git.repo_manager.get_repo_manager",
            lambda: FakeRepoManager(),
        )

        tool = CommitSessionBranchTool()
        result = await tool.run(tool.input_schema.model_validate({"message": "x"}), _write_ctx())
        assert result.is_error
        assert "feedface" in result.content
        assert "gitea unreachable" in result.content


class TestTextKeysResolve:
    """A key with no entry renders as the key, and every file validates fine alone."""

    def _app(self, tmp_path: Path, bindings: dict, resources: list[str]) -> Path:
        layouts = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts.mkdir(parents=True)
        page = {"data": {"layout": [{"id": "submit", "type": "Button", "textResourceBindings": bindings}]}}
        (layouts / "Side1.json").write_text(json.dumps(page), encoding="utf-8")
        texts = tmp_path / "App" / "config" / "texts"
        texts.mkdir(parents=True)
        (texts / "resource.nb.json").write_text(
            json.dumps({"language": "nb", "resources": [{"id": i, "value": i} for i in resources]}),
            encoding="utf-8",
        )
        return layouts / "Side1.json"

    async def _verify(self, tmp_path: Path):
        ctx = _write_ctx(repo_path=str(tmp_path), changed={"App/ui/form/layouts/Side1.json"})
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        return result, json.loads(result.content), ctx

    async def test_a_missing_key_fails_verification(self, tmp_path: Path, permissive_schema):
        self._app(tmp_path, {"title": "app.button.submit"}, ["appName"])

        result, body, ctx = await self._verify(tmp_path)

        assert result.is_error
        assert not body["passed"]
        assert any("app.button.submit" in note for note in body["notes"])
        assert not ctx.extras.get("verified_files")

    async def test_a_resolved_key_passes(self, tmp_path: Path, permissive_schema):
        self._app(tmp_path, {"title": "app.button.submit"}, ["app.button.submit"])

        result, body, _ = await self._verify(tmp_path)

        assert not result.is_error
        assert body["passed"]

    async def test_a_layout_with_no_bindings_passes(self, tmp_path: Path, permissive_schema):
        self._app(tmp_path, {}, ["appName"])

        _, body, _ = await self._verify(tmp_path)

        assert body["passed"]

    async def test_an_app_with_no_text_files_is_not_blocked(self, tmp_path: Path, permissive_schema):
        """Nothing to resolve against is the layout validator's problem, not ours."""
        layouts = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts.mkdir(parents=True)
        page = {
            "data": {
                "layout": [{"id": "submit", "type": "Button", "textResourceBindings": {"title": "app.button.submit"}}]
            }
        }
        (layouts / "Side1.json").write_text(json.dumps(page), encoding="utf-8")

        _, body, _ = await self._verify(tmp_path)

        assert body["passed"]


class TestTextKeysResolveInEveryLanguage:
    """A key present in nb and missing in en renders as the key for English users,
    and removing it from a resource file leaves every layout still pointing at it."""

    EN = "App/config/texts/resource.en.json"

    SIDE1 = "App/ui/form/layouts/Side1.json"

    def _files(self, *, en_ids: list[str], button_ids: tuple[str, ...] = ("submit",)) -> dict[str, str]:
        buttons = [
            {"id": button_id, "type": "Button", "textResourceBindings": {"title": "app.button.submit"}}
            for button_id in button_ids
        ]
        files = {self.SIDE1: json.dumps({"data": {"layout": buttons}})}
        for language, ids in (("nb", ["app.button.submit"]), ("en", en_ids)):
            files[f"App/config/texts/resource.{language}.json"] = json.dumps(
                {"language": language, "resources": [{"id": i, "value": i} for i in ids]}
            )
        return files

    async def test_a_key_missing_from_one_language_fails(self, tmp_path: Path, permissive_schema):
        write_files(tmp_path, self._files(en_ids=["appName"]))

        result, body = await _verify_notes(tmp_path, {"App/ui/form/layouts/Side1.json"})

        assert result.is_error
        assert any("resource.en.json" in note for note in body["notes"])

    async def test_every_language_having_it_passes(self, tmp_path: Path, permissive_schema):
        write_files(tmp_path, self._files(en_ids=["app.button.submit"]))

        _, body = await _verify_notes(tmp_path, {"App/ui/form/layouts/Side1.json"})

        assert body["passed"]

    async def test_changing_a_resource_file_rechecks_untouched_layouts(self, tmp_path: Path, permissive_schema):
        """The layout is unchanged, so a per-file check would never look at it."""
        write_files(tmp_path, self._files(en_ids=["appName"]))

        result, body = await _verify_notes(tmp_path, {"App/config/texts/resource.en.json"})

        assert result.is_error
        assert any("Side1.json" in note for note in body["notes"])

    async def test_removing_a_key_that_a_layout_uses_fails(self, tmp_path: Path, permissive_schema):
        start_commit = _start_session(tmp_path, self._files(en_ids=["app.button.submit"]))
        write_files(tmp_path, self._files(en_ids=["appName"]))

        result, body = await _verify_notes(tmp_path, {self.EN}, start_commit=start_commit)

        assert result.is_error
        assert any("Side1.json" in note and "`app.button.submit`" in note for note in body["notes"])

    async def test_a_key_that_was_missing_when_the_session_started_is_old(self, tmp_path: Path, permissive_schema):
        start_commit = _start_session(tmp_path, self._files(en_ids=["appName"]))
        write_files(tmp_path, self._files(en_ids=["appName", "app.title"]))

        result, body = await _verify_notes(tmp_path, {self.EN}, start_commit=start_commit)

        assert not result.is_error, body["notes"]
        assert not any("has no entry" in note for note in body["notes"])
        assert body["old_errors"] == [
            "App/ui/form/layouts/Side1.json: submit: `title` uses text key `app.button.submit`, which has no entry "
            "in `App/config/texts/resource.en.json`, so the page shows the key instead of the text in that language."
        ]

    async def test_a_new_component_fails_for_a_key_its_page_was_missing_before(self, tmp_path: Path, permissive_schema):
        """The page already showed the key on one button. A second button that shows it is the session's error."""
        start_commit = _start_session(tmp_path, self._files(en_ids=["appName"]))
        write_files(tmp_path, self._files(en_ids=["appName"], button_ids=("submit", "send")))

        result, body = await _verify_notes(tmp_path, {self.SIDE1}, start_commit=start_commit)

        assert result.is_error
        assert [note for note in body["notes"] if "app.button.submit" in note] == [
            "App/ui/form/layouts/Side1.json: send: `title` uses text key `app.button.submit`, which has no entry "
            "in `App/config/texts/resource.en.json`, so the page shows the key instead of the text in that language."
        ]
        assert len(body["old_errors"]) == 1

    async def test_a_page_the_session_added_fails_for_a_key_that_was_missing_before(
        self, tmp_path: Path, permissive_schema
    ):
        """Side1 missed the key at the start too, but Side2 is new, so its missing key is new."""
        files = self._files(en_ids=["appName"])
        start_commit = _start_session(tmp_path, files)
        side2 = "App/ui/form/layouts/Side2.json"
        write_files(tmp_path, {side2: files[self.SIDE1]})

        result, body = await _verify_notes(tmp_path, {side2}, start_commit=start_commit)

        assert result.is_error
        assert any(note.startswith(f"{side2}: submit: `title` uses text key") for note in body["notes"])


class TestTextResourceErrorsBeforeTheSession:
    """Errors a text resource file had when the session started must not block a correct change to it."""

    RESOURCE_PATH = "App/config/texts/resource.nb.json"
    # The v9 profile reads the text resource schema from disk.
    PROFILE = V9_PROFILE
    OLD_ERROR = {
        "id": "greeting",
        "value": "Hei {0}",
        "variables": [{"key": "Person Navn", "dataSource": "dataModel.default"}],
    }
    TITLE = {"id": "title", "value": "Tittel"}

    def _resource_file(self, *resources: dict[str, Any]) -> dict[str, str]:
        return {self.RESOURCE_PATH: json.dumps({"language": "nb", "resources": list(resources)})}

    async def _verify(self, repo: Path, start_commit: str | None):
        return await _verify_notes(repo, {self.RESOURCE_PATH}, self.PROFILE, start_commit=start_commit)

    async def test_a_correct_change_passes_despite_an_old_error(self, tmp_path: Path):
        start_commit = _start_session(tmp_path, self._resource_file(self.OLD_ERROR))
        # The new text goes above the old error, so the error moves from `resources.0` to `resources.1`.
        write_files(tmp_path, self._resource_file(self.TITLE, self.OLD_ERROR))

        result, body = await self._verify(tmp_path, start_commit)

        assert not result.is_error, body["notes"]
        assert not any("Person Navn" in note for note in body["notes"])
        assert len(body["old_errors"]) == 1
        assert body["old_errors"][0].startswith(f"{self.RESOURCE_PATH}: greeting: variables.0.key: 'Person Navn'")

    async def test_an_error_in_the_change_fails(self, tmp_path: Path):
        start_commit = _start_session(tmp_path, self._resource_file(self.OLD_ERROR))
        new_error = {**self.OLD_ERROR, "id": "farewell", "variables": [{"key": "Ny Nøkkel", "dataSource": "x"}]}
        write_files(tmp_path, self._resource_file(self.OLD_ERROR, new_error))

        result, body = await self._verify(tmp_path, start_commit)

        assert result.is_error
        assert any("farewell: variables.0" in note for note in body["notes"])
        assert not any("greeting" in note for note in body["notes"])
        assert any("greeting" in error for error in body["old_errors"])

    async def test_an_error_the_session_committed_still_fails(self, tmp_path: Path):
        """After the session's own commit, HEAD has the error too. The start commit does not."""
        start_commit = _start_session(tmp_path, self._resource_file(self.TITLE))
        write_files(tmp_path, self._resource_file(self.TITLE, self.OLD_ERROR))
        commit_all(tmp_path, "the session's commit")

        result, body = await self._verify(tmp_path, start_commit)

        assert result.is_error
        assert body["old_errors"] == []

    async def test_a_file_that_does_not_parse_fails_with_the_parse_error_it_had_at_the_start(self, tmp_path: Path):
        """The parser stops where it stopped at the start, so the session's broken text after that goes unchecked."""
        start_commit = _start_session(tmp_path, {self.RESOURCE_PATH: '{"language": "nb" "resources": []}'})
        broken_text = '{"language": "nb" "resources": [{"id": "title", "value": 42}]}'
        write_files(tmp_path, {self.RESOURCE_PATH: broken_text})

        result, body = await self._verify(tmp_path, start_commit)

        assert result.is_error
        assert body["notes"][0].startswith(f"{self.RESOURCE_PATH}: invalid JSON — Expecting ',' delimiter")
        assert body["old_errors"] == []

    async def test_a_file_the_session_added_has_only_new_errors(self, tmp_path: Path):
        start_commit = _start_session(tmp_path, self._resource_file(self.OLD_ERROR))
        en_path = "App/config/texts/resource.en.json"
        write_files(tmp_path, {en_path: json.dumps({"language": "en", "resources": [self.OLD_ERROR]})})

        result, _ = await _verify_notes(tmp_path, {en_path}, self.PROFILE, start_commit=start_commit)

        assert result.is_error

    async def test_every_error_fails_without_a_start_commit(self, tmp_path: Path):
        create_committed_repo(tmp_path, self._resource_file(self.OLD_ERROR))
        write_files(tmp_path, self._resource_file(self.TITLE, self.OLD_ERROR))

        result, _ = await self._verify(tmp_path, start_commit=None)

        assert result.is_error
