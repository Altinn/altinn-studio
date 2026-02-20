USER GOAL:
{user_goal}

GENERAL PLAN (high-level approach):
{general_plan}

FORM SPECIFICATION (authoritative source of truth for form structure):
{form_spec}

🚨 CRITICAL: FORM SPEC IS THE SOURCE OF TRUTH 🚨

If a FORM SPECIFICATION is provided above, it is the ONLY source of field information. You MUST:

1. **Create one layout file per page** listed in the spec (e.g., side1.json, side2.json, etc.)
2. **Use EXACT field labels** from the spec for textResourceBindings values
3. **Use the field IDs** from the spec as component IDs (prefix with "field-" if needed)
4. **Use the field_type** to choose the correct component (text→Input, checkbox→Checkboxes, radio→RadioButtons, etc.)
5. **Use the description** for tooltip text via textResourceBindings.description
6. **Use data_model_binding** for dataModelBindings.simpleBinding
7. **Update Settings.json** (App/ui/form/Settings.json) with ALL pages from the spec in order

DO NOT invent fields. DO NOT rename labels. DO NOT skip fields from the spec.

Example from spec:
Page: side1 (Section A) — "Søkerinformasjon" - [text] "Søkerens navn" — Fullt juridisk navn \*

Creates:

- Component ID: "field-sokerens-navn" in App/ui/form/layouts/side1.json
- Text resource: "app.field.sokerensNavn" → "Søkerens navn"
- Text resource: "app.field.sokerensNavn.description" → "Fullt juridisk navn"
- dataModelBindings: {{"simpleBinding": "sokerensNavn"}}
- required: true (because of \*)

TOOL RESULTS (use these to understand component schemas, data model patterns, and Altinn conventions):
{tool_results}

CURRENT LAYOUT CONTENT (for component placement reference):
{current_layout_content}

🚨 CRITICAL: LAYOUT FILES ARE MANDATORY 🚨

Every form change MUST include layout file modifications! A form without UI components is useless.

**If creating a new form or adding fields:**

- You MUST add components to the layout file (check REPOSITORY FACTS for the layout path)
- Each data model field needs a corresponding UI component in the layout
- Use the layout file path from REPOSITORY FACTS (e.g., "App/ui/form/layouts/Side1.json")

**If CURRENT LAYOUT CONTENT shows "Not available"**, create a new layout file using insert_json_property operations.

**If CURRENT LAYOUT CONTENT shows existing content**, add new components using insert_json_array_item:

```json
{{
  "file": "App/ui/form/layouts/Side1.json",
  "op": "insert_json_array_item",
  "path": ["data", "layout"],
  "item": {{
    "id": "field-toolname",
    "type": "Input",
    "dataModelBindings": {{"simpleBinding": "toolName"}},
    "textResourceBindings": {{"title": "app.field.toolName"}}
  }}
}}
```

DO NOT generate a patch that only modifies data model and text resources without also adding UI components to the layout!

🚨 CRITICAL: NAVIGATION BUTTONS FOR MULTI-PAGE FORMS 🚨

If the form has MORE THAN ONE layout page, EVERY page MUST have a NavigationButtons component as the LAST component in the layout array.

- First page: NavigationButtons with next only (showBackButton: false)
- Middle pages: NavigationButtons with both back and next (showBackButton: true)
- Last page: NavigationButtons with back only (showBackButton: true)

Example NavigationButtons component:

```json
{{
  "id": "nav-buttons",
  "type": "NavigationButtons",
  "textResourceBindings": {{
    "next": "Neste",
    "back": "Tilbake"
  }},
  "showBackButton": true
}}
```

Without NavigationButtons, users CANNOT navigate between pages and the form is broken!

CURRENT MODEL SCHEMA (for datamodel updates):
{current_model_content}

REPOSITORY FACTS SUMMARY:
{repo_summary}

CRITICAL: Generate the patch JSON with EXACTLY these keys: "files" (array of strings) and "changes" (array of objects).

