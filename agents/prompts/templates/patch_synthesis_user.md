USER GOAL:
{user_goal}

GENERAL PLAN:
{general_plan}

IMPLEMENTATION PLAN:
{implementation_plan}

TOOL RESULTS:
{tool_results}

CURRENT LAYOUT CONTENT (for component placement reference):
{current_layout_content}

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

IMPORTANT: Before creating any component properties, check the TOOL RESULTS section for layout_properties_tool results to see what properties are valid for each component type. Only use properties that are explicitly validated by the schema.

For datamodel updates, use the CURRENT MODEL SCHEMA to understand the existing structure and add new fields to appropriate schema objects. Follow JSON Schema conventions and avoid unnecessary nesting.

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
- If the TOOL RESULTS contain prefill_tool documentation AND the user goal mentions prefilling or prepopulating data, you MUST implement prefill configuration
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
  "value": {{"id": "component_id", "type": "Input"}},  // object to insert
  "insert_after_index": 2     // optional number
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
🚨 MANDATORY PRE-FLIGHT CHECKLIST - VALIDATE YOUR APPROACH BEFORE GENERATING PATCH 🚨
═══════════════════════════════════════════════════════════════════════════════════

BEFORE generating the patch JSON, mentally answer these questions:

✓ COMPONENT STRUCTURE CHECK:
Q: Am I creating multiple individual components for options (field-X-option1, field-X-option2)?
If YES → STOP! Create ONE RadioButtons/Checkboxes component with options array instead
If NO → Continue

✓ PROPERTY VALIDATION CHECK:
Q: Am I adding ANY property that wasn't in the layout_properties_tool results?
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

If you passed all checks above, proceed with generating the patch JSON.
If you failed any check, DO NOT generate a patch - fix your approach first.
