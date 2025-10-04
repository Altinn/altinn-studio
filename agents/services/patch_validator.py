"""
Patch Validation Module
Validates patches and auto-fixes common issues.
"""

import logging
import json
from pathlib import Path

log = logging.getLogger(__name__)


class PatchValidator:
    """Validates and auto-fixes patches before applying them."""
    
    def __init__(self, mcp_client, repository_path: str):
        self.mcp_client = mcp_client
        self.repository_path = repository_path
    
    async def validate_patch(self, patch_data: dict) -> tuple[bool, list[str], list[str]]:
        """
        Validate all changes in a patch.
        
        Returns:
            (is_valid, errors, warnings)
        """
        validation_errors = []
        validation_warnings = []
        
        for i, change in enumerate(patch_data.get('changes', [])):
            operation = change.get('operation')
            file_path = change.get('file', '')
            
            log.info(f"Validating change {i}: operation={operation}, file={file_path}")
            
            # Validate layout components (only for layout files)
            if operation == 'add_component' and file_path and 'layouts' in file_path:
                errors, warnings = await self._validate_layout_component(change, i)
                validation_errors.extend(errors)
                validation_warnings.extend(warnings)
            
            # Validate resources
            elif operation == 'add_resource':
                errors, warnings = await self._validate_resource(change, i)
                validation_errors.extend(errors)
                validation_warnings.extend(warnings)
        
        is_valid = len(validation_errors) == 0
        return is_valid, validation_errors, validation_warnings
    
    async def _validate_layout_component(self, change: dict, index: int) -> tuple[list[str], list[str]]:
        """Validate a layout component and auto-fix if possible."""
        errors = []
        warnings = []
        
        component = change.get('component')
        if not component:
            return errors, warnings
        
        try:
            # Wrap component in layout file structure for validation
            wrapped_component = {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                "data": {
                    "layout": [component]
                }
            }
            
            # Call layout validator
            raw_result = await self.mcp_client.call_tool(
                'layout_validator_tool',
                {
                    'layout_json': json.dumps(wrapped_component),
                    'existing_layout_path': str(Path(self.repository_path) / change.get('file')),
                    'repo_path': self.repository_path
                }
            )
            
            # Extract result from MCP response
            if isinstance(raw_result, list) and len(raw_result) > 0:
                result_text = raw_result[0].text if hasattr(raw_result[0], 'text') else str(raw_result[0])
                validation_result = json.loads(result_text)
            else:
                validation_result = raw_result
            
            log.info(f"Layout validation result: valid={validation_result.get('valid')}")
            
            if not validation_result.get('valid', True):
                result_errors = validation_result.get('errors', [])
                result_warnings = validation_result.get('warnings', [])
                suggestions = validation_result.get('suggestions', {})
                
                log.warning(f"Layout validation failed for change {index}: {result_errors}")
                log.info(f"Validation suggestions: {suggestions}")
                
                # Try auto-fix
                fixed = self._auto_fix_component(component, result_errors, suggestions, change)
                
                if not fixed:
                    errors.extend(result_errors)
                
                warnings.extend(result_warnings)
        
        except Exception as e:
            log.warning(f"Layout validation error: {e}")
        
        return errors, warnings
    
    def _auto_fix_component(self, component: dict, errors: list[str], suggestions: dict, change: dict) -> bool:
        """
        Auto-fix component issues.
        
        Returns True if all errors were fixed.
        """
        fixed_count = 0
        
        # Fix 1: Use suggested unique IDs
        if suggestions.get('unique_ids'):
            old_id = component.get('id')
            new_id = suggestions['unique_ids'].get(old_id)
            if new_id:
                log.info(f"Auto-fixing: Changing component ID from '{old_id}' to '{new_id}'")
                component['id'] = new_id
                change['component'] = component
                fixed_count += 1
        
        # Fix 2: Invalid ID patterns (e.g., '1.3-Test' -> '1-3-Test-Input')
        if any('does not match' in e or 'pattern' in e.lower() for e in errors):
            old_id = component.get('id')
            component_type = component.get('type', 'Component')
            
            # Replace dots with dashes
            new_id = old_id.replace('.', '-')
            
            # Append component type if not already present
            if not new_id.endswith(f'-{component_type}'):
                new_id = f"{new_id}-{component_type}"
            
            log.info(f"Auto-fixing invalid ID pattern: '{old_id}' -> '{new_id}'")
            component['id'] = new_id
            change['component'] = component
            
            # Update text resource binding to match new ID
            if 'textResourceBindings' in component:
                for key, value in component['textResourceBindings'].items():
                    if old_id.replace('.', '-') in value or old_id in value:
                        component['textResourceBindings'][key] = f"{new_id}.{key}"
            
            fixed_count += 1
        
        # Return True if we fixed at least one error
        return fixed_count > 0
    
    async def _validate_resource(self, change: dict, index: int) -> tuple[list[str], list[str]]:
        """Validate a resource addition."""
        errors = []
        warnings = []
        
        resource_id = change.get('resource_id')
        resource_value = change.get('resource_value')
        
        if not resource_id:
            errors.append("Missing resource_id")
        
        if not resource_value:
            errors.append("Missing resource_value")
        
        try:
            # Call resource validator if available
            raw_result = await self.mcp_client.call_tool(
                'resource_validator_tool',
                {
                    'resource_id': resource_id,
                    'resource_value': resource_value,
                    'repo_path': self.repository_path
                }
            )
            
            # Extract result
            if isinstance(raw_result, list) and len(raw_result) > 0:
                result_text = raw_result[0].text if hasattr(raw_result[0], 'text') else str(raw_result[0])
                validation_result = json.loads(result_text)
            else:
                validation_result = raw_result
            
            if not validation_result.get('valid', True):
                errors.extend(validation_result.get('errors', []))
                warnings.extend(validation_result.get('warnings', []))
        
        except Exception as e:
            log.debug(f"Resource validation skipped: {e}")
        
        return errors, warnings
