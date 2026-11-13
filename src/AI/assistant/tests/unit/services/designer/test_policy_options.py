"""Reading Designer's lists of access packages and roles, on a trimmed copy of its responses."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from agents.services.designer.policy_options import PolicyOptionsError, parse_access_packages, parse_roles

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def packages_data() -> list[dict[str, Any]]:
    return json.loads((FIXTURES / "accesspackageoptions.json").read_text(encoding="utf-8"))


@pytest.fixture
def roles_data() -> list[dict[str, Any]]:
    return json.loads((FIXTURES / "subjectoptions.json").read_text(encoding="utf-8"))


class TestParseAccessPackages:
    def test_reads_code_group_area_and_whether_a_policy_can_use_it(self, packages_data):
        packages = {package.code: package for package in parse_access_packages(packages_data)}

        package = packages["regnskap-okonomi-rapport"]
        assert (package.group, package.area, package.usable_in_policy) == (
            "Allment",
            "Skatt, avgift, regnskap og toll",
            True,
        )
        assert packages["tilgangsstyring-enkeltinstanser"].usable_in_policy is False

    def test_keeps_the_first_sentence_and_drops_the_disclaimer(self, packages_data):
        for package in parse_access_packages(packages_data):
            assert "regelverksendringer" not in package.description
            assert package.description.endswith(".")

    def test_fails_when_the_flag_for_policies_is_gone(self, packages_data):
        changed = copy.deepcopy(packages_data)
        del changed[0]["areas"][0]["packages"][0]["isResourcePolicyAvailable"]

        with pytest.raises(PolicyOptionsError, match="isResourcePolicyAvailable"):
            parse_access_packages(changed)

    def test_fails_on_a_urn_that_is_not_an_access_package(self, packages_data):
        changed = copy.deepcopy(packages_data)
        changed[0]["areas"][0]["packages"][0]["urn"] = "urn:altinn:something:else"

        with pytest.raises(PolicyOptionsError, match="unexpected URN"):
            parse_access_packages(changed)

    def test_fails_on_an_empty_list(self):
        with pytest.raises(PolicyOptionsError, match="no access packages"):
            parse_access_packages([])

    def test_fails_when_a_group_has_no_list_of_areas(self, packages_data):
        """Skipping the group would cache a list without its packages, as if it were the whole list."""
        changed = copy.deepcopy(packages_data)
        del changed[-1]["areas"]

        with pytest.raises(PolicyOptionsError, match="list of areas"):
            parse_access_packages(changed)

    def test_fails_on_a_package_that_is_not_an_object(self, packages_data):
        changed = copy.deepcopy(packages_data)
        changed[0]["areas"][0]["packages"].append("regnskap")

        with pytest.raises(PolicyOptionsError, match="list of access packages"):
            parse_access_packages(changed)


class TestParseRoles:
    def test_reads_the_attribute_and_the_code_from_the_legacy_urn_or_else_the_urn(self, roles_data):
        changed = copy.deepcopy(roles_data)
        changed.append({**changed[0], "legacyUrn": None, "urn": "urn:altinn:role:agent"})

        roles = {role.code: role for role in parse_roles(changed)}

        assert roles["priv"].attribute == "urn:altinn:rolecode"
        assert roles["utinn"].attribute == "urn:altinn:rolecode"
        assert roles["agent"].attribute == "urn:altinn:role"

    def test_fails_on_a_role_without_a_provider(self, roles_data):
        changed = copy.deepcopy(roles_data)
        changed[0]["provider"] = None

        with pytest.raises(PolicyOptionsError, match="no provider"):
            parse_roles(changed)

    @pytest.mark.parametrize("legacy_urn", ["dagl", "urn:altinn:rolecode:", 5])
    def test_fails_on_a_role_urn_without_an_attribute_and_a_code(self, roles_data, legacy_urn):
        changed = copy.deepcopy(roles_data)
        changed[0]["legacyUrn"] = legacy_urn

        with pytest.raises(PolicyOptionsError, match="unexpected role URN"):
            parse_roles(changed)
