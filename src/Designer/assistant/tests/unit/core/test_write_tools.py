"""Tests for the surviving write tools: verify_changes, commit_session_branch.

(The `propose_patch` and `rollback` tools have been removed in favor of
the CC-style file surface — see `test_file_tools.py`.)

External services (git_ops, repo_manager, the layout-schema CDN fetch)
are monkeypatched or stubbed — nothing in here touches a real repo or
the network.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from agents.core import (
    CommitSessionBranchTool,
    LoopContext,
    VerifyChangesTool,
)


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
    """Layout schema fetch → empty schema (accepts any layout)."""
    monkeypatch.setattr(
        "agents.core.tools.verify_tool.get_layout_schema", lambda url: {}
    )


# ---------------------------------------------------------------------------
# Permission gating (the surviving write tools should still respect the flag)
# ---------------------------------------------------------------------------


class TestPermission:
    @pytest.mark.parametrize(
        "tool_factory,args",
        [
            (VerifyChangesTool, {}),
            (CommitSessionBranchTool, {"message": "msg"}),
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

    async def test_text_resource_validated_in_process(self, tmp_path: Path, monkeypatch):
        resource_path = tmp_path / "App" / "config" / "texts" / "resource.nb.json"
        resource_path.parent.mkdir(parents=True)
        resource_path.write_text('{"resources": []}', encoding="utf-8")

        seen: dict[str, Any] = {}

        def fake_resource_validator(*, user_goal, resource_json, language, repo_path):
            seen.update(language=language, repo_path=repo_path)
            return {"valid": True, "errors": [], "warnings": []}

        monkeypatch.setattr(
            "agents.core.tools.verify_tool.resource_validator_tool",
            fake_resource_validator,
        )

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/config/texts/resource.nb.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error
        # Language was inferred from the filename.
        assert seen["language"] == "nb"
        assert seen["repo_path"] == str(tmp_path)

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

    async def test_multipage_layout_without_navigation_fails(
        self, tmp_path: Path, permissive_schema
    ):
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

    async def test_multipage_layout_with_navigation_passes(
        self, tmp_path: Path, permissive_schema
    ):
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

    async def test_single_page_layout_needs_no_navigation(
        self, tmp_path: Path, permissive_schema
    ):
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

    async def test_page_outside_order_array_needs_no_navigation(
        self, tmp_path: Path, permissive_schema
    ):
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

        monkeypatch.setattr(
            "agents.core.tools.verify_tool.get_layout_schema", lambda url: {}
        )
        monkeypatch.setattr(
            "agents.core.tools.verify_tool.validate_layout_json",
            lambda layout, schema: {
                "status": "validation_failed",
                "message": "Layout validation failed with 1 error(s)",
                "validation_errors": [
                    {"path": "$.data.layout", "message": "is required"}
                ],
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

    async def test_layout_failure_appends_altinn_layout_props_breadcrumb(
        self, tmp_path: Path, monkeypatch
    ):
        layout_path = tmp_path / "App" / "ui" / "layouts" / "P.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {"layout": []}}', encoding="utf-8")

        monkeypatch.setattr(
            "agents.core.tools.verify_tool.get_layout_schema", lambda url: {}
        )
        monkeypatch.setattr(
            "agents.core.tools.verify_tool.validate_layout_json",
            lambda layout, schema: {
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

        monkeypatch.setattr(
            "agents.core.tools.verify_tool.get_layout_schema", boom
        )
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
        result = await VerifyChangesTool().run(
            VerifyChangesTool.input_schema(), _write_ctx()
        )
        assert result.is_error
        assert "No changed files" in result.content


# ---------------------------------------------------------------------------
# commit_session_branch
# ---------------------------------------------------------------------------


class TestCommitSessionBranch:
    async def test_commits_pushes_and_reuses_branch(self, monkeypatch):
        seen: dict[str, Any] = {}

        def fake_commit(message, repo_path, branch_name):
            seen.setdefault("commits", []).append(
                {"message": message, "repo_path": repo_path, "branch": branch_name}
            )
            return "abc12345"

        class FakeRepoManager:
            def push_branch(self, session_id, branch_name):
                seen.setdefault("pushes", []).append((session_id, branch_name))
                return True

        monkeypatch.setattr("agents.core.tools.git_tool.git_ops.commit", fake_commit)
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
        assert ctx.extras["session_branch"].startswith("altinity_session_")
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
            "agents.core.tools.git_tool.git_ops.commit",
            lambda m, r, b: None,
        )

        tool = CommitSessionBranchTool()
        result = await tool.run(
            tool.input_schema.model_validate({"message": "x"}), _write_ctx()
        )
        assert result.is_error
        assert "Nothing to commit" in result.content

    async def test_push_failure_keeps_commit_but_flags_error(self, monkeypatch):
        monkeypatch.setattr(
            "agents.core.tools.git_tool.git_ops.commit",
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
        result = await tool.run(
            tool.input_schema.model_validate({"message": "x"}), _write_ctx()
        )
        assert result.is_error
        assert "deadbeef" in result.content
        assert "rejected" in result.content.lower()

    async def test_refuses_when_changed_files_have_not_been_verified(self, monkeypatch):
        # git_ops.commit must NOT be called when the gate fires.
        called: dict[str, Any] = {}

        def fake_commit(*args, **kwargs):
            called["commit"] = True
            return "abc12345"

        monkeypatch.setattr("agents.core.tools.git_tool.git_ops.commit", fake_commit)

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
            "agents.core.tools.git_tool.git_ops.commit",
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
            "agents.core.tools.git_tool.git_ops.commit",
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
        result = await tool.run(
            tool.input_schema.model_validate({"message": "x"}), _write_ctx()
        )
        assert result.is_error
        assert "feedface" in result.content
        assert "gitea unreachable" in result.content
