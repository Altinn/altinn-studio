"""
Contract validation gates for Actor operations.
Enforces plan contracts before any file modifications.
"""

import re
import json
from typing import Dict, List, Set, Any
from pathlib import Path

from agents.schemas.plan_schema import (
    PlanStep, ContractValidationError, ALTINN_FILE_PATTERNS, 
    is_numeric_ui_component, suggest_identifier_type
)
from agents.services.repo import check_field_arithmetic_usage
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class ContractViolation(Exception):
    """Raised when Actor violates plan contracts"""
    def __init__(self, code: str, message: str, details: Dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(f"{code}: {message}")


class ContractValidator:
    """Validates Actor operations against plan contracts"""
    
    def __init__(self, repository_path: str):
        self.repo_path = Path(repository_path)
    
    def validate_patch_against_plan(self, patch: Dict, plan: PlanStep) -> None:
        """
        Main validation: ensure patch follows plan contracts exactly.
        Raises ContractViolation if any violation is found.
        """
        
        # Extract files from patch
        patch_files = self._extract_patch_files(patch)
        plan_files = set(plan.files_to_touch)
        
        # Gate 1: File scope validation
        self._validate_file_scope(patch_files, plan_files)
        
        # Gate 2: Generated file protection
        self._validate_generated_files(patch_files, plan)
        
        # Gate 3: Task type validation
        self._validate_task_type_constraints(patch_files, plan)
        
        # Gate 4: Domain policy validation
        self._validate_domain_policies(patch, plan)
        
        # Gate 5: Anchor resolution validation
        if plan.anchor:
            self._validate_anchor_resolution(patch, plan)
    
    def _extract_patch_files(self, patch: Dict) -> Set[str]:
        """Extract all files touched by patch"""
        files = set()
        
        # From changes array
        for change in patch.get('changes', []):
            files.add(change.get('file', ''))
        
        # From files array
        files.update(patch.get('files', []))
        
        # Remove empty strings
        return {f for f in files if f}
    
    def _validate_file_scope(self, patch_files: Set[str], plan_files: Set[str]) -> None:
        """Gate 1: Ensure patch only touches planned files"""
        extra_files = patch_files - plan_files
        
        if extra_files:
            raise ContractViolation(
                "CONTRACT_FAIL:TOUCHED_UNPLANNED_FILES",
                f"Patch touches files not in plan: {extra_files}",
                {"extra_files": list(extra_files), "allowed_files": list(plan_files)}
            )
    
    def _validate_generated_files(self, patch_files: Set[str], plan: PlanStep) -> None:
        """Gate 2: Source of Truth protection - prevent direct edits to generated artifacts"""
        if not plan.constraints.forbid_generated_edits:
            return
        
        source_of_truth = plan.context.source_of_truth
        
        if not source_of_truth:
            log.warning("No source_of_truth specified, skipping generated file validation")
            return
        
        # Define what can be directly edited vs what is generated
        # Only allow direct edits to JSON Schema files (source of truth)
        direct_edit_patterns = [r'App/models/.*\.schema\.json$']
        # XSD and C# are generated from JSON Schema
        generated_patterns = [
            r'App/models/.*\.xsd$',
            r'App/models/.*\.cs$'
        ]
        
        # Check for violations
        violations = []
        for file in patch_files:
            # Skip non-model files
            if not file.startswith('App/models/'):
                continue
                
            is_generated = False
            for pattern in generated_patterns:
                if re.match(pattern, file):
                    is_generated = True
                    break
            
            if is_generated:
                # Check if this is part of a sync step
                has_sync_step = self._plan_has_sync_step(plan)
                
                if not has_sync_step:
                    violations.append(file)
        
        if violations:
            raise ContractViolation(
                "CONTRACT_FAIL:GENERATED_EDIT",
                f"Direct edit to generated artifacts without sync step: {violations} "
                f"(source_of_truth: {source_of_truth}). "
                f"Edit the source file instead and add a datamodel_sync step.",
                {
                    "generated_files": violations, 
                    "source_of_truth": source_of_truth,
                    "allowed_edits": [p.replace(r'\$', '') for p in direct_edit_patterns]
                }
            )
    
    def _validate_task_type_constraints(self, patch_files: Set[str], plan: PlanStep) -> None:
        """Gate 3: Context-driven task type validation"""
        task_type = plan.task_type
        
        if task_type == "atomic_field_add":
            # Adaptive validation based on discovered context
            required_file_types = []
            
            # Must have one layout file
            has_layout = any(re.match(r'App/ui/form/layouts/.*\.json$', f) for f in patch_files)
            if not has_layout:
                required_file_types.append("layout")
            
            # Must have model file (JSON Schema is always the source of truth)
            model_pattern = r'App/models/.*\.schema\.json$'
            
            has_model = any(re.match(model_pattern, f) for f in patch_files)
            if not has_model:
                required_file_types.append("model")
            
            # Must have all required resource files
            required_locales = plan.context.required_locales or plan.context.available_locales
            for locale in required_locales:
                pattern = f'App/config/texts/resource\.{locale}\.json$'
                if not any(re.match(pattern, f) for f in patch_files):
                    required_file_types.append(f"resource.{locale}")
            
            if required_file_types:
                raise ContractViolation(
                    "INCOMPLETE_ATOMIC_FIELD",
                    f"atomic_field_add missing required file types: {required_file_types}",
                    {"missing_types": required_file_types, "available_locales": plan.context.available_locales}
                )
            
            # Check if extras are allowed
            expected_count = 1 + 1 + len(required_locales)  # layout + model + resources
            if len(patch_files) > expected_count and not plan.constraints.allow_extras:
                raise ContractViolation(
                    "ATOMIC_FIELD_SCOPE",
                    f"atomic_field_add found {len(patch_files)} files, expected {expected_count}, extras not allowed",
                    {"file_count": len(patch_files), "expected_count": expected_count}
                )
    
    def _validate_domain_policies(self, patch: Dict, plan: PlanStep) -> None:
        """Gate 4: Context-driven identifier vs quantity validation"""
        
        # Check model field changes for proper type usage
        for change in patch.get('changes', []):
            if 'schema.json' in change.get('file', ''):
                self._validate_field_type_policy(change, plan)
    
    def _validate_field_type_policy(self, change: Dict, plan: PlanStep) -> None:
        """Validate field type based on UI hints and usage patterns"""
        value = change.get('value', {})
        
        if not isinstance(value, dict) or 'type' not in value:
            return
        
        # Extract field name from path
        path = change.get('path', [])
        if len(path) < 2:
            return
            
        field_name = path[-1]  # Last element in path should be field name
        field_type = value.get('type')
        
        # Check if field appears to be numeric in UI but used as identifier
        if plan.ui_hints and is_numeric_ui_component(plan.ui_hints):
            # Check if field is used in arithmetic operations
            arithmetic_usage = check_field_arithmetic_usage(self.repo_path, field_name)
            
            suggested_type = suggest_identifier_type(field_name, plan.ui_hints, arithmetic_usage)
            
            if field_type != suggested_type:
                # If numeric UI but no arithmetic usage -> likely identifier
                if not arithmetic_usage and field_type in ['number', 'integer']:
                    raise ContractViolation(
                        "DOMAIN_POLICY_VIOLATION:IDENTIFIER_MUST_BE_STRING",
                        f"Field {field_name} appears to be identifier (numeric UI, no arithmetic usage) but type is {field_type}",
                        {
                            "field": field_name,
                            "current_type": field_type,
                            "suggested_type": suggested_type,
                            "has_numeric_ui": True,
                            "arithmetic_usage": arithmetic_usage
                        }
                    )
    
    def _validate_anchor_resolution(self, patch: Dict, plan: PlanStep) -> None:
        """Gate 5: Ensure anchor strategy can be resolved deterministically"""
        anchor = plan.anchor
        
        if not anchor:
            return  # No anchor specified, skip validation
        
        # Find layout changes
        layout_changes = [ch for ch in patch.get('changes', []) if 'layout' in ch.get('file', '')]
        
        if not layout_changes:
            return  # No layout changes, anchor not relevant
        
        # Check that anchor has been applied to layout operations
        for change in layout_changes:
            if change.get('op') == 'insert_json_array_item':
                # Must have either insert_after_index or insert_after_id
                has_anchor_resolution = (
                    'insert_after_index' in change or 
                    'insert_after_id' in change
                )
                
                if not has_anchor_resolution:
                    raise ContractViolation(
                        "CONTRACT_FAIL:ANCHOR_NOT_APPLIED",
                        f"Layout insert operation missing anchor resolution in {change.get('file', 'unknown')}",
                        {"anchor": anchor.dict(), "operation": change}
                    )
        
        # For each layout file being modified, validate anchor resolution
        for change in layout_changes:
            layout_file = self.repo_path / change['file']
            
            if not layout_file.exists():
                raise ContractViolation(
                    "ANCHOR_NOT_FOUND",
                    f"Cannot resolve anchor: layout file doesn't exist: {layout_file}",
                    {"file": str(layout_file), "anchor": anchor.dict()}
                )
            
            # Use anchor resolver to validate resolution
            try:
                from agents.services.repo import resolve_anchor
                
                relative_path = str(change['file'])
                resolved_index = resolve_anchor(relative_path, anchor, str(self.repo_path))
                log.info(f"Anchor resolved successfully to index {resolved_index} for {relative_path}")
                
            except Exception as e:
                raise ContractViolation(
                    "ANCHOR_RESOLUTION_ERROR",
                    f"Cannot read layout file for anchor resolution: {e}",
                    {"file": str(layout_file), "error": str(e)}
                )
    
    def _plan_has_sync_step(self, plan: PlanStep) -> bool:
        """Check if plan includes a datamodel sync step"""
        # Check task type
        if "sync" in plan.task_type.lower() and "datamodel" in plan.task_type.lower():
            return True
        
        # Check if any operations call datamodel_sync tool
        for op in plan.ops:
            if hasattr(op, 'op') and 'sync' in str(op.op).lower():
                return True
            elif isinstance(op, dict) and 'sync' in str(op.get('op', '')).lower():
                return True
        
        return False
    
    def _extract_layout_array(self, layout_data: Dict) -> List[Dict]:
        """Extract layout array from various layout file formats"""
        if 'data' in layout_data and 'layout' in layout_data['data']:
            return layout_data['data']['layout']
        elif isinstance(layout_data, list):
            return layout_data
        else:
            raise ValueError("Unknown layout structure")
    
    def _resolve_anchor_index(self, layout_array: List[Dict], anchor) -> int:
        """Resolve anchor to actual array index"""
        from agents.schemas.plan_schema import AnchorStrategy
        
        if anchor.strategy == AnchorStrategy.AFTER_COMPONENT_WITH_TEXT_KEY:
            # Find component with matching textResourceBindings.title
            for i, component in enumerate(layout_array):
                text_bindings = component.get('textResourceBindings', {})
                if text_bindings.get('title') == anchor.text_key:
                    return i + 1  # Insert after this component
        
        elif anchor.strategy == AnchorStrategy.AFTER_COMPONENT_WITH_ID:
            # Find component with matching id
            for i, component in enumerate(layout_array):
                if component.get('id') == anchor.component_id:
                    return i + 1  # Insert after this component
        
        elif anchor.strategy == AnchorStrategy.AT_END:
            return len(layout_array)
        
        elif anchor.strategy == AnchorStrategy.AT_BEGINNING:
            return 0
        
        return None  # Could not resolve


def validate_patch_contracts(patch: Dict, plan_step: PlanStep, repository_path: str) -> None:
    """
    Main contract validation entry point.
    Call this before applying any patch to enforce all contracts.
    """
    validator = ContractValidator(repository_path)
    validator.validate_patch_against_plan(patch, plan_step)
    
    log.info("✅ All contract validations passed")
