"""
Structured schema for planner output with contract validation.
Enforces atomic operations, file constraints, and anchor strategies.
"""

import re
from typing import List, Dict, Any, Literal, Optional, Union, Annotated
from pydantic import BaseModel, Field, validator
from enum import Enum
import logging

log = logging.getLogger(__name__)


class OperationType(str, Enum):
    """Allowed file operations"""
    INSERT_JSON_PROPERTY = "insert_json_property"
    INSERT_JSON_ARRAY_ITEM = "insert_json_array_item"
    REPLACE_TEXT = "replace_text"
    INSERT_TEXT_AT_PATTERN = "insert_text_at_pattern"


class AnchorStrategy(str, Enum):
    """Deterministic anchor resolution strategies"""
    AFTER_COMPONENT_WITH_TEXT_KEY = "after_component_with_text_key"
    BEFORE_COMPONENT_WITH_TEXT_KEY = "before_component_with_text_key"
    AFTER_COMPONENT_WITH_ID = "after_component_with_id"
    AT_END = "at_end"
    AT_BEGINNING = "at_beginning"


class Anchor(BaseModel):
    """Anchor specification for precise positioning"""
    strategy: AnchorStrategy
    text_key: Optional[str] = None  # For text_key strategies
    component_id: Optional[str] = None  # For id strategies
    
    @validator('text_key')
    def text_key_required_for_text_strategies(cls, v, values):
        strategy = values.get('strategy')
        if strategy in [AnchorStrategy.AFTER_COMPONENT_WITH_TEXT_KEY, AnchorStrategy.BEFORE_COMPONENT_WITH_TEXT_KEY]:
            if not v:
                raise ValueError(f"text_key required for {strategy}")
        return v
    
    @validator('component_id')
    def component_id_required_for_id_strategies(cls, v, values):
        strategy = values.get('strategy')
        if strategy in [AnchorStrategy.AFTER_COMPONENT_WITH_ID, AnchorStrategy.BEFORE_COMPONENT_WITH_ID]:
            if not v:
                raise ValueError(f"component_id required for {strategy}")
        return v


class Operation(BaseModel):
    """Flexible operation that can handle different operation types from LLM"""
    op: str  # Operation type
    file: str  # File to operate on
    
    # Common fields that might appear in any operation
    path: Optional[List[str]] = None
    key: Optional[str] = None
    value: Optional[Any] = None
    item: Optional[Any] = None
    text: Optional[str] = None
    pattern: Optional[str] = None
    index: Optional[int] = None
    insert_after_id: Optional[str] = None
    insert_after_index: Optional[int] = None
    find_last: Optional[bool] = True


class UIHints(BaseModel):
    """UI component hints for validation"""
    input_mode: Optional[str] = None
    max_length: Optional[int] = None
    format: Optional[str] = None
    required: Optional[bool] = None


class ModelHints(BaseModel):
    """Model field hints for type inference"""
    type: Optional[str] = None  # Suggested type
    pattern: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None


class PlanContext(BaseModel):
    """Repository context discovered during scanning"""
    available_locales: List[str] = Field(default_factory=list)  # e.g., ["nb", "nn", "en"]
    required_locales: Optional[List[str]] = None  # Override for required subset
    source_of_truth: Literal["json_schema"] = "json_schema"  # Always JSON schema for Altinn apps
    layout_pages: List[str] = Field(default_factory=list)  # Available layout files
    model_files: List[str] = Field(default_factory=list)  # Available model files
    resource_files: List[str] = Field(default_factory=list)  # All resource files


class Constraints(BaseModel):
    """Context-driven execution constraints"""
    max_files: Optional[int] = Field(default=10)  # From context or user preference
    max_diff_lines: Optional[int] = Field(default=2000)
    forbid_generated_edits: bool = True  # Unless explicitly overridden
    allow_cross_domain: bool = False
    allow_extras: bool = False  # For atomic operations


