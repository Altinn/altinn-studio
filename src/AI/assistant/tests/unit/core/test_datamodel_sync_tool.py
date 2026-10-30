"""What the altinn_datamodel_sync tool sends to Designer, and where it writes the generated files."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from agents.altinn.app_version import V8_PROFILE, V9_PROFILE
from agents.core import DatamodelSyncTool, LoopContext, ToolResult
from agents.services.designer import DatamodelGenerationError, DatamodelGenerationRequest, GeneratedDatamodel

DATAMODEL_SYNC_TOOL_MODULE = "agents.core.tools.datamodel_sync_tool"
SCHEMA_PATH = "App/models/model.schema.json"
APPLICATION_METADATA = '{\n  "dataTypes": []\n}'
GENERATED = GeneratedDatamodel(
    json_schema='{\n  "type": "object"\n}',
    csharp_classes="public class model {}",
    xsd="<xs:schema/>",
    application_metadata='{\n  "dataTypes": [\n    {\n      "id": "model"\n    }\n  ]\n}',
)


@pytest.fixture
def generation_requests(monkeypatch) -> list[DatamodelGenerationRequest]:
    requests: list[DatamodelGenerationRequest] = []

    async def generate(request: DatamodelGenerationRequest, api_key: str) -> GeneratedDatamodel:
        assert api_key == "test-api-key"
        requests.append(request)
        return GENERATED

    monkeypatch.setattr(f"{DATAMODEL_SYNC_TOOL_MODULE}.generate_datamodel", generate)
    return requests


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / "App" / "models").mkdir(parents=True)
    (repo / "App" / "config").mkdir(parents=True)
    (repo / SCHEMA_PATH).write_text('{"type":"object"}', encoding="utf-8")
    (repo / "App" / "config" / "applicationmetadata.json").write_text(APPLICATION_METADATA, encoding="utf-8")
    return repo


def _ctx(repo: Path) -> LoopContext:
    ctx = LoopContext(
        session_id="s1",
        repo_path=str(repo),
        allow_app_changes=True,
        repo_owner="ttd",
        designer_api_key="test-api-key",
        app_version_profile=V9_PROFILE,
    )
    ctx.extras["app_name"] = "my-app"
    return ctx


async def _run(ctx: LoopContext, schema_path: str = SCHEMA_PATH) -> ToolResult:
    tool = DatamodelSyncTool()
    return await tool.run(tool.input_schema.model_validate({"schema_path": schema_path}), ctx)


async def test_sends_the_schema_and_the_app_files_that_the_generation_reads(repo: Path, generation_requests):
    (repo / ".altinnstudio").mkdir()
    (repo / ".altinnstudio" / "settings.json").write_text('{"useNullableReferenceTypes": true}', encoding="utf-8")

    result = await _run(_ctx(repo))

    assert not result.is_error
    assert generation_requests == [
        DatamodelGenerationRequest(
            repo_owner="ttd",
            app_name="my-app",
            model_name="model",
            schema={"type": "object"},
            application_metadata={"dataTypes": []},
            use_nullable_reference_types=True,
            is_v9_or_newer=True,
        )
    ]


async def test_an_app_without_studio_settings_has_no_nullable_reference_types(repo: Path, generation_requests):
    ctx = _ctx(repo)
    ctx.app_version_profile = V8_PROFILE

    await _run(ctx)

    [request] = generation_requests
    assert request.use_nullable_reference_types is False
    assert request.is_v9_or_newer is False


async def test_writes_the_generated_files_and_marks_them_for_verification(repo: Path, generation_requests):
    ctx = _ctx(repo)
    ctx.extras["verified_files"] = {"App/models/model.cs"}

    result = await _run(ctx)

    written = {
        SCHEMA_PATH,
        "App/models/model.cs",
        "App/models/model.xsd",
        "App/config/applicationmetadata.json",
    }
    assert set(json.loads(result.content)["files_written"]) == written
    assert (repo / SCHEMA_PATH).read_text(encoding="utf-8") == GENERATED.json_schema
    assert (repo / "App/models/model.cs").read_text(encoding="utf-8") == GENERATED.csharp_classes
    assert (repo / "App/models/model.xsd").read_text(encoding="utf-8") == GENERATED.xsd
    assert (repo / "App/config/applicationmetadata.json").read_text(encoding="utf-8") == GENERATED.application_metadata
    assert ctx.extras["changed_files"] == written
    assert ctx.extras["verified_files"] == set()


async def test_leaves_a_file_that_the_generation_does_not_change(repo: Path, generation_requests):
    (repo / SCHEMA_PATH).write_text(GENERATED.json_schema, encoding="utf-8")
    ctx = _ctx(repo)

    result = await _run(ctx)

    assert SCHEMA_PATH not in json.loads(result.content)["files_written"]
    assert SCHEMA_PATH not in ctx.extras["changed_files"]


async def test_reports_why_designer_did_not_generate_the_files(repo: Path, monkeypatch):
    async def refuse(request: DatamodelGenerationRequest, api_key: str) -> GeneratedDatamodel:
        raise DatamodelGenerationError("Designer could not generate the data model (HTTP 400): compiler error")

    monkeypatch.setattr(f"{DATAMODEL_SYNC_TOOL_MODULE}.generate_datamodel", refuse)

    result = await _run(_ctx(repo))

    assert result.is_error
    assert "compiler error" in result.content
    assert not (repo / "App/models/model.cs").exists()


async def test_needs_a_designer_session(repo: Path, generation_requests):
    ctx = _ctx(repo)
    ctx.designer_api_key = None

    result = await _run(ctx)

    assert result.is_error
    assert generation_requests == []


async def test_refuses_a_path_that_is_not_a_json_schema(repo: Path, generation_requests):
    result = await _run(_ctx(repo), "App/models/model.json")

    assert result.is_error
    assert generation_requests == []


@pytest.mark.parametrize("schema_path", ["{outside_schema}", "../model.schema.json", "App/../../model.schema.json"])
async def test_refuses_a_schema_outside_the_repo(tmp_path: Path, repo: Path, generation_requests, schema_path: str):
    outside_schema = tmp_path / "model.schema.json"
    outside_schema.write_text("{}", encoding="utf-8")

    result = await _run(_ctx(repo), schema_path.format(outside_schema=outside_schema))

    assert result.is_error
    assert generation_requests == []
    assert not (tmp_path / "model.xsd").exists()


async def test_refuses_to_write_through_a_symlink_out_of_the_repo(tmp_path: Path, repo: Path, generation_requests):
    outside_file = tmp_path / "outside.txt"
    outside_file.write_text("original", encoding="utf-8")
    (repo / "App/models/model.xsd").symlink_to(outside_file)

    result = await _run(_ctx(repo))

    assert result.is_error
    assert outside_file.read_text(encoding="utf-8") == "original"
    assert (repo / SCHEMA_PATH).read_text(encoding="utf-8") == '{"type":"object"}'
