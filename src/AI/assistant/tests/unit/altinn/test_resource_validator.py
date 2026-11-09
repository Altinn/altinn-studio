"""Text resource errors as findings, and which of them a change caused."""

from __future__ import annotations

import json
from typing import Any

import pytest

from agents.altinn.app_version import V9_PROFILE
from agents.altinn.findings import Finding, split_new_and_old
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
    assert validator.find_errors(_resources_with_variable_key(key)) == []


def test_rejects_a_variable_key_that_does_not_match_the_pattern(validator: ResourceValidator):
    findings = validator.find_errors(_resources_with_variable_key("Person Navn"))

    assert findings == [
        Finding("schema", "greeting", f"variables.0.key: 'Person Navn' does not match {_pattern(validator)!r}")
    ]


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

    assert validator.find_errors(data) == []


def _pattern(validator: ResourceValidator) -> str:
    return validator.schema["definitions"]["variable"]["properties"]["key"]["pattern"]


# ---------------------------------------------------------------------------
# Where a finding is
# ---------------------------------------------------------------------------

_INVALID = {"id": "broken", "value": 42}
_INVALID_FINDING = Finding("schema", "broken", "value: 42 is not of type 'string'")


def _text(resource_id: str, value: str = "Tekst") -> dict[str, Any]:
    return {"id": resource_id, "value": value}


def _file(*resources: Any, **root: Any) -> dict[str, Any]:
    return {"language": "nb", "resources": list(resources), **root}


def test_an_error_in_a_text_is_at_its_id(validator: ResourceValidator):
    assert validator.find_errors(_file(_text("title"), _INVALID)) == [_INVALID_FINDING]


def test_a_text_without_an_id_is_named_by_its_content(validator: ResourceValidator):
    findings = validator.find_errors(_file({"value": "Tekst"}))

    assert [finding.location for finding in findings] == [json.dumps({"value": "Tekst"})]


def test_an_error_in_the_file_itself_has_no_text(validator: ResourceValidator):
    findings = validator.find_errors(_file(_text("title"), comment="x"))

    assert findings == [Finding("schema", "", "Additional properties are not allowed ('comment' was unexpected)")]


def test_text_that_is_not_json_is_one_finding(validator: ResourceValidator):
    findings = validator.find_errors_in_text('{"resources": [')

    assert [finding.rule for finding in findings] == ["invalid-json"]


# ---------------------------------------------------------------------------
# Errors the change did not cause
# ---------------------------------------------------------------------------


def _split(validator: ResourceValidator, after: dict[str, Any], before: dict[str, Any]):
    return split_new_and_old(validator.find_errors(after), validator.find_errors(before))


def test_an_error_in_a_text_the_change_moved_down_is_old(validator: ResourceValidator):
    """The error was at `resources.1` and is at `resources.2` after the change."""
    split = _split(validator, _file(_text("new"), _text("title"), _INVALID), _file(_text("title"), _INVALID))

    assert split.new == []
    assert split.old == [_INVALID_FINDING]


@pytest.mark.parametrize(
    "before",
    [
        pytest.param(_file(_text("title")), id="added"),
        pytest.param(_file(_text("title"), _text("broken")), id="edited"),
    ],
)
def test_an_error_in_a_text_the_change_added_or_broke_is_new(validator: ResourceValidator, before: dict[str, Any]):
    split = _split(validator, _file(_text("title"), _INVALID), before)

    assert split.new == [_INVALID_FINDING]


def test_an_error_that_a_text_keeps_through_an_edit_is_old(validator: ResourceValidator):
    before = _file(_resources_with_variable_key("Person Navn")["resources"][0])
    after = _file({**before["resources"][0], "value": "Hallo {0}"})

    split = _split(validator, after, before)

    assert split.new == []
    assert [finding.location for finding in split.old] == ["greeting"]


def test_an_existing_duplicate_id_is_old(validator: ResourceValidator):
    before = _file(_text("title", "A"), _text("title", "B"))

    split = _split(validator, _file(_text("title", "A"), _text("title", "B"), _text("new")), before)

    assert split.new == []
    assert split.old == [Finding("duplicate-id", "title", "more than one text resource has this ID")]


def test_a_new_copy_of_an_existing_duplicate_id_is_new(validator: ResourceValidator):
    before = _file(_text("title", "A"), _text("title", "B"))

    split = _split(validator, _file(_text("title", "A"), _text("title", "B"), _text("title", "C")), before)

    assert split.new == [Finding("duplicate-id", "title", "more than one text resource has this ID")]
    assert len(split.old) == 1


def test_an_error_in_the_file_that_was_there_before_is_old(validator: ResourceValidator):
    split = _split(validator, _file(_text("title"), _text("new"), comment="old"), _file(_text("title"), comment="old"))

    assert split.new == []


def test_a_new_error_in_the_file_is_new(validator: ResourceValidator):
    split = _split(validator, _file(_text("title"), comment="new"), _file(_text("title")))

    assert split.new == [Finding("schema", "", "Additional properties are not allowed ('comment' was unexpected)")]
