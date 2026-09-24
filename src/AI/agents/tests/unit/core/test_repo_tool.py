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


LAYOUT_FILE_NAME = "Side1.json"
EMPTY_LAYOUT = '{"data": {"layout": []}}'


def _create_layout(repo_path, layout_folder: str) -> None:
    layouts_dir = repo_path / layout_folder
    layouts_dir.mkdir(parents=True)
    (layouts_dir / LAYOUT_FILE_NAME).write_text(EMPTY_LAYOUT)


async def _scan_layouts(repo_path) -> list[str]:
    tool = ScanRepoTool()
    result = await tool.run(tool.input_schema(), _ctx(str(repo_path)))
    return json.loads(result.content)["layouts"]


async def test_scan_repo_lists_layouts_in_a_layout_set_not_named_form(tmp_path):
    _create_layout(tmp_path, "App/ui/message/layouts")

    assert await _scan_layouts(tmp_path) == [f"App/ui/message/layouts/{LAYOUT_FILE_NAME}"]


async def test_scan_repo_lists_layouts_in_a_task_folder(tmp_path):
    _create_layout(tmp_path, "App/ui/Task_1/layouts")

    assert await _scan_layouts(tmp_path) == [f"App/ui/Task_1/layouts/{LAYOUT_FILE_NAME}"]


async def test_scan_repo_lists_layouts_from_every_layout_set_in_sorted_order(tmp_path):
    _create_layout(tmp_path, "App/ui/Task_2/layouts")
    _create_layout(tmp_path, "App/ui/Task_1/layouts")

    assert await _scan_layouts(tmp_path) == [
        f"App/ui/Task_1/layouts/{LAYOUT_FILE_NAME}",
        f"App/ui/Task_2/layouts/{LAYOUT_FILE_NAME}",
    ]


async def test_scan_repo_lists_no_layouts_when_the_app_has_no_ui_folder(tmp_path):
    assert await _scan_layouts(tmp_path) == []
