"""What the layout schema tool hands the model for one component type."""

from __future__ import annotations

from agents.altinn.app_version import V8_PROFILE
from agents.altinn.layout import properties

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


def _props(component_type: str) -> dict:
    return properties.layout_properties_tool(
        user_goal="test",
        component_type=component_type,
        schema=SCHEMA,
        binding_constraints=V8_PROFILE.binding_constraints,
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


def test_an_unknown_component_is_told_which_component_types_the_schema_has():
    result = _props("Textfield")

    assert result["error_code"] == "COMPONENT_NOT_FOUND"
    assert "Component types in the schema: Datepicker, Header." in result["message"]


def test_an_unknown_component_is_not_sent_to_a_tool_that_does_not_exist():
    result = _props("Textfield")

    assert "layout_components_tool" not in str(result)


def test_the_list_and_the_lookup_read_the_same_component_types():
    schema = {
        "allOf": [
            {
                "if": {"properties": {"type": {"const": "Paragraph"}}},
                "then": {"properties": {"id": {"type": "string"}}},
            },
            {"if": {"properties": {"type": {"const": "NoDefinition"}}}},
        ]
    }

    listed = properties.list_component_types(schema)

    assert listed == ["Paragraph"]
    assert all(properties.find_component_definition(schema, name) for name in listed)
    assert properties.find_component_definition(schema, "NoDefinition") is None


def test_checkboxes_are_warned_off_the_group_binding():
    stated = " ".join(V8_PROFILE.binding_constraints["Checkboxes"])

    assert '"group" is a repeating-group binding' in stated
    assert "deletionStrategy" in stated


def test_a_repeating_group_states_all_three_of_its_rules():
    stated = V8_PROFILE.binding_constraints["RepeatingGroup"]

    assert any("array in the data model" in line for line in stated)
    assert any('requires "deletionStrategy"' in line for line in stated)
    assert any("must start with the group binding" in line for line in stated)


def test_only_the_constraints_passed_in_are_reported():
    result = properties.layout_properties_tool(
        user_goal="test",
        component_type="Datepicker",
        schema=SCHEMA,
        binding_constraints={},
    )

    assert result["constraints"] == [properties._BINDING_ADVICE]
