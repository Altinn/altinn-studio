"""Resource validator tool with schema validation and business rules"""
import json
from typing import Dict, Any, List
from pathlib import Path
from .base_validator import BaseValidator
from server.tools import register_tool
from mcp.types import ToolAnnotations


class ResourceValidator(BaseValidator):
    """Validator for Altinn text resource files"""
    
    def __init__(self):
        super().__init__(
            'https://altinncdn.no/schemas/json/text-resources/text-resources.schema.v1.json'
        )
    
    def validate_business_rules(self, data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate resource-specific business rules
        
        Context keys:
            - language: Language code (nb, nn, en)
            - layout_files: List of layout file paths to check usage
            - repo_path: Path to repository root
        """
        errors = []
        warnings = []
        suggestions = {}
        
        # Extract resources
        resources = data.get('resources', [])
        if not resources:
            return {"errors": ["No resources found in file"], "warnings": [], "suggestions": {}}
        
        resource_ids = [r.get('id') for r in resources if r.get('id')]
        
        # Rule 1: Check for duplicate resource IDs
        duplicate_ids = [id for id in resource_ids if resource_ids.count(id) > 1]
        if duplicate_ids:
            errors.append(f"Duplicate resource IDs: {list(set(duplicate_ids))}")
        
        # Rule 2: Check if resources are actually used in layouts
        layout_files = context.get('layout_files', [])
        if layout_files:
            used_refs = set()
            for layout_file in layout_files:
                used_refs.update(self._extract_text_refs_from_layout(layout_file))
            
            unused = set(resource_ids) - used_refs
            if unused:
                warnings.append(f"Unused resources (not referenced in layouts): {list(unused)[:5]}")
                if len(unused) > 5:
                    warnings.append(f"... and {len(unused) - 5} more unused resources")
            
            # Check for missing resources (referenced in layout but not defined)
            missing = used_refs - set(resource_ids)
            if missing:
                errors.append(f"Resources referenced in layouts but not defined: {list(missing)}")
        
        # Rule 3: Check for missing translations
        language = context.get('language', 'nb')
        repo_path = context.get('repo_path')
        
        if repo_path:
            other_resources = self._get_other_language_resources(repo_path, language)
            
            for lang, other_ids in other_resources.items():
                missing_in_current = set(other_ids) - set(resource_ids)
                missing_in_other = set(resource_ids) - set(other_ids)
                
                if missing_in_current:
                    warnings.append(
                        f"Missing translations from {lang}: {list(missing_in_current)[:3]}"
                    )
                    if len(missing_in_current) > 3:
                        warnings.append(f"... and {len(missing_in_current) - 3} more")
                
                if missing_in_other:
                    suggestions[f'add_to_{lang}_file'] = list(missing_in_other)[:5]
        
        # Rule 4: Check for empty values
        empty_values = [r.get('id') for r in resources if not r.get('value', '').strip()]
        if empty_values:
            warnings.append(f"Resources with empty values: {empty_values}")
        
        # Rule 5: Suggest next ID based on pattern
        if resource_ids:
            suggestions['id_pattern_detected'] = self._detect_resource_id_pattern(resource_ids)
            suggestions['next_suggested_id'] = self._suggest_next_id(resource_ids)
        
        return {
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions
        }
    
    def _extract_text_refs_from_layout(self, layout_path: str) -> List[str]:
        """Extract all textResourceBindings references from a layout file"""
        try:
            with open(layout_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract components
            if 'data' in data and 'layout' in data['data']:
                components = data['data']['layout']
            elif isinstance(data, list):
                components = data
            else:
                return []
            
            refs = []
            for comp in components:
                text_bindings = comp.get('textResourceBindings', {})
                for key, value in text_bindings.items():
                    if value:
                        refs.append(value)
            
            return refs
        except Exception:
            return []
    
    def _get_other_language_resources(self, repo_path: str, current_lang: str) -> Dict[str, List[str]]:
        """Get resource IDs from other language files"""
        try:
            resource_dir = Path(repo_path) / 'App' / 'config' / 'texts'
            if not resource_dir.exists():
                return {}
            
            other_resources = {}
            for resource_file in resource_dir.glob('resource.*.json'):
                # Extract language code (e.g., 'nb' from 'resource.nb.json')
                lang = resource_file.stem.split('.')[-1]
                
                if lang != current_lang:
                    try:
                        with open(resource_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        resources = data.get('resources', [])
                        other_resources[lang] = [r.get('id') for r in resources if r.get('id')]
                    except Exception:
                        continue
            
            return other_resources
        except Exception:
            return {}
    
    def _detect_resource_id_pattern(self, resource_ids: List[str]) -> str:
        """Detect common resource ID pattern"""
        if not resource_ids:
            return "unknown"
        
        # Check for common patterns
        patterns = {
            'dotted': 0,      # label.field.name
            'underscored': 0, # label_field_name
            'simple': 0       # fieldname
        }
        
        for rid in resource_ids:
            if '.' in rid:
                patterns['dotted'] += 1
            elif '_' in rid:
                patterns['underscored'] += 1
            else:
                patterns['simple'] += 1
        
        # Return most common pattern
        return max(patterns, key=patterns.get)
    
    def _suggest_next_id(self, resource_ids: List[str]) -> str:
        """Suggest next resource ID based on pattern"""
        if not resource_ids:
            return "label.new.field"
        
        pattern = self._detect_resource_id_pattern(resource_ids)
        
        if pattern == 'dotted':
            # Try to find common prefix
            if all('.' in rid for rid in resource_ids):
                prefixes = [rid.split('.')[0] for rid in resource_ids]
                most_common_prefix = max(set(prefixes), key=prefixes.count)
                return f"{most_common_prefix}.new.field"
        
        elif pattern == 'underscored':
            return "label_new_field"
        
        return "new_field"


@register_tool(
    name="resource_validator_tool",
    description="""
Validates Altinn text resource JSON against schema and business rules.

## Purpose
Check text resource files for schema compliance, duplicates, unused resources, and missing translations.

## Required Parameters
- `resource_json`: JSON string of the text resource file content

## Optional Parameters
- `language`: Language code (nb, nn, en) - default: "nb"
- `layout_files`: List of layout file paths to check if resources are used
- `repo_path`: Repository root path for cross-language validation

## Validation Checks
1. **Schema compliance**: Valid JSON structure per Altinn schema
2. **Duplicate IDs**: No duplicate resource IDs
3. **Unused resources**: Resources not referenced in layouts (if layout_files provided)
4. **Missing translations**: Resources missing in other language files (if repo_path provided)
5. **Empty values**: Resources with empty text values
6. **ID patterns**: Suggests next ID based on detected naming pattern

## Returns
- `valid`: true | false
- `errors`: Critical issues that must be fixed
- `warnings`: Non-critical issues to review
- `suggestions`: Helpful recommendations (e.g., next ID suggestion)

## ⚠️ MANDATORY: Must Run After Creating/Modifying Resources
This validation is REQUIRED - not optional. A task is incomplete without it.

If you created or modified ANY resource file (resource.nb.json, etc.), you MUST call this tool before finishing.

## When to Use
✅ **REQUIRED** after creating any resource file
✅ **REQUIRED** after modifying any existing resource file (e.g., resource.nb.json)
✅ To find unused or missing resources
✅ To check translation completeness across languages

## When NOT to Use
❌ To understand resource format (use `resource_tool` instead)
❌ To validate layout JSON (use `schema_validator_tool` instead)

## Common Errors
- "Invalid JSON" → The resource_json is malformed
- "Duplicate resource IDs" → Same ID used multiple times
- "Resources referenced but not defined" → Layout uses missing resource ID
""",
    annotations=ToolAnnotations(
        title="Resource Validator Tool",
        readOnlyHint=True
    )
)
def resource_validator_tool(
    user_goal: str,
    resource_json: str,
    language: str = "nb",
    layout_files: List[str] = None,
    repo_path: str = None
) -> Dict[str, Any]:
    """
    Validate text resource JSON with schema and business rules
    """
    try:
        # Parse input
        try:
            data = json.loads(resource_json)
        except json.JSONDecodeError as e:
            return {
                "valid": False,
                "error_code": "INVALID_JSON",
                "errors": [f"JSON_PARSE_ERROR: The resource_json is not valid JSON. Error: {str(e)}"],
                "warnings": [],
                "suggestions": {},
                "schema_url": None,
                "hint": "Check for: missing quotes, trailing commas, unescaped characters in the JSON.",
                "retry_allowed": False
            }
        
        # Create validator and run validation
        validator = ResourceValidator()
        
        context = {
            'language': language
        }
        if layout_files:
            context['layout_files'] = layout_files
        if repo_path:
            context['repo_path'] = repo_path
        
        result = validator.validate(data, context)
        
        return result
    
    except Exception as e:
        return {
            "valid": False,
            "errors": [f"Validation error: {str(e)}"],
            "warnings": [],
            "suggestions": {},
            "schema_url": None
        }
