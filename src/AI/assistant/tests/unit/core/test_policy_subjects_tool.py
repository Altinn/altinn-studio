"""A mock transport serves a recorded copy of Access Management's lists."""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from agents.altinn import access_management
from agents.core import LoopContext, PolicySubjectsTool
from agents.core.tools.policy_subjects_tool import PolicySubjectsArgs

FIXTURES = Path(__file__).parents[1] / "altinn" / "fixtures"
RECORDED = {
    access_management.ACCESS_PACKAGES_URL: (FIXTURES / "accesspackages-export.json").read_bytes(),
    access_management.ROLES_URL: (FIXTURES / "roles.json").read_bytes(),
}


def _recorded(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, content=RECORDED[str(request.url)], headers={"content-type": "application/json"})


@pytest.fixture(autouse=True)
def no_cache(monkeypatch):
    monkeypatch.setattr(access_management, "_cache", {})


def _ctx() -> LoopContext:
    return LoopContext(session_id="s1", repo_path="/repo", allow_app_changes=False)


async def _run(**args):
    return await PolicySubjectsTool().run(PolicySubjectsArgs(**args), _ctx())


async def test_lists_a_group_and_names_the_docs_as_its_source(serve):
    serve(_recorded)

    result = await _run(group="Særskilt")

    assert not result.is_error
    assert "`regnskapsforer-med-signeringsrettighet`" in result.content
    assert result.metadata["source"]["kind"] == "docs"
    assert result.metadata["source"]["url"].startswith("https://docs.altinn.studio/")


async def test_reads_each_list_once_within_the_hour(serve):
    requests = serve(_recorded)

    await _run(group="Allment")
    await _run(search="regnskap")
    await _run(kind="roles")
    await _run(kind="altinn2_roles")

    assert [str(request.url) for request in requests] == [
        access_management.ACCESS_PACKAGES_URL,
        access_management.ROLES_URL,
    ]


async def test_roles(serve):
    serve(_recorded)

    result = await _run(kind="roles", search="daglig")

    assert "`dagl`" in result.content


async def test_tells_the_model_not_to_guess_when_access_management_fails(serve):
    serve(lambda request: httpx.Response(503))

    result = await _run(group="Allment")

    assert result.is_error
    assert "Could not read the list from Altinn Access Management" in result.content
    assert "Do not write a package or role code" in result.content


async def test_an_unreadable_answer_is_an_error_and_is_not_kept(serve):
    requests = serve(lambda request: httpx.Response(200, json={"unexpected": True}))

    first = await _run(group="Allment")
    await _run(group="Allment")

    assert first.is_error
    assert "expected a list of access package groups" in first.content
    assert len(requests) == 2


async def test_an_unknown_group_is_an_error(serve):
    serve(_recorded)

    result = await _run(group="Nope")

    assert result.is_error
    assert "No group is called 'Nope'" in result.content
