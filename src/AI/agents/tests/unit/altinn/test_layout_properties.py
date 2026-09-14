"""What the layout schema tool hands the model for one component type."""

from __future__ import annotations

import pytest

from agents.altinn.layout import properties

SCHEMA_URL = "https://altinncdn.no/layout.schema.json"

SCHEMA = {
    "definitions": {
        "AnyComponent": {
            "allOf": [
                {
                    "if": {"properties": {"type": {"const": "Datepicker"}}},
                    "then": {
                        "properties": {
                            "id": {"type": "string"},
                            "timeStamp": {"type": "boolean", "default": True},
                        },
                        "required": ["id"],
                    },
                },
                {
                    "if": {"properties": {"type": {"const": "Header"}}},
                    "then": {"properties": {"id": {"type": "string"}}, "required": ["id"]},
                },
            ]
        }
    }
}


@pytest.fixture(autouse=True)
def offline_schema(monkeypatch):
    monkeypatch.setattr(properties, "load_layout_schema_from_url", lambda url: SCHEMA)


def _props(component_type: str) -> dict:
    return properties.layout_properties_tool(
        user_goal="test", component_type=component_type, schema_url=SCHEMA_URL
    )


def test_datepicker_states_the_binding_constraint_the_schema_cannot_express():
    result = _props("Datepicker")

    assert result["status"] == "success"
    assert result["constraints"], "the pairing is invisible in the property list alone"
    stated = " ".join(result["constraints"])
    assert '"format": "date"' in stated
    assert '"timeStamp": false' in stated


def test_the_constraint_is_stated_before_the_property_list():
    """It is one line in nine kilobytes, so its position is the whole point."""
    result = _props("Datepicker")

    keys = list(result)
    assert keys.index("constraints") < keys.index("allowed_properties")


def test_a_component_with_no_such_pairing_is_still_told_not_to_fill_the_list():
    """Filling every allowed property is the habit that broke the render."""
    assert _props("Header")["constraints"] == [
        "allowed_properties is what this component permits, not a list to fill: "
        "set only the properties the component needs."
    ]


def test_checkboxes_are_warned_off_the_group_binding():
    stated = " ".join(properties.BINDING_CONSTRAINTS["Checkboxes"])

    assert '"group" is a repeating-group binding' in stated
    assert "deletionStrategy" in stated


def test_a_repeating_group_states_all_three_of_its_rules():
    stated = properties.BINDING_CONSTRAINTS["RepeatingGroup"]

    assert any("array in the data model" in line for line in stated)
    assert any('requires "deletionStrategy"' in line for line in stated)
    assert any("must start with the group binding" in line for line in stated)
