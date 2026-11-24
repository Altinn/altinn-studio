"""The altinn_policy_subjects tool, on a mock transport that serves a recorded copy of Designer's lists."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from pydantic import ValidationError

from agents.core import LoopContext, PolicySubjectsTool
from agents.core.tools.policy_subjects_tool import PolicySubjectsArgs
from agents.services.designer.policy_options import PolicyOptions

from .conftest import Handler

FIXTURES = Path(__file__).parent / "fixtures" / "policy_subjects"
HOUR = 60 * 60


def _recorded(options: str) -> Any:
    """A fresh copy of Designer's recorded answer, which a test may change."""
    return json.loads((FIXTURES / f"{options}.json").read_text(encoding="utf-8"))


def _designer(*, packages: Any = None, roles: Any = None) -> Handler:
    """Designer, answering with the given lists or else the recorded ones."""
    answers = {
        "accesspackageoptions": _recorded("accesspackageoptions") if packages is None else packages,
        "subjectoptions": _recorded("subjectoptions") if roles is None else roles,
    }

    def handle(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=answers[request.url.path.rpartition("/")[2]])

    return handle


def _codes(text: str) -> set[str]:
    return {line.split("`")[1] for line in text.splitlines() if line.startswith("| `")}


def _row(text: str, code: str) -> str:
    return next(line for line in text.splitlines() if line.startswith(f"| `{code}`"))


def _many_packages(count: int) -> list[dict[str, Any]]:
    """One group of `count` packages, in Designer's shape."""
    packages = [
        {
            "urn": f"urn:altinn:accesspackage:pakke-{index:03}",
            "name": f"Pakke {index:03}",
            "description": "Beskrivelse.",
            "isResourcePolicyAvailable": True,
        }
        for index in range(count)
    ]
    return [{"name": "Allment", "type": "Organisasjon", "areas": [{"name": "Område", "packages": packages}]}]


def _many_roles(count: int) -> list[dict[str, Any]]:
    provider = {"name": "Enhetsregisteret", "code": "sys-ccr"}
    return [
        {"urn": f"urn:altinn:rolecode:r{index:03}", "name": f"Rolle {index:03}", "provider": provider}
        for index in range(count)
    ]


@pytest.fixture
def clock() -> SimpleNamespace:
    """The time that the tool's cache sees. Set `now` to move it."""
    return SimpleNamespace(now=0.0)


@pytest.fixture
def run(ctx: LoopContext, clock: SimpleNamespace):
    ctx.extras["app_name"] = "app"
    tool = PolicySubjectsTool(PolicyOptions("http://designer.test/", clock=lambda: clock.now))

    async def run(**args):
        return await tool.run(PolicySubjectsArgs(**args), ctx)

    return run


