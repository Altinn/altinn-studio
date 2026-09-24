"""Altinn app v8: layout sets, and the layout schema of app frontend v4."""

from __future__ import annotations

from agents.altinn.layout.properties import VERSION_NEUTRAL_BINDING_CONSTRAINTS

from .profile import AppVersionProfile

_LAYOUT_SCHEMA_URL = "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"

_UI_ANATOMY_PROMPT = """\
- **Layout sets** (`App/ui/layout-sets.json`) map each layout set id to the process task(s) and data type it belongs to.  An app can have more than one set (form, receipt, subforms).  Read this file first to find which set belongs to the task the user is talking about, then edit the layouts under `App/ui/<layoutSetId>/layouts/`.
- **Layouts** (`App/ui/<layoutSetId>/layouts/*.json`) define the UI.  Each layout is a tree of components with `id`, `type`, `dataModelBindings`, and `textResourceBindings`."""

_VERSION_RULES_PROMPT = """\
8.  **A `Datepicker` bound to a date field must set `"timeStamp": false`.**  The property defaults to `true`, which stores `2026-05-22T00:00:00.000Z` into a field the data model declares as `"format": "date"`, and Studio refuses to render the page.  Write it on every `Datepicker` you emit; only a field that really holds a date *and* a time leaves it out.
    - ❌ `{"id": "fodselsdato", "type": "Datepicker", "dataModelBindings": {"simpleBinding": "fodselsdato"}}`
    - ✅ the same component with `"timeStamp": false`"""

_DATEPICKER_CONSTRAINTS = [
    'A binding to a string with "format": "date" requires "timeStamp": false. '
    "The property defaults to true, which stores a full ISO timestamp against a "
    "date-only field, and Altinn Studio refuses to render the component."
]

V8_PROFILE = AppVersionProfile(
    major_version=8,
    ui_anatomy_prompt=_UI_ANATOMY_PROMPT,
    version_rules_prompt=_VERSION_RULES_PROMPT,
    layout_schema_location=_LAYOUT_SCHEMA_URL,
    layout_schema_display_url=_LAYOUT_SCHEMA_URL,
    binding_constraints={
        **VERSION_NEUTRAL_BINDING_CONSTRAINTS,
        "Datepicker": _DATEPICKER_CONSTRAINTS,
    },
)
