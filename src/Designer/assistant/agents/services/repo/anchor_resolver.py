"""
Anchor resolution service for deterministic component positioning.
Resolves anchor strategies to concrete indices before patch application.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

from agents.schemas.plan_schema import Anchor, AnchorStrategy
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class AnchorResolutionError(Exception):
    """Raised when anchor cannot be resolved"""
    def __init__(self, message: str, anchor: Anchor, layout_path: str):
        self.message = message
        self.anchor = anchor
        self.layout_path = layout_path
        super().__init__(message)


class AnchorResolver:
    """Resolves anchor strategies to concrete array indices"""
    
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
    
    def resolve_anchor(self, layout_path: str, anchor: Anchor) -> int:
        """
        Resolve anchor strategy to concrete index in layout array.
        
        Args:
            layout_path: Relative path to layout file (e.g., "App/ui/form/layouts/1.json")
            anchor: Anchor strategy to resolve
            
        Returns:
            Concrete index where new component should be inserted
            
        Raises:
            AnchorResolutionError: If anchor cannot be resolved
        """
        full_path = self.repo_path / layout_path
        
        if not full_path.exists():
            raise AnchorResolutionError(
                f"Layout file not found: {layout_path}",
                anchor, layout_path
            )
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            raise AnchorResolutionError(
                f"Failed to parse layout JSON: {e}",
                anchor, layout_path
            )
        
        # Extract layout array from various JSON structures
        arr = self._extract_layout_array(data)
        
        if not isinstance(arr, list):
            raise AnchorResolutionError(
                f"Layout data is not an array: {type(arr)}",
                anchor, layout_path
            )
        
        # Resolve based on strategy
        if anchor.strategy == AnchorStrategy.AFTER_COMPONENT_WITH_TEXT_KEY:
            return self._resolve_after_text_key(arr, anchor.text_key, anchor, layout_path)
        
        elif anchor.strategy == AnchorStrategy.AFTER_COMPONENT_WITH_ID:
            return self._resolve_after_component_id(arr, anchor.component_id, anchor, layout_path)
        
        elif anchor.strategy == AnchorStrategy.BEFORE_COMPONENT_WITH_TEXT_KEY:
            return self._resolve_before_text_key(arr, anchor.text_key, anchor, layout_path)
            
        elif anchor.strategy == AnchorStrategy.BEFORE_COMPONENT_WITH_ID:
            return self._resolve_before_component_id(arr, anchor.component_id, anchor, layout_path)
        
        elif anchor.strategy == AnchorStrategy.AT_END:
            return len(arr)
        
        elif anchor.strategy == AnchorStrategy.AT_BEGINNING:
            return 0
        
        else:
            raise AnchorResolutionError(
                f"Unknown anchor strategy: {anchor.strategy}",
                anchor, layout_path
            )
    
    def _extract_layout_array(self, data: Dict) -> List[Dict]:
        """Extract layout array from various JSON structures"""
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            if "data" in data and "layout" in data["data"]:
                return data["data"]["layout"]
            elif "layout" in data:
                return data["layout"]
            else:
                # Single object - treat as array with one element
                return [data]
        else:
            raise ValueError(f"Unexpected layout data type: {type(data)}")
    
    def _resolve_after_text_key(self, arr: List[Dict], text_key: str, anchor: Anchor, layout_path: str) -> int:
        """Find component with matching text key and return index after it"""
        # First try exact match on textResourceBindings.title
        for i, comp in enumerate(arr):
            text_bindings = comp.get("textResourceBindings", {})
            if text_bindings.get("title") == text_key:
                log.info(f"Found exact anchor text_key '{text_key}' at index {i}, inserting at {i + 1}")
                return i + 1
        
        # If no exact match, try semantic matching by looking up text resources
        resolved_key = self._resolve_semantic_text_key(text_key, layout_path)
        if resolved_key:
            for i, comp in enumerate(arr):
                text_bindings = comp.get("textResourceBindings", {})
                if text_bindings.get("title") == resolved_key:
                    log.info(f"Found semantic anchor text_key '{text_key}' -> '{resolved_key}' at index {i}, inserting at {i + 1}")
                    return i + 1
        
        raise AnchorResolutionError(
            f"ANCHOR_NOT_FOUND: No component with textResourceBindings.title = '{text_key}' found in layout",
            anchor, layout_path
        )
    
    def _resolve_after_component_id(self, arr: List[Dict], component_id: str, anchor: Anchor, layout_path: str) -> int:
        """Find component with matching ID and return index after it"""
        for i, comp in enumerate(arr):
            if comp.get("id") == component_id:
                log.info(f"Found anchor component_id '{component_id}' at index {i}, inserting at {i + 1}")
                return i + 1
        
        raise AnchorResolutionError(
            f"ANCHOR_NOT_FOUND: No component with id = '{component_id}' found in layout",
            anchor, layout_path
        )
    
    def _resolve_before_text_key(self, arr: List[Dict], text_key: str, anchor: Anchor, layout_path: str) -> int:
        """Find component with matching text key and return index before it"""
        # First try exact match on textResourceBindings.title
        for i, comp in enumerate(arr):
            text_bindings = comp.get("textResourceBindings", {})
            if text_bindings.get("title") == text_key:
                log.info(f"Found exact anchor text_key '{text_key}' at index {i}, inserting at {i}")
                return i
        
        # If no exact match, try semantic matching by looking up text resources
        resolved_key = self._resolve_semantic_text_key(text_key, layout_path)
        if resolved_key:
            for i, comp in enumerate(arr):
                text_bindings = comp.get("textResourceBindings", {})
                if text_bindings.get("title") == resolved_key:
                    log.info(f"Found semantic anchor text_key '{text_key}' -> '{resolved_key}' at index {i}, inserting at {i}")
                    return i
        
        raise AnchorResolutionError(
            f"ANCHOR_NOT_FOUND: No component with textResourceBindings.title = '{text_key}' found in layout",
            anchor, layout_path
        )
    
    def _resolve_before_component_id(self, arr: List[Dict], component_id: str, anchor: Anchor, layout_path: str) -> int:
        """Find component with matching ID and return index before it"""
        for i, comp in enumerate(arr):
            if comp.get("id") == component_id:
                log.info(f"Found anchor component_id '{component_id}' at index {i}, inserting at {i}")
                return i
        
        raise AnchorResolutionError(
            f"ANCHOR_NOT_FOUND: No component with id = '{component_id}' found in layout",
            anchor, layout_path
        )
    
    def _resolve_semantic_text_key(self, semantic_text: str, layout_path: str) -> Optional[str]:
        """
        Resolve semantic text like '1.5 Poststed' to actual resource key like '1-5-Input.title'
        by looking up the text in resource files.
        """
        try:
            # Use repository context discovery to get available locales
            from agents.services.repo import discover_repository_context
            context = discover_repository_context(str(self.repo_path))
            
            # Find resource files relative to layout
            # From "App/ui/form/layouts/1.json" -> go up to repo level, then to App/config/texts
            resource_dir = self.repo_path / "App" / "config" / "texts"
            
            # Use discovered available locales instead of hardcoded list
            for locale in context.available_locales:
                resource_file = resource_dir / f"resource.{locale}.json"
                if resource_file.exists():
                    try:
                        with open(resource_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        # Look through resources for matching value
                        resources = data.get("resources", [])
                        log.debug(f"Searching through {len(resources)} resources in {locale} for '{semantic_text}'")
                        
                        for resource in resources:
                            resource_id = resource.get("id", "")
                            resource_value = resource.get("value", "")
                            
                            # Debug: log some resource values to see what we have
                            if "poststed" in resource_value.lower() or "1.5" in resource_value:
                                log.info(f"Found poststed-related resource: id='{resource_id}', value='{resource_value}'")
                            
                            # Check if the resource value matches our semantic text
                            if resource_value == semantic_text:
                                log.info(f"Resolved semantic text '{semantic_text}' to resource key '{resource_id}' in locale '{locale}'")
                                return resource_id
                                
                    except Exception as e:
                        log.warning(f"Failed to parse resource file {resource_file}: {e}")
                        continue
            
            log.warning(f"Could not resolve semantic text '{semantic_text}' to any resource key in available locales: {context.available_locales}")
            return None
            
        except Exception as e:
            log.warning(f"Error in semantic text resolution: {e}")
            return None


def resolve_anchor(layout_path: str, anchor: Anchor, repo_path: str) -> int:
    """
    Convenience function to resolve anchor without creating resolver instance.
    
    Args:
        layout_path: Relative path to layout file
        anchor: Anchor strategy to resolve
        repo_path: Repository root path
        
    Returns:
        Concrete index for insertion
    """
    resolver = AnchorResolver(repo_path)
    return resolver.resolve_anchor(layout_path, anchor)


def inject_anchor_resolution(operations: List[Dict], anchor: Anchor, repo_path: str) -> List[Dict]:
    """
    Inject resolved anchor indices into layout operations.
    
    Args:
        operations: List of operation dicts
        anchor: Anchor to resolve
        repo_path: Repository root path
        
    Returns:
        Updated operations with resolved anchor indices
    """
    updated_ops = []
    
    for op in operations:
        # Only modify insert_json_array_item operations on layout files
        if (op.get('op') == 'insert_json_array_item' and 
            'layout' in op.get('file', '').lower()):
            
            layout_path = op['file']
            try:
                resolved_index = resolve_anchor(layout_path, anchor, repo_path)
                op = op.copy()  # Don't mutate original
                op['insert_after_index'] = resolved_index
                # Remove any hardcoded index
                op.pop('index', None)
                log.info(f"Injected resolved anchor index {resolved_index} into layout operation")
            except AnchorResolutionError as e:
                log.error(f"Failed to resolve anchor: {e}")
                raise
        
        updated_ops.append(op)
    
    return updated_ops
