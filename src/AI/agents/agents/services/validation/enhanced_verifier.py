"""
Verification and validation services
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any

"""
Enhanced verification with deterministic checks.
Adds specific validation for binding existence, anchor positioning, type policies, and generated file policies.
"""
from agents.schemas.plan_schema import PlanStep, suggest_identifier_type, is_numeric_ui_component
from agents.services.repo import collect_text_resource_bindings, load_resource_key_map
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class VerificationResult:
    """Structured verification result"""
    def __init__(self):
        self.passed = True
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.checks: Dict[str, bool] = {}
    
    def add_error(self, check_name: str, message: str):
        self.passed = False
        self.errors.append(f"{check_name}: {message}")
        self.checks[check_name] = False
    
    def add_warning(self, check_name: str, message: str):
        self.warnings.append(f"{check_name}: {message}")
    
    def add_success(self, check_name: str):
        self.checks[check_name] = True


class EnhancedVerifier:
    """Enhanced verifier with deterministic checks"""
    
    def __init__(self, repository_path: str):
        self.repo_path = Path(repository_path)
    
    def verify_patch_changes(self, patch: Dict, plan_step: PlanStep) -> VerificationResult:
        """
        Main verification method with deterministic checks.
        Returns structured verification result.
        """
        result = VerificationResult()
        
        # Check 1: Binding existence validation
        self._verify_binding_existence(patch, result)
        
        # Check 2: Anchor positioning validation  
        if plan_step.anchor:
            self._verify_anchor_positioning(patch, plan_step, result)
        
        # Check 3: Type policy validation
        self._verify_type_policies(patch, plan_step, result)
        
        # Check 4: Generated files policy
        self._verify_generated_files_policy(patch, plan_step, result)
        
        # Check 5: Cross-reference validation
        self._verify_cross_references(patch, plan_step, result)
        
        log.info(f"Enhanced verification: {len(result.errors)} errors, {len(result.warnings)} warnings")
        return result
    
    def _verify_binding_existence(self, patch: Dict, result: VerificationResult) -> None:
        """Check 1: For each changed layout component, ensure dataModelBindings exist in model schema"""
        
        layout_changes = [ch for ch in patch.get('changes', []) if 'layout' in ch.get('file', '')]
        model_changes = [ch for ch in patch.get('changes', []) if 'schema.json' in ch.get('file', '')]
        
        if not layout_changes:
            result.add_success("binding_existence")
            return
        
        # Load model schema to check bindings against
        model_schema = self._load_model_schema(model_changes)
        if not model_schema:
            result.add_error("binding_existence", "Cannot load model schema to validate bindings")
            return
        
        # Check each layout component
        for change in layout_changes:
            component = change.get('value', {})
            if not isinstance(component, dict):
                continue
            
            bindings = component.get('dataModelBindings', {})
            simple_binding = bindings.get('simpleBinding')
            
            if simple_binding:
                if not self._binding_exists_in_schema(simple_binding, model_schema):
                    result.add_error(
                        "binding_existence",
                        f"Component {component.get('id', 'unknown')} references non-existent binding: {simple_binding}"
                    )
                else:
                    # Additional validation can be added here for specific field types
                    # Context-driven validation is handled in _verify_type_policies
                    pass
        
        if not result.errors:
            result.add_success("binding_existence")
    
    def _verify_anchor_positioning(self, patch: Dict, plan_step: PlanStep, result: VerificationResult) -> None:
        """Check 2: Confirm new component index is correct relative to anchor"""
        
        layout_changes = [ch for ch in patch.get('changes', []) if 'layout' in ch.get('file', '')]
        anchor = plan_step.anchor
        
        for change in layout_changes:
            layout_file = self.repo_path / change['file']
            
            try:
                # Load current layout
                with open(layout_file, 'r') as f:
                    original_layout = json.load(f)
                
                layout_array = self._extract_layout_array(original_layout)
                
                # Find anchor component
                anchor_index = None
                if anchor.strategy.value == "after_component_with_text_key":
                    # Look for anchor component in layout - use same logic as anchor resolver
                    for i, component in enumerate(layout_array):
                        text_bindings = component.get('textResourceBindings', {})
                        if text_bindings.get('title') == anchor.text_key:
                            anchor_index = i
                            break
                
                # If exact match failed, try semantic resolution like anchor resolver does
                if anchor_index is None:
                    try:
                        from agents.services.repo import AnchorResolver
                        resolver = AnchorResolver(self.repo_path.parent)  # repo_path is file path, need parent dir
                        resolved_key = resolver._resolve_semantic_text_key(anchor.text_key, layout_file)
                        if resolved_key:
                            for i, component in enumerate(layout_array):
                                text_bindings = component.get('textResourceBindings', {})
                                if text_bindings.get('title') == resolved_key:
                                    anchor_index = i
                                    break
                    except Exception as e:
                        pass  # Fall back to error reporting below
                
                if anchor_index is None:
                    result.add_error("anchor_positioning", f"Cannot find anchor component with text_key: {anchor.text_key}")
                    continue
                
                # Verify insertion happened at correct position
                # This is a simplified check - in practice, you'd need to compare against the applied patch
                expected_index = anchor_index + 1
                
                # Check if the operation specifies the correct index
                if change.get('index') is not None and change.get('index') != expected_index:
                    result.add_error(
                        "anchor_positioning",
                        f"Component inserted at index {change.get('index')}, expected {expected_index} (after {anchor.text_key})"
                    )
                
            except Exception as e:
                result.add_error("anchor_positioning", f"Failed to verify anchor positioning: {e}")
        
        if not result.errors:
            result.add_success("anchor_positioning")
    
    def _verify_type_policies(self, patch: Dict, plan_step: PlanStep, result: VerificationResult) -> None:
        """Check 3: Context-driven field type validation based on UI hints and usage patterns"""
        
        model_changes = [ch for ch in patch.get('changes', []) if 'schema.json' in ch.get('file', '')]
        
        for change in model_changes:
            value = change.get('value', {})
            if isinstance(value, dict) and 'type' in value:
                # Extract field information
                prop_path = change.get('path', [])
                if len(prop_path) >= 2:
                    field_name = prop_path[-1]  # Last element is field name
                    field_type = value.get('type')
                    
                    # Use context-driven type validation
                    if plan_step.ui_hints and is_numeric_ui_component(plan_step.ui_hints):
                        # Check if this field should be treated as identifier vs quantity
                        from agents.services.repo import check_field_arithmetic_usage
                        
                        arithmetic_usage = check_field_arithmetic_usage(str(self.repo_path), field_name)
                        suggested_type = suggest_identifier_type(field_name, plan_step.ui_hints, arithmetic_usage)
                        
                        if field_type != suggested_type:
                            if not arithmetic_usage and field_type in ['number', 'integer']:
                                result.add_error(
                                    "type_policies",
                                    f"Field {field_name} appears to be identifier (numeric UI, no arithmetic usage) but type is {field_type}"
                                )
                            elif arithmetic_usage and field_type == 'string':
                                result.add_warning(
                                    "type_policies",
                                    f"Field {field_name} used in arithmetic but type is string - may cause calculation issues"
                                )
                    
                    # Validate numeric fields have appropriate constraints
                    if field_type in ['number', 'integer'] and plan_step.model_hints:
                        if not value.get('minimum') and not value.get('maximum'):
                            result.add_warning(
                                "type_policies",
                                f"Numeric field {field_name} lacks range constraints"
                            )
                    
                    # Validate string identifiers have patterns for validation
                    if field_type == 'string' and is_numeric_ui_component(plan_step.ui_hints):
                        if not value.get('pattern'):
                            result.add_warning(
                                "type_policies",
                                f"String identifier field {field_name} should have validation pattern"
                            )
        
        result.add_success("type_policies")
    
    def _verify_generated_files_policy(self, patch: Dict, plan_step: PlanStep, result: VerificationResult) -> None:
        """Check 4: Ensure generated files weren't edited without permission"""
        
        if not plan_step.constraints.forbid_generated_edits:
            result.add_success("generated_files_policy")
            return
        
        generated_patterns = [
            r'App/models/.*\.cs$',
            r'App/models/.*\.xsd$'
        ]
        
        # Check if source of truth files were modified (these should trigger regeneration)
        source_of_truth_modified = False
        for change in patch.get('changes', []):
            file_path = change.get('file', '')
            if file_path.endswith('.schema.json'):  # Source of truth file
                source_of_truth_modified = True
                break
        
        violations = []
        for change in patch.get('changes', []):
            file_path = change.get('file', '')
            for pattern in generated_patterns:
                if re.match(pattern, file_path):
                    # If source of truth was modified, generated files are expected to be regenerated
                    if not source_of_truth_modified:
                        violations.append(file_path)
        
        if violations:
            result.add_error(
                "generated_files_policy",
                f"Modified generated files without permission: {violations}"
            )
        elif source_of_truth_modified:
            # Generated files were legitimately regenerated
            result.add_success("generated_files_policy")
        else:
            result.add_success("generated_files_policy")
    
    def _verify_cross_references(self, patch: Dict, plan_step: PlanStep, result: VerificationResult) -> None:
        """Check 5: Verify cross-file references are consistent across all required locales"""

        def _parse_locale(path: str) -> Optional[str]:
            match = re.search(r"resource\.([a-z]{2})\.json$", path)
            return match.group(1) if match else None

        layout_references = collect_text_resource_bindings(patch)
        if not layout_references:
            result.add_success("cross_references")
            return

        required_locales = plan_step.context.required_locales or plan_step.context.available_locales or []
        locale_key_map = load_resource_key_map(str(self.repo_path))

        pending_keys: Dict[str, Set[str]] = {}
        for change in patch.get("changes", []):
            file_path = change.get("file", "")
            locale = _parse_locale(file_path)
            if not locale:
                continue
            candidate = None
            for key in ("item", "value", "resource", "content", "details"):
                if key in change:
                    candidate = change[key]
                    break
            if isinstance(candidate, dict):
                res_id = candidate.get("id") or candidate.get("resource_id")
                if isinstance(res_id, str) and res_id:
                    pending_keys.setdefault(locale, set()).add(res_id)

        missing: Dict[str, Set[str]] = {}
        locales_to_check = required_locales or sorted(set(locale_key_map.keys()) | set(pending_keys.keys()))

        for binding in layout_references:
            for locale in locales_to_check:
                existing_keys = locale_key_map.get(locale, set())
                if binding in existing_keys or binding in pending_keys.get(locale, set()):
                    continue
                missing.setdefault(locale, set()).add(binding)

        if missing:
            for locale, keys in missing.items():
                result.add_error(
                    "cross_references",
                    f"Layout components reference missing resource keys in {locale}: {sorted(keys)}",
                )
        else:
            result.add_success("cross_references")
    
    def _load_model_schema(self, model_changes: List[Dict]) -> Dict:
        """Load model schema from changes or existing file"""
        # First try to build schema from changes
        schema = {}
        for change in model_changes:
            if change.get('op') == 'insert_json_property':
                path = change.get('path', [])
                value = change.get('value', {})
                if len(path) >= 2 and path[0] == 'properties':
                    if 'properties' not in schema:
                        schema['properties'] = {}
                    schema['properties'][path[1]] = value
        
        # If no changes, try to load existing schema
        if not schema.get('properties'):
            try:
                schema_files = list(self.repo_path.glob('App/models/*.schema.json'))
                if schema_files:
                    with open(schema_files[0], 'r') as f:
                        schema = json.load(f)
            except Exception as e:
                log.warning(f"Could not load existing schema: {e}")
        
        return schema
    
    def _binding_exists_in_schema(self, binding_path: str, schema: Dict) -> bool:
        """Check if binding path exists in schema"""
        properties = schema.get('properties', {})
        return binding_path in properties
    
    def _get_property_definition(self, binding_path: str, schema: Dict) -> Dict:
        """Get property definition from schema"""
        properties = schema.get('properties', {})
        return properties.get(binding_path, {})
    
    def _extract_layout_array(self, layout_data: Dict) -> List[Dict]:
        """Extract layout array from various layout file formats"""
        if 'data' in layout_data and 'layout' in layout_data['data']:
            return layout_data['data']['layout']
        elif isinstance(layout_data, list):
            return layout_data
        else:
            raise ValueError("Unknown layout structure")


def run_enhanced_verification(patch: Dict, plan_step: PlanStep, repository_path: str) -> VerificationResult:
    """
    Main entry point for enhanced verification.
    Call this from the verifier node to get detailed verification results.
    """
    verifier = EnhancedVerifier(repository_path)
    return verifier.verify_patch_changes(patch, plan_step)