class TestAccessPackages:
    async def test_without_group_or_search_lists_groups_and_areas_but_no_codes(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages")

        assert "## Allment (organisasjon)" in result.content
        assert "- Fullmakter for regnskapsfører: 3 packages" in result.content
        assert _codes(result.content) == set()

    async def test_lists_a_group_with_the_area_of_each_package(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", group="Allment")

        assert not result.is_error
        assert _codes(result.content) == {"regnskap-okonomi-rapport", "tilgangsstyring-enkeltinstanser"}
        assert "| Skatt, avgift, regnskap og toll |" in _row(result.content, "regnskap-okonomi-rapport")

    async def test_marks_a_package_that_service_owners_cannot_use(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", group="Allment")

        assert "**Not for service owners.**" in _row(result.content, "tilgangsstyring-enkeltinstanser")
        assert "**Not for service owners.**" not in _row(result.content, "regnskap-okonomi-rapport")

    async def test_finds_a_group_without_its_norwegian_letters(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", group="saerskilt")

        assert "## Særskilt" in result.content

    async def test_an_unknown_group_is_an_error_that_names_the_groups(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", group="Nope")

        assert result.is_error
        assert result.content == "No group is called 'Nope'. The groups are Allment, Særskilt and Innbygger."

    async def test_search_needs_every_word_and_folds_norwegian_letters(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", search="regnskapsforer LØNN")

        assert _codes(result.content) == {"regnskapsforer-lonn"}

    async def test_search_within_a_group(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", search="regnskap", group="Allment")

        assert _codes(result.content) == {"regnskap-okonomi-rapport"}

    async def test_search_finds_a_word_in_a_later_sentence_but_shows_only_the_first(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", search="autoriserte")

        assert _codes(result.content) == {
            "regnskapsforer-lonn",
            "regnskapsforer-med-signeringsrettighet",
            "regnskapsforer-uten-signeringsrettighet",
        }
        assert "autoriserte" not in result.content
        assert "Denne fullmakten gir tilgang til regnskapsfører å rapportere lønn for sin kunde." in _row(
            result.content, "regnskapsforer-lonn"
        )

    async def test_search_skips_the_disclaimer_that_ends_most_descriptions(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", search="regelverksendringer")

        assert result.content.startswith("No access package matches 'regelverksendringer'")

    async def test_stops_at_the_last_row_that_fits_and_says_how_many_are_left(self, serve, run, ctx):
        serve(_designer(packages=_many_packages(130)))
        ctx.max_result_chars = 3_000

        result = await run(kind="access_packages", group="Allment")

        shown = _codes(result.content)
        assert len(result.content) <= ctx.max_result_chars
        assert shown == {f"pakke-{index:03}" for index in range(len(shown))}
        assert result.content.endswith(f"\n\n{130 - len(shown)} more rows. Add a search to narrow the group.")

    @pytest.mark.parametrize(
        ("group", "advice"),
        [
            (None, "Narrow the search, or add a group."),
            ("Allment", "Narrow the search."),
        ],
    )
    async def test_a_cut_search_says_how_to_narrow_what_was_asked(self, serve, run, ctx, group, advice):
        serve(_designer(packages=_many_packages(130)))
        ctx.max_result_chars = 3_000

        result = await run(kind="access_packages", search="pakke", group=group)

        assert result.content.endswith(f"more rows. {advice}")


class TestRoles:
    async def test_lists_the_roles_apart_from_altinn2_with_enhetsregisteret_first(self, serve, run):
        serve(_designer())

        result = await run(kind="roles")

        assert _codes(result.content) == {"dagl", "priv"}
        assert result.content.index("## Enhetsregisteret") < result.content.index("| `priv`")

    async def test_names_the_attribute_of_a_role_without_a_role_code(self, serve, run):
        roles = _recorded("subjectoptions")
        roles.append({**roles[0], "legacyUrn": None, "urn": "urn:altinn:role:agent"})
        serve(_designer(roles=roles))

        result = await run(kind="roles")

        assert _row(result.content, "agent").startswith("| `agent` (`urn:altinn:role`) |")
        assert _row(result.content, "dagl").startswith("| `dagl` | Daglig leder |")

    async def test_search(self, serve, run):
        serve(_designer())

        result = await run(kind="roles", search="daglig")

        assert _codes(result.content) == {"dagl"}

    async def test_lists_the_altinn2_roles_on_their_own(self, serve, run):
        serve(_designer())

        result = await run(kind="altinn2_roles")

        assert _codes(result.content) == {"utinn"}
        assert "31 December 2026" in result.content

    async def test_says_designer_lists_no_altinn2_roles_once_they_are_gone(self, serve, run):
        roles = [role for role in _recorded("subjectoptions") if role["provider"]["code"] != "sys-altinn2"]
        serve(_designer(roles=roles))

        result = await run(kind="altinn2_roles")

        assert result.content.startswith("Designer lists no Altinn 2 roles any more")

    async def test_a_cut_list_does_not_offer_a_group(self, serve, run, ctx):
        serve(_designer(roles=_many_roles(130)))
        ctx.max_result_chars = 3_000

        result = await run(kind="roles")

        assert result.content.endswith("more rows. Add a search to narrow the list.")

    def test_refuses_a_group(self):
        with pytest.raises(ValidationError, match="only for `access_packages`"):
            PolicySubjectsArgs(kind="roles", group="Allment")


class TestSource:
    async def test_names_the_docs_on_access_packages(self, serve, run):
        serve(_designer())

        result = await run(kind="access_packages", group="Særskilt")

        assert result.metadata["source"]["kind"] == "docs"
        assert result.metadata["source"]["url"].endswith("/authorization/what-do-you-get/accesspackages/")

    @pytest.mark.parametrize("kind", ["roles", "altinn2_roles"])
    async def test_names_the_docs_on_roles(self, serve, run, kind):
        serve(_designer())

        result = await run(kind=kind)

        assert result.metadata["source"]["title"] == "Roller fra Altinn Autorisasjon"
        assert result.metadata["source"]["url"].endswith("/authorization/about/detailed/")


class TestDesigner:
    async def test_reads_each_list_once_within_the_hour_for_every_app(self, serve, run, ctx):
        requests = serve(_designer())

        await run(kind="access_packages", group="Allment")
        await run(kind="roles")
        ctx.extras["app_name"] = "other-app"
        await run(kind="access_packages", search="regnskap")
        await run(kind="altinn2_roles")

        assert [str(request.url) for request in requests] == [
            "http://designer.test/designer/api/ttd/app/policy/accesspackageoptions",
            "http://designer.test/designer/api/ttd/app/policy/subjectoptions",
        ]

    async def test_reads_a_list_again_after_an_hour(self, serve, run, clock):
        requests = serve(_designer())

        await run(kind="roles")
        clock.now += HOUR
        await run(kind="roles")

        assert len(requests) == 2

    async def test_sends_no_api_key(self, serve, run, ctx):
        """Designer refuses an API key on these actions, since they have no `[AllowApiKey]`."""
        requests = serve(_designer())
        ctx.designer_api_key = "key"

        await run(kind="access_packages", group="Allment")

        assert "x-api-key" not in requests[0].headers

    async def test_needs_the_org_and_the_app(self, serve, run, ctx):
        requests = serve(_designer())
        del ctx.extras["app_name"]

        result = await run(kind="access_packages", group="Allment")

        assert result.is_error
        assert "needs the app's org and name" in result.content
        assert requests == []

    async def test_tells_the_model_not_to_guess_when_designer_fails(self, serve, run):
        serve(lambda request: httpx.Response(503))

        result = await run(kind="access_packages", group="Allment")

        assert result.is_error
        assert "Could not read the list from Designer" in result.content
        assert "Do not write a package or role code" in result.content

    async def test_an_unreadable_answer_is_an_error_and_is_not_kept(self, serve, run):
        requests = serve(lambda request: httpx.Response(200, json={"unexpected": True}))

        first = await run(kind="access_packages", group="Allment")
        await run(kind="access_packages", group="Allment")

        assert first.is_error
        assert "expected a list of access package groups" in first.content
        assert len(requests) == 2

    @pytest.mark.parametrize(
        ("change", "error"),
        [
            (
                lambda groups: groups[0]["areas"][0]["packages"][0].pop("isResourcePolicyAvailable"),
                "isResourcePolicyAvailable",
            ),
            (
                lambda groups: groups[0]["areas"][0]["packages"][0].update(urn="urn:altinn:something:else"),
                "unexpected URN",
            ),
            (lambda groups: groups.clear(), "no access packages"),
            # Skipping the group would keep a list without its packages, as if it were the whole list.
            (lambda groups: groups[-1].pop("areas"), "list of areas"),
            (lambda groups: groups[0].pop("type"), "no 'type'"),
            (lambda groups: groups[0]["areas"][0]["packages"].append("regnskap"), "list of access packages"),
        ],
        ids=["no-policy-flag", "other-urn", "empty", "group-without-areas", "group-without-type", "package-not-object"],
    )
    async def test_an_access_package_list_that_changed_shape_is_an_error(self, serve, run, change, error):
        packages = _recorded("accesspackageoptions")
        change(packages)
        serve(_designer(packages=packages))

        result = await run(kind="access_packages", group="Allment")

        assert result.is_error
        assert error in result.content

    @pytest.mark.parametrize(
        ("change", "error"),
        [
            (lambda role: role.update(provider=None), "no provider"),
            (lambda role: role.update(legacyUrn="dagl"), "unexpected URN"),
            (lambda role: role.update(legacyUrn="urn:altinn:rolecode:"), "unexpected URN"),
            (lambda role: role.update(legacyUrn=5), "unexpected URN"),
        ],
        ids=["no-provider", "bare-code", "urn-without-code", "not-text"],
    )
    async def test_a_role_list_that_changed_shape_is_an_error(self, serve, run, change, error):
        roles = _recorded("subjectoptions")
        change(roles[0])
        serve(_designer(roles=roles))

        result = await run(kind="roles")

        assert result.is_error
        assert error in result.content


def test_needs_a_kind():
    with pytest.raises(ValidationError, match="kind"):
        PolicySubjectsArgs.model_validate({"group": "Allment"})
