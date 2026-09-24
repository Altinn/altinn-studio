"""How the altinn_layout_props tool gets the layout schema."""

from __future__ import annotations

import json
from dataclasses import replace

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE, AppVersionProfile
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


OTHER_VERSION_PROFILE = replace(
    V8_PROFILE,
    layout_schema_location="other-version/layout.schema.v1.json",
    layout_schema_display_url="https://example.test/other-version/layout.schema.v1.json",
    binding_constraints={"Header": ["A rule of the other version."]},
)


def _ctx(profile: AppVersionProfile = V8_PROFILE) -> LoopContext:
    return LoopContext(session_id="s1", repo_path="/repo", allow_app_changes=False, app_version_profile=profile)


def _serve_schema(monkeypatch, load_schema) -> None:
    monkeypatch.setattr(f"{LAYOUT_TOOLS_MODULE}.get_layout_schema", load_schema)


async def _run_tool(component_type: str, profile: AppVersionProfile = V8_PROFILE):
    return await LayoutPropsTool().run(LayoutPropsArgs(component_type=component_type), _ctx(profile))


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


async def test_layout_props_reads_the_layout_schema_of_the_app_version(monkeypatch):
    requested_locations: list[str] = []

    def load_schema(schema_location: str):
        requested_locations.append(schema_location)
        return HEADER_ONLY_SCHEMA

    _serve_schema(monkeypatch, load_schema)

    await _run_tool("Header", OTHER_VERSION_PROFILE)

    assert requested_locations == [OTHER_VERSION_PROFILE.layout_schema_location]


async def test_layout_props_states_the_constraints_of_the_app_version(monkeypatch):
    _serve_schema(monkeypatch, lambda schema_location: HEADER_ONLY_SCHEMA)

    result = await _run_tool("Header", OTHER_VERSION_PROFILE)

    assert "A rule of the other version." in json.loads(result.content)["constraints"]


async def test_layout_props_links_the_layout_schema_of_the_app_version(monkeypatch):
    _serve_schema(monkeypatch, lambda schema_location: HEADER_ONLY_SCHEMA)

    result = await _run_tool("Header", OTHER_VERSION_PROFILE)

    assert result.metadata["source"]["url"] == OTHER_VERSION_PROFILE.layout_schema_display_url


async def test_a_v9_app_is_told_a_datepicker_stores_a_date_only_by_default():
    result = await _run_tool("Datepicker", V9_PROFILE)

    constraints = " ".join(json.loads(result.content)["constraints"])
    assert '"timeStamp" defaults to false' in constraints
