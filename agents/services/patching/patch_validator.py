"""
Patch Validation Module
Validates patches and auto-fixes common issues.
"""

import logging
import json
from pathlib import Path

from agents.services.repo import ensure_text_resources_in_patch

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

        added_resource_keys = ensure_text_resources_in_patch(
            patch_data,
            self.repository_path,
        )
        if added_resource_keys:
            log.info(
                "Auto-added %d missing text resources during validation: %s",
                len(added_resource_keys),
                ", ".join(added_resource_keys[:10]) + ("..." if len(added_resource_keys) > 10 else ""),
            )

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
            
            # Call schema validator
            raw_result = await self.mcp_client.call_tool(
                'schema_validator_tool',
                {
                    'json_obj': json.dumps(wrapped_component),
                    'schema_path': "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
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


def validate_non_empty_patch(patch: dict) -> None:
    """
    Validate that patch contains actual changes and isn't empty.
    
    Args:
        patch: Patch dictionary from MCP
        
    Raises:
        Exception: If patch is empty or contains no meaningful changes
    """
    if not patch:
        raise Exception("NO_CHANGES_APPLIED: Patch is null or empty")
    
    changes = patch.get("changes", [])
    if not changes:
        raise Exception("NO_CHANGES_APPLIED: Patch contains no changes")
    
    # Count meaningful changes (not just metadata)
    meaningful_changes = 0
    for change in changes:
        # Check if change has actual content
        if (change.get("value") is not None or 
            change.get("text") is not None or
            change.get("item") is not None):
            meaningful_changes += 1
    
    if meaningful_changes == 0:
        raise Exception("NO_CHANGES_APPLIED: Patch contains no meaningful changes")
    
    log.info(f"Patch validation passed: {meaningful_changes} meaningful changes found")


def validate_applied_diff_count(changed_files: list, repo_path: str) -> None:
    """
    Validate that applied changes resulted in actual file modifications.
    
    Args:
        changed_files: List of files that were supposedly changed
        repo_path: Repository path for git operations
        
    Raises:
        Exception: If no actual changes were applied
    """
    if not changed_files:
        raise Exception("NO_CHANGES_APPLIED: No files were modified")
    
    # Check git diff to see if there are actual changes
    import subprocess
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        
        actual_changed_files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
        
        if not actual_changed_files:
            raise Exception("NO_CHANGES_APPLIED: No file modifications detected by git")
        
        # Count lines changed
        diff_result = subprocess.run(
            ["git", "diff", "--numstat"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        
        total_lines_changed = 0
        for line in diff_result.stdout.split('\n'):
            if line.strip():
                parts = line.split('\t')
                if len(parts) >= 2:
                    try:
                        added = int(parts[0]) if parts[0] != '-' else 0
                        deleted = int(parts[1]) if parts[1] != '-' else 0
                        total_lines_changed += added + deleted
                    except ValueError:
                        pass  # Skip binary files or other formats
        
        if total_lines_changed == 0:
            raise Exception("NO_CHANGES_APPLIED: No line changes detected in git diff")
        
        log.info(f"Applied diff validation passed: {len(actual_changed_files)} files, {total_lines_changed} lines changed")
        
    except subprocess.CalledProcessError as e:
        log.warning(f"Git diff check failed: {e}")
        # Don't fail the validation if git isn't available
