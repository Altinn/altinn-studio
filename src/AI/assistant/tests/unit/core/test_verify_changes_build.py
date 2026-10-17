"""Tests for the build in `verify_changes`.  When a C# or project file changed, the tool builds the app in the
assistant runner.  `_FakeRunner` returns the build result in place of the runner."""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from agents.core import LoopContext, VerifyChangesTool
from agents.core import runner as runner_module
from agents.core.runner import RunnerUnavailable, RunResult

from .git_repo import create_committed_repo

_APP_FILES = {
    "App/App.csproj": "<Project />",
    "App/logic/Calculator.cs": "class Calculator {}",
    "App/Directory.Build.props": "<Project />",
    "App/build.targets": "<Project />",
    "nuget.config": "<configuration />",
    "global.json": "{}",
    "App/config/applicationmetadata.json": "{}",
}
_COMPILER_ERROR = "App/logic/Calculator.cs(1,24): error CS1002: ; expected [App/App.csproj]"


@dataclass
class _FakeRunner:
    result: RunResult = field(default_factory=lambda: RunResult(exit_code=0, stdout="Build succeeded.", stderr=""))
    unavailable: RunnerUnavailable | None = None
    waits: bool = False
    builds: list[str] = field(default_factory=list)

    async def upgrade(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        raise AssertionError("verify_changes does not upgrade the app")

    async def build(self, repo_path: str, report_wait: Callable[[], None]) -> RunResult:
        if self.unavailable is not None:
            raise self.unavailable
        if self.waits:
            report_wait()
        self.builds.append(repo_path)
        return self.result


@pytest.fixture(autouse=True)
def runner(monkeypatch) -> _FakeRunner:
    fake = _FakeRunner()
    monkeypatch.setattr(runner_module, "create_runner", lambda: fake)
    return fake


def _ctx(repo: Path, changed: set[str], statuses: list[str] | None = None) -> LoopContext:
    ctx = LoopContext(session_id="s1", repo_path=str(repo), allow_app_changes=True)
    ctx.extras["changed_files"] = set(changed)
    if statuses is not None:
        ctx.report_status = statuses.append
    return ctx


async def _verify(ctx: LoopContext) -> tuple[bool, list[str]]:
    tool = VerifyChangesTool()
    result = await tool.run(tool.input_schema.model_validate({}), ctx)
    body = json.loads(result.content)
    assert result.is_error == (not body["passed"])
    return body["passed"], body["notes"]


class TestBuildInVerifyChanges:
    @pytest.mark.parametrize(
        "changed_file",
        [
            "App/logic/Calculator.cs",
            "App/App.csproj",
            "App/Directory.Build.props",
            "App/build.targets",
            "nuget.config",
            "global.json",
        ],
    )
    async def test_builds_the_app_when_a_build_input_changed(
        self, runner: _FakeRunner, tmp_path: Path, changed_file: str
    ):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        ctx = _ctx(repo, {changed_file})

        passed, notes = await _verify(ctx)

        assert passed
        assert "build: passed" in notes
        assert runner.builds == [str(repo)]
        assert ctx.extras["verified_files"] == {changed_file}

    async def test_does_not_build_when_no_build_input_changed(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _APP_FILES)

        passed, notes = await _verify(_ctx(repo, {"App/config/applicationmetadata.json"}))

        assert passed
        assert runner.builds == []
        assert not any(note.startswith("build:") for note in notes)

    async def test_lists_each_compiler_error_once_with_paths_in_the_app(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        job_error = "/job/app/App/logic/Calculator.cs(1,24): error CS1002: ; expected [/job/app/App/App.csproj]"
        runner.result = RunResult(exit_code=1, stdout=f"{job_error}\nBuild FAILED.\n    {job_error}\n", stderr="")
        ctx = _ctx(repo, {"App/logic/Calculator.cs"})

        passed, notes = await _verify(ctx)

        assert not passed
        assert notes[-2:] == ["build: failed", _COMPILER_ERROR]
        assert "verified_files" not in ctx.extras

    async def test_shows_the_end_of_the_output_when_the_build_fails_without_compiler_errors(
        self, runner: _FakeRunner, tmp_path: Path
    ):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        runner.result = RunResult(exit_code=1, stdout="", stderr="MSBUILD : The project file could not be loaded.")

        passed, notes = await _verify(_ctx(repo, {"App/App.csproj"}))

        assert not passed
        assert notes[-1] == "MSBUILD : The project file could not be loaded."

    async def test_fails_when_the_build_does_not_finish_in_time(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        runner.result = RunResult(exit_code=None, stdout="", stderr="")

        passed, notes = await _verify(_ctx(repo, {"App/logic/Calculator.cs"}))

        assert not passed
        assert "build: did not finish in 5 minutes" in notes

    async def test_passes_with_a_note_when_the_runner_is_unavailable(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        runner.unavailable = RunnerUnavailable("the assistant runner did not answer")

        passed, notes = await _verify(_ctx(repo, {"App/logic/Calculator.cs"}))

        assert passed
        assert "build: not checked, because the assistant runner did not answer" in notes

    async def test_passes_with_a_note_when_the_deployment_has_no_runner(self, monkeypatch, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        monkeypatch.setattr(runner_module, "create_runner", lambda: None)

        passed, notes = await _verify(_ctx(repo, {"App/logic/Calculator.cs"}))

        assert passed
        assert "build: not checked, because this deployment has no assistant runner" in notes

    async def test_tells_the_user_when_the_build_waits_for_a_free_runner(self, runner: _FakeRunner, tmp_path: Path):
        repo = create_committed_repo(tmp_path, _APP_FILES)
        runner.waits = True
        statuses: list[str] = []

        await _verify(_ctx(repo, {"App/logic/Calculator.cs"}, statuses))

        assert statuses == ["Står i kø for bygg"]
