"""Tests for FormSpec — option coercion and summary rendering.

Covers the schema fix that lets `FormSpecField.options` accept either
the canonical `{label, value}` object shape (what the spec-extraction
prompt now emits) or legacy bare strings (lifted via a slug fallback).
"""

from __future__ import annotations

import pytest

from agents.graph.state import FormSpec, FormSpecField, FormSpecOption, FormSpecPage


class TestFormSpecOptionCoercion:
    def test_accepts_label_value_objects(self):
        field = FormSpecField(
            id="sokertype",
            label="Type søknad",
            field_type="radio",
            options=[
                {"label": "Ny bevilling", "value": "ny-bevilling"},
                {"label": "Fornyelse", "value": "fornyelse"},
            ],
        )
        assert field.options is not None
        assert all(isinstance(o, FormSpecOption) for o in field.options)
        assert field.options[0].label == "Ny bevilling"
        assert field.options[0].value == "ny-bevilling"

    def test_lifts_legacy_bare_strings_with_slug_fallback(self):
        # Older prompts and existing tests may still emit plain strings.
        # The coercion must slugify Norwegian extras (æøå) too.
        field = FormSpecField(
            id="lang",
            label="Språk",
            field_type="dropdown",
            options=["Bokmål", "Nynorsk", "English"],
        )
        assert [o.label for o in field.options] == ["Bokmål", "Nynorsk", "English"]
        assert [o.value for o in field.options] == ["bokmaal", "nynorsk", "english"]

    def test_mixed_shapes_are_normalised(self):
        field = FormSpecField(
            id="x",
            label="X",
            field_type="radio",
            options=["Bare string", {"label": "Object", "value": "obj"}],
        )
        assert field.options[0].value == "bare-string"
        assert field.options[1].value == "obj"

    def test_none_options_stays_none(self):
        field = FormSpecField(id="name", label="Name", field_type="text", options=None)
        assert field.options is None

    def test_object_without_value_raises(self):
        # Once the model returns a dict, both keys are required — we
        # don't silently fabricate a value from the label, since that's
        # exactly what callers asked the model to provide explicitly.
        with pytest.raises(Exception):
            FormSpecField(
                id="x",
                label="X",
                field_type="radio",
                options=[{"label": "Foo"}],
            )


class TestFormSpecSummary:
    def test_options_render_as_label_value_pairs(self):
        spec = FormSpec(
            title="Søknad om salgsbevilling",
            language="nb",
            total_pages=1,
            pages=[
                FormSpecPage(
                    page_name="del-a",
                    title="Del A",
                    section_id="A",
                    fields=[
                        FormSpecField(
                            id="sokertype",
                            label="Type søknad",
                            field_type="radio",
                            options=[
                                {"label": "Ny bevilling", "value": "ny-bevilling"},
                                {"label": "Fornyelse", "value": "fornyelse"},
                            ],
                        )
                    ],
                )
            ],
        )
        summary = spec.to_summary()
        assert "[Ny bevilling (ny-bevilling), Fornyelse (fornyelse)]" in summary
