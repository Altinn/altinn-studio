"""Tests for the surviving write tools: verify_changes, commit_session_branch.

(The `propose_patch` and `rollback` tools have been removed in favor of
the CC-style file surface — see `test_file_tools.py`.)

External services (git_ops, repo_manager, the layout-schema CDN fetch)
are monkeypatched or stubbed — nothing in here touches the network.  The
v9 tests read the in-repo v9 schema and use real git repos in tmp_path.
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import time
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE
from agents.core import (
    CommitSessionBranchTool,
    LoopContext,
    VerifyChangesTool,
)
from agents.core.tools import _dotnet_queue, verify_tool

from .git_repo import create_committed_repo, write_files

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
    monkeypatch.setattr("agents.core.tools.verify_tool.get_layout_schema", lambda url: {})


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

    async def test_layout_is_validated_against_the_schema_of_the_app_version(self, tmp_path: Path, monkeypatch):
        layout_path = tmp_path / "App" / "ui" / "form" / "layouts" / "Page1.json"
        layout_path.parent.mkdir(parents=True)
        layout_path.write_text('{"data": {"layout": []}}', encoding="utf-8")
        requested_locations: list[str] = []

        def load_schema(schema_location: str) -> dict:
            requested_locations.append(schema_location)
            return {}

        monkeypatch.setattr("agents.core.tools.verify_tool.get_layout_schema", load_schema)
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/form/layouts/Page1.json"},
        )
        ctx.app_version_profile = replace(V8_PROFILE, layout_schema_location="other-version/layout.schema.v1.json")

        await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert requested_locations == ["other-version/layout.schema.v1.json"]

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
        view_path = tmp_path / "App" / "views" / "Home" / "Index.cshtml"
        view_path.parent.mkdir(parents=True)
        view_path.write_text("<html></html>", encoding="utf-8")

        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/views/Home/Index.cshtml"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        assert not result.is_error
        body = json.loads(result.content)
        assert any("no automated validator" in note for note in body["notes"])

    async def test_deleted_file_is_noted_but_passes(self, tmp_path: Path):
        ctx = _write_ctx(
            repo_path=str(tmp_path),
            changed={"App/ui/layout-sets.json"},
        )
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        assert not result.is_error
        body = json.loads(result.content)
        assert any("deleted" in note for note in body["notes"])

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

        monkeypatch.setattr("agents.core.tools.verify_tool.get_layout_schema", lambda url: {})
        monkeypatch.setattr(
            "agents.core.tools.verify_tool.validate_layout_json",
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

        monkeypatch.setattr("agents.core.tools.verify_tool.get_layout_schema", lambda url: {})
        monkeypatch.setattr(
            "agents.core.tools.verify_tool.validate_layout_json",
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

        monkeypatch.setattr("agents.core.tools.verify_tool.get_layout_schema", boom)
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


_PROGRAM_FILE = "App/Program.cs"
_COMPILER_ERROR = "App/Program.cs(3,5): error CS0246: The type or namespace name 'IText' could not be found"


def _app_with_program(repo: Path) -> None:
    (repo / "App").mkdir(parents=True)
    (repo / "App" / "App.csproj").write_text("<Project />", encoding="utf-8")
    (repo / _PROGRAM_FILE).write_text("var app = 1;", encoding="utf-8")


def _build_output(repo: Path, *lines: str) -> str:
    """dotnet prints absolute paths and the project, and it prints each error twice."""
    project = f" [{repo}/App/App.csproj]"
    return "\n".join(f"{repo}/{line}{project}" for line in (*lines, *lines))


def _stub_build(monkeypatch, *, returncode: int = 0, output: str = "", error: Exception | None = None) -> list[str]:
    built: list[str] = []

    async def fake_build(repo_path: str) -> subprocess.CompletedProcess[str]:
        built.append(repo_path)
        if error is not None:
            raise error
        return subprocess.CompletedProcess([], returncode, output, "")

    monkeypatch.setattr("agents.core.tools.verify_tool._run_dotnet_build", fake_build)
    return built


class TestVerifyChangesBuildsTheApp:
    async def test_a_csharp_change_passes_when_the_build_passes(self, tmp_path: Path, monkeypatch):
        _app_with_program(tmp_path)
        built = _stub_build(monkeypatch)
        ctx = _write_ctx(repo_path=str(tmp_path), changed={_PROGRAM_FILE})

        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error
        assert built == [str(tmp_path)]
        assert ctx.extras["verified_files"] == {_PROGRAM_FILE}
        assert "App/App.csproj: dotnet build passed" in json.loads(result.content)["notes"]

    async def test_a_compiler_error_fails_with_each_error_once(self, tmp_path: Path, monkeypatch):
        _app_with_program(tmp_path)
        _stub_build(monkeypatch, returncode=1, output=_build_output(tmp_path, _COMPILER_ERROR))
        ctx = _write_ctx(repo_path=str(tmp_path), changed={_PROGRAM_FILE})

        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert result.is_error
        notes = json.loads(result.content)["notes"]
        assert "App/App.csproj: dotnet build failed (1 error(s))" in notes
        assert f"  - {_COMPILER_ERROR}" in notes
        assert "verified_files" not in ctx.extras

    async def test_a_failure_with_no_error_lines_shows_the_end_of_the_output(self, tmp_path: Path, monkeypatch):
        _app_with_program(tmp_path)
        _stub_build(monkeypatch, returncode=137, output="Restoring packages\nKilled")
        ctx = _write_ctx(repo_path=str(tmp_path), changed={_PROGRAM_FILE})

        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert result.is_error
        notes = json.loads(result.content)["notes"]
        assert "App/App.csproj: dotnet build stopped with exit code 137" in notes
        assert "Killed" in notes

    async def test_a_project_file_change_runs_the_build(self, tmp_path: Path, monkeypatch):
        _app_with_program(tmp_path)
        built = _stub_build(monkeypatch)
        ctx = _write_ctx(repo_path=str(tmp_path), changed={"App/App.csproj"})

        await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert built == [str(tmp_path)]

    async def test_a_json_change_does_not_run_the_build(self, tmp_path: Path, monkeypatch):
        _app_with_program(tmp_path)
        (tmp_path / "App" / "config").mkdir()
        (tmp_path / "App" / "config" / "applicationmetadata.json").write_text("{}", encoding="utf-8")
        built = _stub_build(monkeypatch)
        ctx = _write_ctx(repo_path=str(tmp_path), changed={"App/config/applicationmetadata.json"})

        await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert built == []

    @pytest.mark.parametrize(
        ("error", "note"),
        [
            (FileNotFoundError("dotnet"), "dotnet is not installed, so the C# changes were not built"),
            (TimeoutError(), "dotnet build did not finish in 300 seconds, so the C# changes were not built"),
        ],
        ids=["no-dotnet", "timeout"],
    )
    async def test_a_build_that_cannot_run_passes_with_a_note(self, tmp_path: Path, monkeypatch, error, note):
        _app_with_program(tmp_path)
        _stub_build(monkeypatch, error=error)
        ctx = _write_ctx(repo_path=str(tmp_path), changed={_PROGRAM_FILE})

        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error
        assert note in json.loads(result.content)["notes"]

    async def test_an_app_with_no_project_file_is_not_built(self, tmp_path: Path, monkeypatch):
        (tmp_path / "App").mkdir()
        (tmp_path / _PROGRAM_FILE).write_text("var app = 1;", encoding="utf-8")
        built = _stub_build(monkeypatch)
        ctx = _write_ctx(repo_path=str(tmp_path), changed={_PROGRAM_FILE})

        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)

        assert not result.is_error
        assert built == []
        assert "App/App.csproj not found, so the C# changes were not built" in json.loads(result.content)["notes"]

    async def test_the_build_waits_for_a_running_dotnet_job(self, tmp_path: Path, monkeypatch):
        """The v9 upgrade and the build share one queue, so the pod never runs two of them at the same time."""
        _app_with_program(tmp_path)
        built = _stub_build(monkeypatch)
        statuses: list[str] = []
        ctx = _write_ctx(repo_path=str(tmp_path), changed={_PROGRAM_FILE})
        ctx.report_status = statuses.append
        release = asyncio.Event()

        async def run_other_job() -> None:
            async with _dotnet_queue.dotnet_job_queue.turn(lambda _: None, waiting_status="", running_status=""):
                await release.wait()

        other_job = asyncio.create_task(run_other_job())
        await asyncio.sleep(0)
        verify = asyncio.create_task(VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx))
        await asyncio.sleep(0)

        assert built == []
        assert statuses == ["Står i kø for bygging av appen (1 foran)"]

        release.set()
        await asyncio.gather(other_job, verify)

        assert built == [str(tmp_path)]
        assert statuses == ["Står i kø for bygging av appen (1 foran)", "Bygger appen"]


_SHORT_BUILD_TIMEOUT_SECONDS = 0.5
_MAX_STOP_SECONDS = 5.0
_PROCESS_EXIT_WAIT_SECONDS = 2.0
_PROCESS_EXIT_POLL_SECONDS = 0.05


def _is_process_alive(pid: int) -> bool:
    """A zombie has stopped, but it stays in /proc until its parent collects it."""
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
    except FileNotFoundError:
        return False
    return stat.rsplit(")", 1)[1].split()[0] != "Z"


async def _wait_for_process_exit(pid: int) -> bool:
    deadline = time.monotonic() + _PROCESS_EXIT_WAIT_SECONDS
    while _is_process_alive(pid):
        if time.monotonic() > deadline:
            return False
        await asyncio.sleep(_PROCESS_EXIT_POLL_SECONDS)
    return True


class TestTheBuildProcess:
    async def test_a_build_that_times_out_stops_with_its_child_processes(self, tmp_path: Path, monkeypatch):
        bin_dir = tmp_path / "bin"
        bin_dir.mkdir()
        child_pid_file = tmp_path / "child.pid"
        fake_dotnet = bin_dir / "dotnet"
        fake_dotnet.write_text(f"#!/bin/sh\nsleep 30 &\necho $! > {child_pid_file}\nwait\n", encoding="utf-8")
        fake_dotnet.chmod(0o755)
        monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ['PATH']}")
        monkeypatch.setattr(verify_tool, "_BUILD_TIMEOUT_SECONDS", _SHORT_BUILD_TIMEOUT_SECONDS)

        started = time.monotonic()
        with pytest.raises(TimeoutError):
            await verify_tool._run_dotnet_build(str(tmp_path))

        # A child that is still alive keeps the output pipe open, and the call then waits for it.
        assert time.monotonic() - started < _MAX_STOP_SECONDS
        assert await _wait_for_process_exit(int(child_pid_file.read_text()))


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
            "agents.core.tools.git_tool.git_ops.commit",
            lambda m, r, b: None,
        )

        tool = CommitSessionBranchTool()
        result = await tool.run(tool.input_schema.model_validate({"message": "x"}), _write_ctx())
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

    def _app(self, tmp_path: Path, *, en_has_key: bool):
        layouts = tmp_path / "App" / "ui" / "form" / "layouts"
        layouts.mkdir(parents=True)
        page = {
            "data": {
                "layout": [
                    {
                        "id": "submit",
                        "type": "Button",
                        "textResourceBindings": {"title": "app.button.submit"},
                    }
                ]
            }
        }
        (layouts / "Side1.json").write_text(json.dumps(page), encoding="utf-8")
        texts = tmp_path / "App" / "config" / "texts"
        texts.mkdir(parents=True)
        for language, has in (("nb", True), ("en", en_has_key)):
            ids = ["app.button.submit"] if has else ["appName"]
            (texts / f"resource.{language}.json").write_text(
                json.dumps({"language": language, "resources": [{"id": i, "value": i} for i in ids]}),
                encoding="utf-8",
            )

    async def _verify(self, tmp_path: Path, changed: set[str]):
        ctx = _write_ctx(repo_path=str(tmp_path), changed=changed)
        result = await VerifyChangesTool().run(VerifyChangesTool.input_schema(), ctx)
        return result, json.loads(result.content)

    async def test_a_key_missing_from_one_language_fails(self, tmp_path: Path, permissive_schema):
        self._app(tmp_path, en_has_key=False)

        result, body = await self._verify(tmp_path, {"App/ui/form/layouts/Side1.json"})

        assert result.is_error
        assert any("resource.en.json" in note for note in body["notes"])

    async def test_every_language_having_it_passes(self, tmp_path: Path, permissive_schema):
        self._app(tmp_path, en_has_key=True)

        _, body = await self._verify(tmp_path, {"App/ui/form/layouts/Side1.json"})

        assert body["passed"]

    async def test_changing_a_resource_file_rechecks_untouched_layouts(self, tmp_path: Path, permissive_schema):
        """The layout is unchanged, so a per-file check would never look at it."""
        self._app(tmp_path, en_has_key=False)

        result, body = await self._verify(tmp_path, {"App/config/texts/resource.en.json"})

        assert result.is_error
        assert any("Side1.json" in note for note in body["notes"])
