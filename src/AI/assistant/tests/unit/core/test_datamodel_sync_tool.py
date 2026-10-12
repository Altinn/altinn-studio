"""Where the altinn_datamodel_sync tool writes the generated files."""

from __future__ import annotations

from pathlib import Path

import pytest

from agents.core import DatamodelSyncTool, LoopContext, ToolResult

ALTINN_TOOLS_MODULE = "agents.core.tools.altinn_tools"
GENERATED_FILES = [
    {"path": "model.xsd", "content": "<xs:schema/>"},
    {"path": "model.cs", "content": "public class Model {}"},
]


@pytest.fixture(autouse=True)
def stub_generator(monkeypatch):
    monkeypatch.setattr(
        f"{ALTINN_TOOLS_MODULE}.datamodel_sync",
        lambda **_: {"status": "ok", "generated": GENERATED_FILES},
    )


def _ctx(repo: Path) -> LoopContext:
    return LoopContext(session_id="s1", repo_path=str(repo), allow_app_changes=True)


async def _run(ctx: LoopContext, schema_path: str) -> ToolResult:
    tool = DatamodelSyncTool()
    return await tool.run(tool.input_schema.model_validate({"schema_path": schema_path}), ctx)


async def test_writes_generated_files_next_to_the_schema(tmp_path: Path):
    models = tmp_path / "App" / "models"
    models.mkdir(parents=True)
    (models / "model.schema.json").write_text("{}", encoding="utf-8")
    ctx = _ctx(tmp_path)
    ctx.extras["verified_files"] = {"App/models/model.xsd"}

    result = await _run(ctx, "App/models/model.schema.json")

    assert not result.is_error
    assert (models / "model.xsd").read_text(encoding="utf-8") == "<xs:schema/>"
    assert ctx.extras["changed_files"] == {"App/models/model.xsd", "App/models/model.cs"}
    assert ctx.extras["verified_files"] == set()


@pytest.mark.parametrize("schema_path", ["{outside_schema}", "../model.schema.json", "App/../../model.schema.json"])
async def test_refuses_a_schema_outside_the_repo(tmp_path: Path, schema_path: str):
    repo = tmp_path / "repo"
    (repo / "App").mkdir(parents=True)
    outside_schema = tmp_path / "model.schema.json"
    outside_schema.write_text("{}", encoding="utf-8")

    result = await _run(_ctx(repo), schema_path.format(outside_schema=outside_schema))

    assert result.is_error
    assert not (tmp_path / "model.xsd").exists()
