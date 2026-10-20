"""Altinn app v9: one UI folder per process task, and the in-repo layout schema."""

from __future__ import annotations

from agents.altinn.layout.properties import VERSION_NEUTRAL_BINDING_CONSTRAINTS
from shared.config.base_config import get_config

from .profile import AppVersionProfile

_LAYOUT_SCHEMA_FILE_NAME = "layout.schema.v1.json"
_LAYOUT_SCHEMA_DISPLAY_URL = (
    "https://github.com/Altinn/altinn-studio/blob/main/"
    "src/common/ts/layout-contract/schemas/json/layout/layout.schema.v1.json"
)

_UI_ANATOMY_PROMPT = """\
- **UI folders** (`App/ui/<taskId>/`) hold the UI of one process task each.  The folder name is the task id in `App/config/process/process.bpmn`; there is no `layout-sets.json`.  Find the task the user is talking about in `process.bpmn`, then edit the layouts under `App/ui/<taskId>/layouts/`.
- **Layouts** (`App/ui/<taskId>/layouts/*.json`) define the UI.  Each layout is a tree of components with `id`, `type`, `dataModelBindings`, and `textResourceBindings`.
- **UI settings**: `App/ui/<taskId>/Settings.json` holds `pages.order`, `defaultDataType` (the data model the task's layouts bind to) and an optional `type` (`subform`).  Settings for every task, such as `showLanguageSelector`, go in `App/ui/Settings.json` as a flat object with no `pages` wrapper: `{"showLanguageSelector": true}`.
- **Logic**: show and hide components with `hidden` expressions, and compute values in a C# `IDataWriteProcessor` registered in `App/Program.cs`.  There is no `RuleConfiguration.json` or `RuleHandler.js`; never create them.  There is no `App/views/Home/Index.cshtml`, and PDF and eFormidling are service tasks in `process.bpmn`, not flags in `applicationmetadata.json`.
- **An unfinished upgrade**: if the app still has `App/ui/layout-sets.json`, `RuleConfiguration.json` or `RuleHandler.js`, its upgrade to v9 was not finished.  Tell the user."""

_VERSION_RULES_PROMPT = """\
8.  **A `Datepicker` stores a date only, unless told otherwise.**  `timeStamp` defaults to `false`, which stores `2026-05-22`: right for a field the data model declares as `"format": "date"`.  Set `"timeStamp": true` only for a field that holds a date *and* a time.  `format` uses Unicode date tokens: `dd.MM.yyyy`, not `DD.MM.YYYY`.
    - ✅ `{"id": "fodselsdato", "type": "Datepicker", "dataModelBindings": {"simpleBinding": "fodselsdato"}}`

9.  **Headings use the `Heading` component.**  `Header` does not exist in v9, and the validator rejects it."""

_DATEPICKER_CONSTRAINTS = [
    '"timeStamp" defaults to false, which stores "yyyy-MM-dd": right for a binding to a '
    'string with "format": "date". Set "timeStamp": true only for a date-time field. '
    '"format" uses Unicode tokens such as "dd.MM.yyyy".'
]

_NO_LAYOUT_SETS = (
    "v9 apps have no layout-sets.json. Each UI folder is named after its process task, "
    "and its Settings.json holds defaultDataType."
)
_NO_RULE_FILES = (
    "v9 apps have no rule files. Show and hide components with a `hidden` expression, "
    "and compute values in a C# IDataWriteProcessor."
)
_NO_INDEX_PAGE = (
    "v9 apps have no Index.cshtml. Put extra scripts and styles in App/config/assets.json, "
    "or in App/wwwroot/custom-js and App/wwwroot/custom-css."
)

V9_PROFILE = AppVersionProfile(
    major_version=9,
    ui_anatomy_prompt=_UI_ANATOMY_PROMPT,
    version_rules_prompt=_VERSION_RULES_PROMPT,
    layout_schema_location=str(get_config().LAYOUT_SCHEMA_V9_DIR / _LAYOUT_SCHEMA_FILE_NAME),
    layout_schema_display_url=_LAYOUT_SCHEMA_DISPLAY_URL,
    binding_constraints={
        **VERSION_NEUTRAL_BINDING_CONSTRAINTS,
        "Datepicker": _DATEPICKER_CONSTRAINTS,
    },
    forbidden_new_file_patterns={
        "App/ui/layout-sets.json": _NO_LAYOUT_SETS,
        "App/ui/*/RuleConfiguration.json": _NO_RULE_FILES,
        "App/ui/*/RuleHandler.js": _NO_RULE_FILES,
        "App/views/Home/Index.cshtml": _NO_INDEX_PAGE,
    },
)
