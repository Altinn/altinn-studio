"""A mock transport serves a recorded copy of Designer's lists."""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from agents.altinn import access_management
from agents.core import LoopContext, PolicySubjectsTool
from agents.core.tools.policy_subjects_tool import PolicySubjectsArgs

FIXTURES = Path(__file__).parents[1] / "altinn" / "fixtures"
RECORDED = {
    options: (FIXTURES / f"{options}.json").read_bytes()
    for options in (access_management.ACCESS_PACKAGE_OPTIONS, access_management.SUBJECT_OPTIONS)
}


def _recorded(request: httpx.Request) -> httpx.Response:
    options = request.url.path.rpartition("/")[2]
    return httpx.Response(200, content=RECORDED[options], headers={"content-type": "application/json"})


@pytest.fixture(autouse=True)
def designer(monkeypatch):
    monkeypatch.setattr(access_management, "_cache", {})
    monkeypatch.setattr(access_management.config, "DESIGNER_BASE_URL", "http://designer.test/")


@pytest.fixture
def run(ctx: LoopContext):
    ctx.extras["app_name"] = "app"

    async def run(**args):
        return await PolicySubjectsTool().run(PolicySubjectsArgs(**args), ctx)

    return run


async def test_lists_a_group_and_names_the_docs_as_its_source(serve, run):
    serve(_recorded)

    result = await run(group="Særskilt")

    assert not result.is_error
    assert "`regnskapsforer-med-signeringsrettighet`" in result.content
    assert result.metadata["source"]["kind"] == "docs"
    assert result.metadata["source"]["url"].startswith("https://docs.altinn.studio/")


async def test_reads_each_list_from_designer_once_within_the_hour_for_every_app(serve, run, ctx):
    requests = serve(_recorded)

    await run(group="Allment")
    await run(kind="roles")
    ctx.extras["app_name"] = "other-app"
    await run(search="regnskap")
    await run(kind="altinn2_roles")

    assert [str(request.url) for request in requests] == [
        "http://designer.test/designer/api/ttd/app/policy/accesspackageoptions",
        "http://designer.test/designer/api/ttd/app/policy/subjectoptions",
    ]


async def test_sends_no_api_key(serve, run, ctx):
    """Designer refuses an API key on these actions, since they have no `[AllowApiKey]`."""
    requests = serve(_recorded)
    ctx.designer_api_key = "key"

    await run(group="Allment")

    assert "x-api-key" not in requests[0].headers


async def test_needs_the_org_and_the_app(serve, run, ctx):
    requests = serve(_recorded)
    del ctx.extras["app_name"]

    result = await run(group="Allment")

    assert result.is_error
    assert "needs a Designer session" in result.content
    assert requests == []


async def test_roles(serve, run):
    serve(_recorded)

    result = await run(kind="roles", search="daglig")

    assert "`dagl`" in result.content


async def test_tells_the_model_not_to_guess_when_access_management_fails(serve, run):
    serve(lambda request: httpx.Response(503))

    result = await run(group="Allment")

    assert result.is_error
    assert "Could not read the list from Designer" in result.content
    assert "Do not write a package or role code" in result.content


async def test_an_unreadable_answer_is_an_error_and_is_not_kept(serve, run):
    requests = serve(lambda request: httpx.Response(200, json={"unexpected": True}))

    first = await run(group="Allment")
    await run(group="Allment")

    assert first.is_error
    assert "expected a list of access package groups" in first.content
    assert len(requests) == 2


async def test_an_unknown_group_is_an_error(serve, run):
    serve(_recorded)

    result = await run(group="Nope")

    assert result.is_error
    assert "No group is called 'Nope'" in result.content
