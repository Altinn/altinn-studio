"""Tests for the scan_repo tool wrapper."""

from __future__ import annotations

import json

import pytest

from agents.core import LoopContext, ScanRepoTool


def _ctx(repo_path: str = "/repo") -> LoopContext:
    return LoopContext(
        session_id="s1",
        repo_path=repo_path,
        allow_app_changes=False,
    )


class TestScanRepoTool:
    async def test_returns_json_facts_on_success(self, monkeypatch):
        """The tool wraps discover_repository_context and returns its
        result as a JSON document the model can parse."""

        class FakePlanContext:
            layout_pages = ["Side1/layout.json", "Side2/layout.json"]
            model_files = ["Model.cs"]
            resource_files = ["resource.nb.json", "resource.en.json"]
            available_locales = ["nb", "en"]
            source_of_truth = "json_schema"

        def fake_discover(repo_path: str):
            assert repo_path == "/repo"
            return FakePlanContext()

        monkeypatch.setattr(
            "agents.core.tools.repo_tool.discover_repository_context",
            fake_discover,
        )

        tool = ScanRepoTool()
        result = await tool.run(tool.input_schema(), _ctx())

        assert not result.is_error
        parsed = json.loads(result.content)
        assert parsed["layouts"] == FakePlanContext.layout_pages
        assert parsed["available_locales"] == ["nb", "en"]
        assert parsed["app_type"] == "altinn"
        assert result.metadata["layout_count"] == 2

    async def test_failure_returns_error_block(self, monkeypatch):
        def boom(repo_path: str):
            raise FileNotFoundError(repo_path)

        monkeypatch.setattr(
            "agents.core.tools.repo_tool.discover_repository_context",
            boom,
        )

        tool = ScanRepoTool()
        result = await tool.run(tool.input_schema(), _ctx("/missing"))
        assert result.is_error
        assert "/missing" in result.content

    def test_concurrency_safe(self):
        assert ScanRepoTool.is_concurrency_safe is True

    def test_input_schema_forbids_extra_args(self):
        """The model gets no inputs — extras shouldn't sneak through."""
        with pytest.raises(Exception):
            ScanRepoTool.input_schema.model_validate({"path": "/x"})
