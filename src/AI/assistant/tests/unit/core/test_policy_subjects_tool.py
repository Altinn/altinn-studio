"""The tables the tool renders, and the tool itself on a mock transport that serves a recorded copy of Designer's lists."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from agents.core import LoopContext, PolicySubjectsTool
from agents.core.tools.policy_subjects_tool import (
    PolicySubjectsArgs,
    UnknownGroupError,
    describe_access_packages,
    describe_roles,
)
from agents.services.designer import policy_options
from agents.services.designer.policy_options import AccessPackage, Role, parse_access_packages, parse_roles

FIXTURES = Path(__file__).parents[1] / "services" / "designer" / "fixtures"
RECORDED = {path.stem: path.read_bytes() for path in FIXTURES.glob("*.json")}
# Larger than any table these tests render.
MAX_CHARS = 100_000


def _recorded(request: httpx.Request) -> httpx.Response:
    options = request.url.path.rpartition("/")[2]
    return httpx.Response(200, content=RECORDED[options], headers={"content-type": "application/json"})


def _codes(text: str) -> set[str]:
    return {line.split("`")[1] for line in text.splitlines() if line.startswith("| `")}


@pytest.fixture
def packages() -> list[AccessPackage]:
    return parse_access_packages(json.loads(RECORDED["accesspackageoptions"]))


@pytest.fixture
def roles() -> list[Role]:
    return parse_roles(json.loads(RECORDED["subjectoptions"]))


class TestDescribeAccessPackages:
    def test_without_group_or_search_lists_groups_and_areas_but_no_codes(self, packages):
        text = describe_access_packages(packages, search=None, group=None, max_chars=MAX_CHARS)

        assert "## Allment (organisasjon)" in text
        assert "- Fullmakter for regnskapsfører: 3 packages" in text
        assert _codes(text) == set()

    def test_lists_a_group_and_marks_what_service_owners_cannot_use(self, packages):
        text = describe_access_packages(packages, search=None, group="Allment", max_chars=MAX_CHARS)

        assert _codes(text) == {"regnskap-okonomi-rapport", "tilgangsstyring-enkeltinstanser"}
        unusable = next(line for line in text.splitlines() if "tilgangsstyring-enkeltinstanser" in line)
        assert "**Not for service owners.**" in unusable

    def test_finds_a_group_without_its_norwegian_letters(self, packages):
        text = describe_access_packages(packages, search=None, group="saerskilt", max_chars=MAX_CHARS)

        assert "## Særskilt" in text

    def test_refuses_a_group_that_does_not_exist_and_names_the_groups(self, packages):
        with pytest.raises(UnknownGroupError, match="Allment, Særskilt and Innbygger"):
            describe_access_packages(packages, search=None, group="Nope", max_chars=MAX_CHARS)

    def test_search_needs_every_word_and_folds_norwegian_letters(self, packages):
        text = describe_access_packages(packages, search="regnskapsforer LØNN", group=None, max_chars=MAX_CHARS)

        assert _codes(text) == {"regnskapsforer-lonn"}

    def test_search_within_a_group(self, packages):
        text = describe_access_packages(packages, search="regnskap", group="Allment", max_chars=MAX_CHARS)

        assert _codes(text) == {"regnskap-okonomi-rapport"}

    def test_search_finds_a_word_in_a_later_sentence_but_shows_only_the_first(self, packages):
        text = describe_access_packages(packages, search="autoriserte", group=None, max_chars=MAX_CHARS)

        assert _codes(text) == {
            "regnskapsforer-lonn",
            "regnskapsforer-med-signeringsrettighet",
            "regnskapsforer-uten-signeringsrettighet",
        }
        assert "autoriserte" not in text

    def test_says_so_when_nothing_matches(self, packages):
        text = describe_access_packages(packages, search="xyzzy", group=None, max_chars=MAX_CHARS)

        assert text.startswith("No access package matches 'xyzzy'")

    def test_stops_at_the_last_row_that_fits_and_says_how_many_are_left(self):
        packages = [
            AccessPackage(
                f"pakke-{index:03}", f"Pakke {index:03}", "Beskrivelse.", "Område", "Allment", "Organisasjon", True
            )
            for index in range(130)
        ]

        text = describe_access_packages(packages, search=None, group="Allment", max_chars=2_000)

        tables, _, note = text.rpartition("\n\n")
        shown = len(_codes(text))
        # One row of these is about 50 characters.
        assert 1_900 < len(tables) <= 2_000
        assert 0 < shown < 130
        assert note == f"{130 - shown} more rows. Add a search to narrow the group."

    @pytest.mark.parametrize(
        ("search", "group", "advice"),
        [
            ("pakke", None, "Narrow the search, or add a group."),
            ("pakke", "Allment", "Narrow the search."),
        ],
    )
    def test_a_cut_list_says_how_to_narrow_what_was_asked(self, search, group, advice):
        packages = [
            AccessPackage(f"pakke-{index:03}", f"Pakke {index:03}", "", "Område", "Allment", "Organisasjon", True)
            for index in range(130)
        ]

        text = describe_access_packages(packages, search=search, group=group, max_chars=2_000)

        assert text.endswith(f"more rows. {advice}")


class TestDescribeRoles:
    def test_lists_the_roles_apart_from_altinn2_with_enhetsregisteret_first(self, roles):
        text = describe_roles(roles, search=None, altinn2=False, max_chars=MAX_CHARS)

        assert _codes(text) == {"dagl", "priv"}
        assert text.index("## Enhetsregisteret") < text.index("| `priv`")

    def test_lists_the_altinn2_roles_on_their_own(self, roles):
        text = describe_roles(roles, search=None, altinn2=True, max_chars=MAX_CHARS)

        assert _codes(text) == {"utinn"}
        assert "31 December 2026" in text

    def test_search(self, roles):
        text = describe_roles(roles, search="daglig", altinn2=False, max_chars=MAX_CHARS)

        assert _codes(text) == {"dagl"}

    def test_says_designer_lists_no_altinn2_roles_once_they_are_gone(self, roles):
        current = [role for role in roles if role.provider_code != "sys-altinn2"]

        text = describe_roles(current, search=None, altinn2=True, max_chars=MAX_CHARS)

        assert text.startswith("Designer lists no Altinn 2 roles any more")
        assert "None" not in text

    def test_a_cut_list_does_not_offer_a_group(self):
        roles = [
            Role(f"r{index:03}", "urn:altinn:rolecode", f"Rolle {index:03}", "", "sys-ccr", "Enhetsregisteret")
            for index in range(130)
        ]

        text = describe_roles(roles, search=None, altinn2=False, max_chars=2_000)

        assert text.endswith("more rows. Add a search to narrow the list.")


class TestTool:
    @pytest.fixture(autouse=True)
    def designer(self, monkeypatch):
        monkeypatch.setattr(policy_options, "_cache", {})
        monkeypatch.setattr(policy_options.config, "DESIGNER_BASE_URL", "http://designer.test/")

    @pytest.fixture
    def run(self, ctx: LoopContext):
        ctx.extras["app_name"] = "app"

        async def run(**args):
            return await PolicySubjectsTool().run(PolicySubjectsArgs(**args), ctx)

        return run

    async def test_lists_a_group_and_names_the_docs_as_its_source(self, serve, run):
        serve(_recorded)

        result = await run(group="Særskilt")

        assert not result.is_error
        assert "`regnskapsforer-med-signeringsrettighet`" in result.content
        assert result.metadata["source"]["kind"] == "docs"
        assert result.metadata["source"]["url"].endswith("/authorization/what-do-you-get/accesspackages/")

    @pytest.mark.parametrize("kind", ["roles", "altinn2_roles"])
    async def test_names_the_docs_on_roles_as_the_source_of_roles(self, serve, run, kind):
        serve(_recorded)

        result = await run(kind=kind)

        assert result.metadata["source"]["title"] == "Roller fra Altinn Autorisasjon"
        assert result.metadata["source"]["url"].endswith("/authorization/about/detailed/")

    async def test_reads_each_list_from_designer_once_within_the_hour_for_every_app(self, serve, run, ctx):
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

    async def test_sends_no_api_key(self, serve, run, ctx):
        """Designer refuses an API key on these actions, since they have no `[AllowApiKey]`."""
        requests = serve(_recorded)
        ctx.designer_api_key = "key"

        await run(group="Allment")

        assert "x-api-key" not in requests[0].headers

    async def test_needs_the_org_and_the_app(self, serve, run, ctx):
        requests = serve(_recorded)
        del ctx.extras["app_name"]

        result = await run(group="Allment")

        assert result.is_error
        assert "needs the app's org and name" in result.content
        assert requests == []

    async def test_roles(self, serve, run):
        serve(_recorded)

        result = await run(kind="roles", search="daglig")

        assert "`dagl`" in result.content

    async def test_tells_the_model_not_to_guess_when_designer_fails(self, serve, run):
        serve(lambda request: httpx.Response(503))

        result = await run(group="Allment")

        assert result.is_error
        assert "Could not read the list from Designer" in result.content
        assert "Do not write a package or role code" in result.content

    async def test_an_unreadable_answer_is_an_error_and_is_not_kept(self, serve, run):
        requests = serve(lambda request: httpx.Response(200, json={"unexpected": True}))

        first = await run(group="Allment")
        await run(group="Allment")

        assert first.is_error
        assert "expected a list of access package groups" in first.content
        assert len(requests) == 2

    async def test_an_unknown_group_is_an_error(self, serve, run):
        serve(_recorded)

        result = await run(group="Nope")

        assert result.is_error
        assert "No group is called 'Nope'" in result.content