class PlanStep(BaseModel):
    """Structured plan step with context-aware contracts and validation"""
    step_id: str = Field(..., pattern=r'^S\d+$')  # S1, S2, etc.
    task_type: str  # Open-ended, no enum restriction
    description: str = Field(..., min_length=10, max_length=200)
    files_to_touch: List[str] = Field(..., min_items=1)
    ops: List[Operation] = Field(..., min_items=1)
    anchor: Optional[Anchor] = None  # Required for layout operations
    constraints: Constraints = Field(default_factory=Constraints)
    context: PlanContext = Field(default_factory=PlanContext)
    ui_hints: Optional[UIHints] = None
    model_hints: Optional[ModelHints] = None
    
    @validator('files_to_touch')
    def validate_file_count(cls, v, values):
        constraints = values.get('constraints', Constraints())
        max_files = constraints.max_files if constraints.max_files else 10  # Default fallback
        if len(v) > max_files:
            raise ValueError(f"files_to_touch exceeds max_files limit ({max_files})")
        return v
    
    @validator('files_to_touch')
    def validate_atomic_field_add_files(cls, v, values):
        task_type = values.get('task_type')
        context = values.get('context', PlanContext())
        constraints = values.get('constraints', Constraints())
        
        if task_type == "atomic_field_add": # TODO: Can we have hardcoded task types?
            # Check if we have valid context information
            has_context = context and (context.available_locales or context.source_of_truth)
            
            if not has_context:
                # No context available - skip detailed validation for now
                log.warning(f"No repository context available for {task_type} validation, allowing plan as-is")
                return v
            
            # Adaptive validation based on discovered context
            required_file_types = []
            
            # Must have one layout file
            layout_pattern = r'App/ui/form/layouts/.*\.json$'
            has_layout = any(re.match(layout_pattern, f) for f in v)
            if not has_layout:
                required_file_types.append("layout")
            
            # Must have model file (always JSON schema for Altinn)
            model_pattern = r'App/models/.*\.schema\.json$'
            has_model = any(re.match(model_pattern, f) for f in v)
            if not has_model:
                required_file_types.append("model")
            
            # Must have all required resource files
            required_locales = context.required_locales or context.available_locales
            
            for locale in required_locales:
                pattern = f'App/config/texts/resource\.{locale}\.json$'
                if not any(re.match(pattern, f) for f in v):
                    required_file_types.append(f"resource.{locale}")
            
            if required_file_types:
                raise ValueError(f"INCOMPLETE_ATOMIC_FIELD: missing {required_file_types}")
            
            # Check if extras are allowed
            expected_count = 1 + 1 + len(required_locales)  # layout + model + resources
            if len(v) > expected_count and not constraints.allow_extras:
                raise ValueError(f"ATOMIC_FIELD_SCOPE: found {len(v)} files, expected {expected_count}, extras not allowed")
        
        return v
    
    @validator('ops')
    def validate_ops_match_files(cls, v, values):
        files_to_touch = values.get('files_to_touch', [])
        
        # Extract files from operations (all operation types have a 'file' attribute)
        op_files = set()
        for op in v:
            if hasattr(op, 'file'):
                op_files.add(op.file)
            elif isinstance(op, dict) and 'file' in op:
                op_files.add(op['file'])
        
        # All op files must be in files_to_touch
        extra_files = op_files - set(files_to_touch)
        if extra_files:
            raise ValueError(f"Operations reference files not in files_to_touch: {extra_files}")
        
        return v
    
    @validator('ops')
    def validate_no_generated_file_edits(cls, v, values):
        constraints = values.get('constraints', Constraints())
        context = values.get('context', PlanContext())
        
        if constraints.forbid_generated_edits:
            # For Altinn apps: JSON schema is source, CS and XSD are generated
            generated_patterns = [
                r'App/models/.*\.cs$',
                r'App/models/.*\.xsd$'
            ]
            
            for op in v:
                for pattern in generated_patterns:
                    if re.match(pattern, op.file):
                        raise ValueError(f"Operation targets generated file {op.file} (source_of_truth: {context.source_of_truth})")
        return v
    
    @validator('anchor')
    def anchor_required_for_layout_ops(cls, v, values):
        task_type = values.get('task_type')
        ops = values.get('ops', [])
        
        # If we're touching layout files, anchor is required
        layout_ops = [op for op in ops if 'layout' in op.file.lower()]
        if layout_ops and not v:
            raise ValueError("anchor required when modifying layout files")
        
        return v


class ContractValidationError(Exception):
    """Raised when plan violates contracts"""
    pass


def validate_plan_step(plan_data: dict) -> PlanStep:
    """Validate and parse plan step with detailed error messages"""
    try:
        return PlanStep(**plan_data)
    except ValueError as e:
        raise ContractValidationError(f"Plan validation failed: {e}")

# TODO: Check if we can remove this
# Utility functions for identifier vs quantity detection
def is_numeric_ui_component(ui_hints: Optional[UIHints]) -> bool:
    """Check if component has numeric UI indicators"""
    if not ui_hints:
        return False
    
    numeric_indicators = [
        ui_hints.input_mode == "numeric",
        ui_hints.format == "numeric", 
        ui_hints.format == "number"
    ]
    return any(numeric_indicators)


def suggest_identifier_type(field_name: str, ui_hints: Optional[UIHints], arithmetic_usage: bool = False) -> str:
    """
    Suggest field type based on UI hints and usage patterns.
    Returns 'string' for identifiers, 'number' for quantities.
    """
    # If used in arithmetic, allow numeric types
    if arithmetic_usage:
        return "number"
    
    # If has numeric UI but no arithmetic usage, likely an identifier
    if is_numeric_ui_component(ui_hints):
        return "string"  # Preserve leading zeros
    
    # Default to string for safety
    return "string"


# File pattern utilities
ALTINN_FILE_PATTERNS = {
    'layout': r'App/ui/form/layouts/.*\.json$',
    'resource': r'App/config/texts/resource\..*\.json$',
    'model_schema': r'App/models/.*\.schema\.json$',
    'model_cs': r'App/models/.*\.cs$',
    'model_xsd': r'App/models/.*\.xsd$'
}
