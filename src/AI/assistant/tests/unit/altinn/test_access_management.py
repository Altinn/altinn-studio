"""Reading and describing Access Management's lists, on a trimmed copy of its real responses."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from agents.altinn.access_management import (
    AccessManagementError,
    AccessPackage,
    describe_access_packages,
    describe_roles,
    parse_access_packages,
    parse_roles,
)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def export() -> list[dict[str, Any]]:
    return json.loads((FIXTURES / "accesspackages-export.json").read_text(encoding="utf-8"))


@pytest.fixture
def roles_data() -> list[dict[str, Any]]:
    return json.loads((FIXTURES / "roles.json").read_text(encoding="utf-8"))


def _codes(text: str) -> set[str]:
    return {line.split("`")[1] for line in text.splitlines() if line.startswith("| `")}


class TestParseAccessPackages:
    def test_reads_code_group_area_and_whether_a_policy_can_use_it(self, export):
        packages = {package.code: package for package in parse_access_packages(export)}

        package = packages["regnskap-okonomi-rapport"]
        assert (package.group, package.area, package.usable_in_policy) == (
            "Allment",
            "Skatt, avgift, regnskap og toll",
            True,
        )
        assert packages["tilgangsstyring-enkeltinstanser"].usable_in_policy is False

    def test_keeps_the_first_sentence_and_drops_the_disclaimer(self, export):
        for package in parse_access_packages(export):
            assert "regelverksendringer" not in package.description
            assert package.description.endswith(".")

    def test_fails_when_the_flag_for_policies_is_gone(self, export):
        changed = copy.deepcopy(export)
        del changed[0]["areas"][0]["packages"][0]["isResourcePolicyAvailable"]

        with pytest.raises(AccessManagementError, match="isResourcePolicyAvailable"):
            parse_access_packages(changed)

    def test_fails_on_a_urn_that_is_not_an_access_package(self, export):
        changed = copy.deepcopy(export)
        changed[0]["areas"][0]["packages"][0]["urn"] = "urn:altinn:something:else"

        with pytest.raises(AccessManagementError, match="unexpected URN"):
            parse_access_packages(changed)

    def test_fails_on_an_empty_list(self):
        with pytest.raises(AccessManagementError, match="no access packages"):
            parse_access_packages([])

    def test_fails_when_a_group_has_no_list_of_areas(self, export):
        """Skipping the group would cache a list without its packages, as if it were the whole list."""
        changed = copy.deepcopy(export)
        del changed[-1]["areas"]

        with pytest.raises(AccessManagementError, match="list of areas"):
            parse_access_packages(changed)

    def test_fails_on_a_package_that_is_not_an_object(self, export):
        changed = copy.deepcopy(export)
        changed[0]["areas"][0]["packages"].append("regnskap")

        with pytest.raises(AccessManagementError, match="list of access packages"):
            parse_access_packages(changed)


class TestDescribeAccessPackages:
    def test_without_group_or_search_lists_groups_and_areas_but_no_codes(self, export):
        text = describe_access_packages(parse_access_packages(export), search=None, group=None)

        assert "## Allment (organisasjon)" in text
        assert "- Fullmakter for regnskapsfører: 3 packages" in text
        assert _codes(text) == set()

    def test_lists_a_group_and_marks_what_service_owners_cannot_use(self, export):
        text = describe_access_packages(parse_access_packages(export), search=None, group="Allment")

        assert _codes(text) == {"regnskap-okonomi-rapport", "tilgangsstyring-enkeltinstanser"}
        unusable = next(line for line in text.splitlines() if "tilgangsstyring-enkeltinstanser" in line)
        assert "**Not for service owners.**" in unusable

    def test_finds_a_group_without_its_norwegian_letters(self, export):
        text = describe_access_packages(parse_access_packages(export), search=None, group="saerskilt")

        assert "## Særskilt" in text

    def test_refuses_a_group_that_does_not_exist_and_names_the_groups(self, export):
        with pytest.raises(ValueError, match="Allment, Særskilt and Innbygger"):
            describe_access_packages(parse_access_packages(export), search=None, group="Nope")

    def test_search_needs_every_word_and_folds_norwegian_letters(self, export):
        text = describe_access_packages(parse_access_packages(export), search="regnskapsforer LØNN", group=None)

        assert _codes(text) == {"regnskapsforer-lonn"}

    def test_search_within_a_group(self, export):
        text = describe_access_packages(parse_access_packages(export), search="regnskap", group="Allment")

        assert _codes(text) == {"regnskap-okonomi-rapport"}

    def test_says_so_when_nothing_matches(self, export):
        text = describe_access_packages(parse_access_packages(export), search="xyzzy", group=None)

        assert text.startswith("No access package matches 'xyzzy'")

    def test_stops_after_a_hundred_rows(self):
        packages = [
            AccessPackage(
                f"pakke-{index:03}", f"Pakke {index:03}", "Beskrivelse.", "Område", "Allment", "Organisasjon", True
            )
            for index in range(130)
        ]

        text = describe_access_packages(packages, search=None, group="Allment")

        assert len(_codes(text)) == 100
        assert text.endswith("30 more rows. Narrow the search, or list one group.")


class TestRoles:
    def test_reads_the_role_code_from_the_legacy_urn(self, roles_data):
        roles = {role.code: role for role in parse_roles(roles_data)}

        assert roles["priv"].attribute == "urn:altinn:rolecode"
        assert roles["agent"].attribute == "urn:altinn:role"

    def test_offers_what_studio_offers_with_enhetsregisteret_first(self, roles_data):
        text = describe_roles(parse_roles(roles_data), search=None, altinn2=False)

        assert _codes(text) == {"dagl", "priv"}
        assert text.index("## Enhetsregisteret") < text.index("| `priv`")

    def test_lists_every_altinn2_role_even_those_studio_does_not_offer(self, roles_data):
        text = describe_roles(parse_roles(roles_data), search=None, altinn2=True)

        assert _codes(text) == {"utinn", "eckeyrole"}
        assert "31 December 2026" in text

    def test_search(self, roles_data):
        text = describe_roles(parse_roles(roles_data), search="daglig", altinn2=False)

        assert _codes(text) == {"dagl"}

    def test_fails_on_a_role_without_a_provider(self, roles_data):
        changed = copy.deepcopy(roles_data)
        changed[0]["provider"] = None

        with pytest.raises(AccessManagementError, match="no provider"):
            parse_roles(changed)

    @pytest.mark.parametrize("legacy_urn", ["dagl", "urn:altinn:rolecode:", 5])
    def test_fails_on_a_role_urn_without_an_attribute_and_a_code(self, roles_data, legacy_urn):
        changed = copy.deepcopy(roles_data)
        changed[0]["legacyUrn"] = legacy_urn

        with pytest.raises(AccessManagementError, match="unexpected role URN"):
            parse_roles(changed)
