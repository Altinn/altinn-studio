VALIDATION ERRORS TO FIX:
{errors_summary}

CURRENT FILE CONTENTS:
{file_contents}

Generate a minimal patch to fix ONLY the validation errors above. Use these operation types:
- replace_text: Replace existing text with fixed version
- insert_json_property: Add missing properties to JSON objects

For missing required properties like 'value', analyze the component type and context to determine the appropriate value.
Common fixes:
- Missing 'value' property on Header/Paragraph components: Add a text value or empty string
- Missing required component properties: Add with appropriate default values based on component type

Return JSON with exactly these keys:
{{{{
  "files": ["relative/path/to/file.json"],
  "changes": [
    {{{{
      "file": "relative/path/to/file.json",
      "op": "replace_text",
      "old_text": "exact text to replace",
      "new_text": "corrected text"
    }}}}
  ]
}}}}
