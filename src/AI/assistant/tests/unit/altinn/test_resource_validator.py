"""Schema validation of text resources, and which errors block a change."""

from __future__ import annotations

from typing import Any

import pytest

from agents.altinn.app_version import V9_PROFILE
from agents.altinn.layout import get_layout_schema
from agents.altinn.resources.validator import ResourceValidator


@pytest.fixture
def validator() -> ResourceValidator:
    return ResourceValidator(get_layout_schema(V9_PROFILE.text_resources_schema_location))


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
    result = validator.validate(_resources_with_variable_key(key))

    assert result["valid"], result["errors"]


def test_rejects_a_variable_key_that_does_not_match_the_pattern(validator: ResourceValidator):
    result = validator.validate(_resources_with_variable_key("Person Navn"))

    assert not result["valid"]
    assert result["errors"] == [f"[resources.0.variables.0.key] 'Person Navn' does not match {_pattern(validator)!r}"]


def test_accepts_a_default_value_and_custom_text_parameters(validator: ResourceValidator):
    data = {
        "language": "nb",
        "resources": [
            {
                "id": "greeting",
                "value": "Hei {0}, du har {1} feil",
                "variables": [
                    {"key": "Person.Navn", "dataSource": "dataModel.default", "defaultValue": "deg"},
                    {"key": "count", "dataSource": "customTextParameters"},
                ],
            }
        ],
    }

    result = validator.validate(data)

    assert result["valid"], result["errors"]


def _pattern(validator: ResourceValidator) -> str:
    return validator.schema["definitions"]["variable"]["properties"]["key"]["pattern"]


# ---------------------------------------------------------------------------
# Errors the change did not cause
# ---------------------------------------------------------------------------

_INVALID = {"id": "broken", "value": 42}


def _text(resource_id: str, value: str = "Tekst") -> dict[str, Any]:
    return {"id": resource_id, "value": value}


def _file(*resources: dict[str, Any], **root: Any) -> dict[str, Any]:
    return {"language": "nb", "resources": list(resources), **root}


def test_an_error_in_an_unchanged_text_is_a_warning(validator: ResourceValidator):
    previous = _file(_text("title"), _INVALID)

    result = validator.validate(_file(_text("title"), _INVALID, _text("new")), previous=previous)

    assert result["valid"], result["errors"]
    assert any("[resources.1.value] 42 is not of type 'string'" in warning for warning in result["warnings"])


def test_a_moved_text_is_unchanged(validator: ResourceValidator):
    previous = _file(_text("title"), _INVALID)

    result = validator.validate(_file(_text("new"), _INVALID, _text("title")), previous=previous)

    assert result["valid"], result["errors"]


@pytest.mark.parametrize(
    "resources",
    [
        pytest.param([_text("title"), _INVALID], id="added"),
        pytest.param([{"id": "title", "value": 42}], id="edited"),
    ],
)
def test_an_error_in_a_changed_text_blocks(validator: ResourceValidator, resources: list[dict[str, Any]]):
    result = validator.validate(_file(*resources), previous=_file(_text("title")))

    assert not result["valid"]
    assert result["errors"] == [f"[resources.{len(resources) - 1}.value] 42 is not of type 'string'"]


def test_an_existing_duplicate_id_is_a_warning(validator: ResourceValidator):
    previous = _file(_text("title", "A"), _text("title", "B"))

    result = validator.validate(_file(_text("title", "A"), _text("title", "B"), _text("new")), previous=previous)

    assert result["valid"], result["errors"]
    assert any("Duplicate resource ID: 'title'" in warning for warning in result["warnings"])


def test_a_new_duplicate_id_blocks(validator: ResourceValidator):
    previous = _file(_text("title", "A"))

    result = validator.validate(_file(_text("title", "A"), _text("title", "B")), previous=previous)

    assert result["errors"] == ["Duplicate resource ID: 'title'"]


def test_an_error_in_the_file_that_was_there_before_is_a_warning(validator: ResourceValidator):
    previous = _file(_text("title"), comment="old")

    result = validator.validate(_file(_text("title"), _text("new"), comment="old"), previous=previous)

    assert result["valid"], result["errors"]


def test_a_new_error_in_the_file_blocks(validator: ResourceValidator):
    result = validator.validate(_file(_text("title"), comment="new"), previous=_file(_text("title")))

    assert not result["valid"]
    assert result["errors"] == ["[root] Additional properties are not allowed ('comment' was unexpected)"]


def test_every_error_blocks_without_a_previous_version(validator: ResourceValidator):
    result = validator.validate(_file(_text("title"), _INVALID))

    assert result["errors"] == ["[resources.1.value] 42 is not of type 'string'"]
