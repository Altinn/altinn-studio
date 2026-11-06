"""Access Management's real lists still parse, and still have what the studio-policy skill names.

These tests call platform.altinn.no, so they run only when ACCESS_MANAGEMENT_LIVE is set. CI sets it, so a change in
the responses fails a build instead of the assistant's lookups.
"""

from __future__ import annotations

import os

import pytest

from agents.altinn import access_management

pytestmark = pytest.mark.skipif(
    not os.environ.get("ACCESS_MANAGEMENT_LIVE"), reason="calls Access Management; set ACCESS_MANAGEMENT_LIVE to run"
)


@pytest.fixture(autouse=True)
def no_cache(monkeypatch):
    monkeypatch.setattr(access_management, "_cache", {})


async def test_the_access_packages_parse_and_include_the_skills_example():
    packages = {package.code: package for package in await access_management.access_packages()}

    assert packages["regnskap-okonomi-rapport"].usable_in_policy
    assert {package.group for package in packages.values()} >= {"Allment", "Bransje", "Særskilt"}


async def test_the_roles_parse_and_studio_offers_daglig_leder():
    roles = {(role.provider_code, role.code): role for role in await access_management.roles()}

    assert roles[("sys-ccr", "dagl")].usable_in_policy
