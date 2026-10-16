"""Schema validation of text resources."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from agents.altinn.resources.validator import ResourceValidator

_SCHEMA_PATH = (
    Path(__file__).resolve().parents[5]
    / "common/ts/layout-contract/schemas/json/text-resources/text-resources.schema.v1.json"
)


@pytest.fixture
def validator() -> ResourceValidator:
    resource_validator = ResourceValidator()
    resource_validator.schema = json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))
    return resource_validator


def _resources_with_variable_key(key: str) -> dict:
    return {
        "language": "nb",
        "resources": [
            {
                "id": "greeting",
                "value": "Hei {0}",
                "variables": [{"key": key, "dataSource": "dataModel.default"}],
            }
        ],
    }


@pytest.mark.parametrize("key", ["Person.Navn", "Søker.Etternavn", "items[{0}].name"])
def test_accepts_variable_keys_that_match_the_unicode_pattern(validator: ResourceValidator, key: str):
    is_valid, errors = validator.validate_against_schema(_resources_with_variable_key(key))

    assert is_valid, errors


def test_rejects_a_variable_key_that_does_not_match_the_pattern(validator: ResourceValidator):
    is_valid, errors = validator.validate_against_schema(_resources_with_variable_key("Person Navn"))

    assert not is_valid
    assert errors == [f"[resources.0.variables.0.key] 'Person Navn' does not match {_pattern(validator)!r}"]


def _pattern(validator: ResourceValidator) -> str:
    assert validator.schema is not None
    return validator.schema["definitions"]["variable"]["properties"]["key"]["pattern"]
