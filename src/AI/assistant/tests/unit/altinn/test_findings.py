"""Which findings a change caused."""

from __future__ import annotations

from agents.altinn.findings import Finding, split_new_and_old

_OLD = Finding("schema", "title", "value: 42 is not of type 'string'")


def test_a_finding_the_version_before_has_too_is_old():
    split = split_new_and_old([_OLD], [_OLD])

    assert split.new == []
    assert split.old == [_OLD]


def test_a_second_copy_of_an_old_finding_is_new():
    split = split_new_and_old([_OLD, _OLD], [_OLD])

    assert split.new == [_OLD]
    assert split.old == [_OLD]


def test_the_same_message_at_another_location_is_new():
    moved = Finding(_OLD.rule, "subtitle", _OLD.message)

    assert split_new_and_old([moved], [_OLD]).new == [moved]
