"""How the altinn_layout_props tool gets the layout schema."""

from __future__ import annotations

import json

from agents.core import LoopContext
from agents.core.tools.altinn_tools import LayoutPropsArgs, LayoutPropsTool

LAYOUT_TOOLS_MODULE = "agents.core.tools.altinn_tools"

HEADER_ONLY_SCHEMA = {
    "definitions": {
        "AnyComponent": {
            "allOf": [
                {
                    "if": {"properties": {"type": {"const": "Header"}}},
                    "then": {"properties": {"id": {"type": "string"}}},
                }
            ]
        }
    }
}


def _ctx() -> LoopContext:
    return LoopContext(session_id="s1", repo_path="/repo", allow_app_changes=False)


def _serve_schema(monkeypatch, load_schema) -> None:
    monkeypatch.setattr(f"{LAYOUT_TOOLS_MODULE}.get_layout_schema", load_schema)


async def _run_tool(component_type: str):
    return await LayoutPropsTool().run(LayoutPropsArgs(component_type=component_type), _ctx())


async def test_layout_props_reads_the_component_from_the_cached_schema(monkeypatch):
    _serve_schema(monkeypatch, lambda schema_url: HEADER_ONLY_SCHEMA)

    result = await _run_tool("Header")

    assert not result.is_error
    assert json.loads(result.content)["allowed_properties"] == ["id"]


async def test_layout_props_reports_a_schema_that_cannot_be_loaded_as_an_error(monkeypatch):
    def fail_to_load(schema_url: str):
        raise ConnectionError("CDN unreachable")

    _serve_schema(monkeypatch, fail_to_load)

    result = await _run_tool("Header")

    assert result.is_error
    assert "CDN unreachable" in result.content
