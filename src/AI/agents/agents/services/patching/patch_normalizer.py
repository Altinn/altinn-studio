"""
Patch Normalization Module
Handles different LLM output formats and normalizes them to a consistent structure.
"""

import logging
import json

log = logging.getLogger(__name__)


def normalize_patch_structure(patch_data: dict) -> dict:
    """
    Normalize patch data from various LLM output formats to a consistent structure.
    
    Expected output format:
    {
        "files": ["path1", "path2"],
        "changes": [
            {
                "file": "path",
                "operation": "add_component|add_resource|add_property|...",
                "reason": "why",
                "component": {...},  # for add_component
                "resource_id": "...", "resource_value": "...",  # for add_resource
                "property_name": "...", "property_type": "..."  # for add_property
            }
        ]
    }
    """
    
    # Ensure required top-level keys exist
    if 'files' not in patch_data:
        patch_data['files'] = []
    if 'changes' not in patch_data:
        patch_data['changes'] = []
    if 'summary' not in patch_data:
        patch_data['summary'] = "Patch generated (no summary provided)"
    if 'already_applied' not in patch_data:
        patch_data['already_applied'] = False
    
    # Normalize file structure - handle multiple formats
    if patch_data['files'] and isinstance(patch_data['files'][0], dict):
        first_file = patch_data['files'][0]
        
        # Format 1: Nested format with changes inside each file
        if 'changes' in first_file:
            normalized_files = []
            normalized_changes = []
            
            for file_entry in patch_data['files']:
                file_path = file_entry.get('file')
                if file_path:
                    normalized_files.append(file_path)
                    
                    # Flatten changes from this file
                    file_changes = file_entry.get('changes', [])
                    log.info(f"File {file_path} has {len(file_changes)} changes (nested format)")
                    for change in file_changes:
                        change['file'] = file_path
                        normalized_changes.append(change)
            
            patch_data['files'] = normalized_files
            patch_data['changes'] = normalized_changes
            log.info(f"Normalized nested patch structure to flat format: {len(normalized_files)} files, {len(normalized_changes)} changes")
        
        #TODO: This is weird, what is a GPT-5 format? Figure out what this is
        # Format 2: GPT-5 format with full file content
        elif 'content' in first_file or 'file' in first_file:
            file_content_map = {}
            normalized_files = []
            
            for f in patch_data['files']:
                file_path = f.get('file')
                if file_path:
                    normalized_files.append(file_path)
                    if 'content' in f:
                        file_content_map[file_path] = f['content']
            
            patch_data['files'] = normalized_files
            patch_data['_file_content_map'] = file_content_map
            log.info(f"Normalized GPT-5 format: {len(normalized_files)} files, changes array separate, {len(file_content_map)} with content")
    else:
        log.info(f"Files already in flat format: {len(patch_data['files'])} files, {len(patch_data.get('changes', []))} changes")
    
    # Normalize operation-specific fields in changes
    file_content_map = patch_data.get('_file_content_map', {})
    
    for change in patch_data.get('changes', []):
        operation = change.get('operation')
        file_path = change.get('file')
        
        # Normalize add_component
        if operation == 'add_component':
            if 'content' in change and 'component' not in change:
                change['component'] = change.pop('content')
                log.info(f"Normalized add_component: content -> component")
            elif 'details' in change and 'component' not in change:
                change['component'] = change.pop('details')
                log.info(f"Normalized add_component: details -> component")
            elif 'component' not in change and file_path in file_content_map:
                # Extract component from full file content (GPT-5 format)
                log.warning(f"Component not in change, tried to extract from file content map but not implemented")
        
        # Normalize add_resource
        if operation == 'add_resource':
            # Format 1: {"resource": {"id": "x", "value": "y"}}
            if 'resource' in change and isinstance(change['resource'], dict):
                resource = change.pop('resource')
                change['resource_id'] = resource.get('id')
                change['resource_value'] = resource.get('value')
                log.info(f"Normalized add_resource: resource dict -> fields")
            
            # Format 2: {"content": {"id": "x", "value": "y"}}
            elif 'content' in change and isinstance(change['content'], dict):
                content = change.pop('content')
                change['resource_id'] = content.get('id')
                change['resource_value'] = content.get('value')
                log.info(f"Normalized add_resource: content dict -> fields")
            
            # Format 3: {"details": {"id": "x", "value": "y"}} (GPT-5 format) # TODO: vibe coding🤘🏻
            elif 'details' in change and isinstance(change['details'], dict):
                details = change.pop('details')
                change['resource_id'] = details.get('id')
                change['resource_value'] = details.get('value')
                log.info(f"Normalized add_resource: details dict -> fields")
    
    # Clean up temporary fields
    if '_file_content_map' in patch_data:
        del patch_data['_file_content_map']
    
    return patch_data
