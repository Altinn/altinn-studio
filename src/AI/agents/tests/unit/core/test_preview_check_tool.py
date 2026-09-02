"""Tests for `preview_render_check`: gating, precondition errors, and
result shaping. The browser engine itself is monkeypatched; the real
flow is exercised manually against the local stack."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from agents.core import LoopContext, PreviewRenderCheckTool
from agents.services.preview.render_check import PageRenderResult, PreviewCheckUnavailable
from shared.config.base_config import BaseConfig

ENGINE_PATH = "agents.core.tools.preview_check_tool.render_check"


@pytest.fixture(autouse=True)
def _enabled_deployment(monkeypatch):
    monkeypatch.setattr(BaseConfig, "PREVIEW_CHECK_ENABLED", True)


def _ctx(
    tmp_path: Path,
    *,
    allow_app_changes: bool = True,
    committed: bool = True,
    app_name: str | None = "test-app",
    page_order: list[str] | None = None,
) -> LoopContext:
    if page_order is None:
        page_order = ["Side1", "Side2"]
    settings_dir = tmp_path / "App" / "ui" / "form"
    settings_dir.mkdir(parents=True, exist_ok=True)
    (settings_dir / "Settings.json").write_text(
        json.dumps({"pages": {"order": page_order}}), encoding="utf-8"
    )

    ctx = LoopContext(
        session_id="session-abcdef12",
        repo_path=str(tmp_path),
        allow_app_changes=allow_app_changes,
        org="ttd",
    )
    if committed:
        ctx.extras["session_committed"] = True
        ctx.extras["session_branch"] = "altinity_session_abcdef12"
    if app_name:
        ctx.extras["app_name"] = app_name
    return ctx


def _args():
    return PreviewRenderCheckTool.input_schema()


class TestPermissionGating:
    async def test_denied_in_read_only_mode(self, tmp_path):
        tool = PreviewRenderCheckTool()
        result = await tool.check_permission(_args(), _ctx(tmp_path, allow_app_changes=False))
        assert result.allowed is False
        assert result.escalatable is True


class TestPreconditions:
    async def test_disabled_deployment_says_skip(self, tmp_path, monkeypatch):
        monkeypatch.setattr(BaseConfig, "PREVIEW_CHECK_ENABLED", False)
        result = await PreviewRenderCheckTool().run(_args(), _ctx(tmp_path))
        assert result.is_error
        assert "do NOT retry" in result.content
        assert result.metadata["unavailable"] is True

    async def test_requires_commit_first(self, tmp_path):
        result = await PreviewRenderCheckTool().run(_args(), _ctx(tmp_path, committed=False))
        assert result.is_error
        assert "commit_session_branch" in result.content

    async def test_no_page_order_is_actionable(self, tmp_path):
        ctx = _ctx(tmp_path, page_order=[])
        result = await PreviewRenderCheckTool().run(_args(), ctx)
        assert result.is_error
        assert "pages.order" in result.content


class TestResults:
    async def test_all_pages_rendering_passes(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            ENGINE_PATH,
            lambda **kwargs: [PageRenderResult("Side1", True), PageRenderResult("Side2", True)],
        )
        result = await PreviewRenderCheckTool().run(_args(), _ctx(tmp_path))
        assert not result.is_error
        assert json.loads(result.content)["passed"] is True

    async def test_failing_page_is_error_with_detail(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            ENGINE_PATH,
            lambda **kwargs: [
                PageRenderResult("Side1", True),
                PageRenderResult("Side2", False, "error page: 500"),
            ],
        )
        result = await PreviewRenderCheckTool().run(_args(), _ctx(tmp_path))
        assert result.is_error
        body = json.loads(result.content.split("\n\n")[0])
        assert body["passed"] is False
        assert body["pages"][1] == {"page": "Side2", "rendered": False, "detail": "error page: 500"}
        assert "preview_render_check` again" in result.content

    async def test_unavailable_engine_says_skip(self, tmp_path, monkeypatch):
        def raise_unavailable(**kwargs):
            raise PreviewCheckUnavailable("playwright is not installed")

        monkeypatch.setattr(ENGINE_PATH, raise_unavailable)
        result = await PreviewRenderCheckTool().run(_args(), _ctx(tmp_path))
        assert result.is_error
        assert "do NOT retry" in result.content
        assert result.metadata["unavailable"] is True

    async def test_engine_receives_branch_org_and_pages(self, tmp_path, monkeypatch):
        seen = {}

        def capture(**kwargs):
            seen.update(kwargs)
            return [PageRenderResult("Side1", True), PageRenderResult("Side2", True)]

        monkeypatch.setattr(ENGINE_PATH, capture)
        await PreviewRenderCheckTool().run(_args(), _ctx(tmp_path))
        assert seen["branch"] == "altinity_session_abcdef12"
        assert seen["org"] == "ttd"
        assert seen["app"] == "test-app"
        assert seen["page_order"] == ["Side1", "Side2"]