🚨 CRITICAL: TEXT RESOURCE LOCALE HANDLING 🚨
ONLY use text resource files that ACTUALLY EXIST in the repository.

- Check REPOSITORY FACTS SUMMARY → "resources" array for the EXACT list of resource files
- DO NOT assume any locales (e.g., do NOT add resource.en.json if it doesn't exist)
- DO NOT hardcode locales - use ONLY what you see in the resources array
- Example: If resources shows ["App/config/texts/resource.nb.json", "App/config/texts/resource.nn.json"], use ONLY nb and nn

For every value referenced in textResourceBindings, ensure the patch includes an insert_json_array_item operation inserting {{"id": binding, "value": translated_text}} into EACH resource file listed in REPOSITORY FACTS.

🚨 CRITICAL: TEXT RESOURCE INSERT OPERATION 🚨
Text resource files have a nested structure with "resources" array. When inserting text resources:

- Operation: insert_json_array_item
- Path: Use ["resources"] (points to the resources array inside the root object)
- Item: Use "item" key (NOT "value"!) with the resource object
- Example operation:
  {{
    "file": "App/config/texts/resource.nb.json",
    "op": "insert_json_array_item",
    "path": ["resources"],
    "item": {{"id": "app.field.projectType", "value": "Prosjekttype"}}
  }}

Text resource file structure:
{{
  "language": "nb",
  "resources": [
    {{"id": "app.field.something", "value": "Text"}}
]
}}

CRITICAL: The operation expects "item" key, not "value"! The resource object itself has an "id" and "value".
CRITICAL: Path must be ["resources"], not [] - text resources are nested, not at root level.

IMPORTANT: Before creating any component properties, check the TOOL RESULTS section for altinn_layout_props results to see what properties are valid for each component type. Only use properties that are explicitly validated by the schema.

For datamodel updates, use the CURRENT MODEL SCHEMA to understand the existing structure and add new fields to appropriate schema objects. Follow JSON Schema conventions and avoid unnecessary nesting.

🚨 CRITICAL: FIXING DATA MODEL BINDING ERRORS 🚨

When the USER GOAL contains "data model binding errors" or mentions that a property "was not found" in the data model:

1. The error tells you EXACTLY which fields are MISSING from the data model
2. You MUST add these missing fields to the .schema.json file
3. Look at the CURRENT MODEL SCHEMA to see the existing structure
4. Add new properties following the same pattern as existing ones

Example error: "Ved oppslag av `useFor` i datamodellen ble ikke egenskapen `useFor` funnet. Gyldige egenskaper er: tools, property1"
This means: The field `useFor` does NOT exist in the data model. You MUST add it!

To fix this, add the missing field to the schema's "properties" object:

```json
{{
  "file": "App/models/model.schema.json",
  "op": "insert_json_property",
  "path": ["properties"],
  "key": "useFor",
  "value": {{ "type": "string" }}
}}
```

DO NOT just modify layout files - you MUST add the missing fields to the data model schema!

IMPORTANT: For Altinn datamodels, you should ONLY update the .schema.json file. The .cs and .xsd files will be automatically regenerated from the .schema.json using MCP tools. Do NOT manually update .cs or .xsd files in your patch.

IMPORTANT: Never leave a textResourceBindings reference without a matching resource entry across locales. Create them in the same patch.

CRITICAL: DYNAMIC EXPRESSIONS FORMAT

- When using dynamic expressions for properties like 'hidden', 'required', etc., you MUST use the ARRAY-BASED expression format
- NEVER use raw JavaScript strings like "data.field !== 'value'" - this will cause validation errors
- Altinn expressions use an array-based functional syntax

Expression format rules:

1. All expressions are arrays with a function name as first element
2. Function arguments follow as subsequent elements
3. Data model references use ["dataModel", "fieldName"] format
4. String literals are plain strings (with quotes)
5. Numbers and booleans are plain values

Common expression patterns:

WRONG (raw JavaScript string):
"hidden": "data.tilskuddetsFormaal !== 'driftstilskuddLeietakerorganisasjoner'"

CORRECT (array-based expression):
"hidden": ["not", ["equals", ["dataModel", "tilskuddetsFormaal"], "driftstilskuddLeietakerorganisasjoner"]]

More expression examples:

Check if field equals value:
"hidden": ["equals", ["dataModel", "fieldName"], "specificValue"]

Check if field does NOT equal value:
"hidden": ["not", ["equals", ["dataModel", "fieldName"], "specificValue"]]

Check if field is greater than value:
"hidden": ["greaterThan", ["dataModel", "amount"], 1000]

Complex AND condition (both must be true):
"hidden": [
"and",
["equals", ["dataModel", "type"], "specific"],
["greaterThan", ["dataModel", "amount"], 0]
]

Complex OR condition (at least one must be true):
"hidden": [
"or",
["equals", ["dataModel", "status"], "approved"],
["equals", ["dataModel", "status"], "completed"]
]

Common functions:

- "equals": Check equality
- "notEquals": Check inequality
- "greaterThan", "greaterThanEq": Numeric comparisons
- "lessThan", "lessThanEq": Numeric comparisons
- "and", "or": Logical operators
- "not": Logical negation
- "dataModel": Reference to data model field

CRITICAL: PREFILL IMPLEMENTATION

- If the TOOL RESULTS contain altinn_prefill_docs documentation AND the user goal mentions prefilling or prepopulating data, you MUST implement prefill configuration
- Create a [dataModelName].prefill.json file in App/models/ directory using the insert_json_property operations
- Follow the prefill documentation structure exactly: include $schema, allowOverwrite, and data source mappings (ER, DSF, UserProfile, QueryParameters)
- Pay attention to which data source is appropriate: UserProfile (submitter info, always available), ER (organization data), DSF (person data)

CRITICAL: ALL PREFILL MAPPINGS MUST USE Model. PREFIX

- Every single target field mapping in the prefill configuration MUST start with "Model."
- This is NOT optional - it's required by Altinn's prefill system
- WRONG: "Name": "applicantName"
- CORRECT: "Name": "Model.applicantName"

Prefill mapping examples (FOLLOW THIS EXACT PATTERN):
{{
  "ER": {{
    "OrgNumber": "Model.orgNumber",
    "Name": "Model.applicantName",
    "TelephoneNumber": "Model.applicantPhone",
    "MailingAddress": "Model.address.street",
    "EMailAddress": "Model.applicantEmail"
  }},
"UserProfile": {{
    "PhoneNumber": "Model.contact.phone",
    "Email": "Model.contact.email",
    "ProfileSettingPreference.Language": "Model.preferredLanguage"
  }}
}}

The field name after "Model." must match the dataModelBindings exactly (e.g., if dataModelBindings uses "applicantName", prefill uses "Model.applicantName")

When placing components "after" another field, use the CURRENT LAYOUT CONTENT to identify the correct component ID by finding the component with the matching textResourceBindings.title value.

IMPORTANT: Review the CURRENT LAYOUT CONTENT to see what component IDs already exist. When creating new components that will be children of or reference existing components, use the EXACT IDs you see in the current layout. DO NOT change the casing or format of existing component IDs.

Each change object MUST have these exact fields:

- "file": relative path string (e.g., "App/ui/form/layouts/1.json")
- "op": operation name (one of: "insert_json_array_item", "insert_json_property", "insert_text_at_pattern", "replace_text")

OPERATION FORMATS (follow EXACTLY):

For insert_json_property:
{{
  "file": "path/to/file.json",
  "op": "insert_json_property",
  "path": ["properties"],  // array of strings
  "key": "fieldName",       // string
  "value": "fieldValue"     // any type
}}

For insert_json_array_item:
{{
  "file": "path/to/file.json",
  "op": "insert_json_array_item",
  "path": ["data", "layout"],  // array of strings pointing to array
  "value": {{"id": "component_id", "type": "Input"}}, // object to insert
"insert_after_index": 2 // optional number
}}

For insert_text_at_pattern:
{{
  "file": "path/to/file.cs",
  "op": "insert_text_at_pattern",
  "pattern": "regex_pattern",  // string
  "text": "text_to_insert",     // string
  "find_last": false           // optional boolean
}}

For replace_text:
{{
  "file": "path/to/file.json",
  "op": "replace_text",
  "old_text": "text to replace",    // string
  "new_text": "replacement text"    // string
}}

RULES:

- All paths must be valid JSON paths (arrays of strings)
- All required fields must be present
- Values can be strings, numbers, booleans, objects, or arrays
- Files array should list all files being modified
- Each change must modify exactly one file

═══════════════════════════════════════════════════════════════════════════════════
🚨 MANDATORY PRE-FLIGHT CHECKLIST - INTERNAL VALIDATION ONLY 🚨
═══════════════════════════════════════════════════════════════════════════════════

BEFORE generating the patch JSON, INTERNALLY validate these points (DO NOT output your reasoning - output ONLY the JSON):

✓ COMPONENT STRUCTURE CHECK:
Q: Am I creating multiple individual components for options (field-X-option1, field-X-option2)?
If YES → STOP! Create ONE RadioButtons/Checkboxes component with options array instead
If NO → Continue

✓ PROPERTY VALIDATION CHECK:
Q: Am I adding ANY property that wasn't in the altinn_layout_props results?
If YES → STOP! Remove that property (e.g., placeholder, validation, inputMode)
If NO → Continue

✓ BINDING TYPE CHECK:
Q: Am I using 'list' binding on RadioButtons or any non-Checkboxes component?
If YES → STOP! RadioButtons ONLY uses simpleBinding
If NO → Continue

Q: Am I pointing simpleBinding to an array field in the data model?
If YES → STOP! Create component with options array and scalar binding instead
If NO → Continue

✓ TEXT RESOURCE CHECK:
Q: For EVERY textResourceBindings reference, did I include operations to create that resource in ALL locales?
If NO → STOP! Add the resource creation operations
If YES → Continue

✓ COMPONENT ID CHECK:
Q: Do ANY of my component IDs end with a hyphen followed by 1-5 digits (e.g., -41, -42, -1, -999)?
If YES → STOP! Either remove the hyphen (e.g., 'component41') OR use descriptive suffix (e.g., 'component-boligsosiale')
If NO → Continue

✓ COMPONENT SCHEMA CHECK:
Q: Did I check the altinn_layout_props results for EVERY component type I'm using?
If NO → STOP! You MUST use the schema information to configure components correctly
If YES → Continue - use the schema to set correct defaults and required properties

If you passed all checks above, proceed with generating the patch JSON.
If you failed any check, fix your approach and then generate the corrected patch.

🚨 CRITICAL: LAYOUT SETTINGS JSON FORMAT 🚨

When modifying Settings.json (App/ui/form/Settings.json), the pages.order array MUST be valid JSON:

CORRECT format:
{{
"pages": {{
"order": ["side1", "side2", "side3", "side4", "side5", "side6"]
}}
}}

WRONG (will cause 500 error):
{{
"pages": {{
"order": ["side1", "side2", "side3""side4"] ← Missing comma, causes crash
}}
}}

RULES for Settings.json:

- The file path is ALWAYS App/ui/form/Settings.json — do NOT create App/ui/layoutSettings.json
- Include the $schema property: "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json"
- Each page name must be in quotes
- Page names must be separated by commas
- No duplicate entries
- No missing commas between array elements
- Use lowercase for page names (side1, side2, not Side1, Side2)

🚨 CRITICAL OUTPUT REQUIREMENT 🚨
Your response MUST be ONLY valid JSON. Do NOT include:

- Explanations or reasoning
- Checklist outputs
- Markdown formatting
- Any text before or after the JSON

Start your response with {{ and end with }}
