"""Base validator class for schema-driven validation with business rules"""
import json
import requests
from typing import Dict, Any, List, Tuple
from jsonschema import Draft7Validator, ValidationError, RefResolver
from abc import ABC, abstractmethod


class BaseValidator(ABC):
    """Base class for schema-driven validators with custom business rules"""
    
    def __init__(self, schema_url: str):
        self.schema_url = schema_url
        self.schema = None
    
    def _load_schema(self) -> Dict[str, Any]:
        """Load schema from URL"""
        try:
            response = requests.get(self.schema_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Failed to load schema from {self.schema_url}: {e}")
    
    def validate_against_schema(self, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate data against JSON schema
        
        Returns:
            Tuple of (is_valid, error_messages)
        """
        if not self.schema:
            self.schema = self._load_schema()
        
        errors = []
        try:
            resolver = RefResolver.from_schema(self.schema)
            validator = Draft7Validator(self.schema, resolver=resolver)
            
            for error in validator.iter_errors(data):
                path = ".".join(str(p) for p in error.absolute_path) if error.absolute_path else "root"
                errors.append(f"[{path}] {error.message}")
        
        except Exception as e:
            errors.append(f"Schema validation error: {str(e)}")
        
        return len(errors) == 0, errors
    
    @abstractmethod
    def validate_business_rules(self, data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Override in subclass to implement custom business rules
        
        Returns:
            Dict with 'errors', 'warnings', 'suggestions' keys
        """
        pass
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Full validation: schema + business rules
        
        Args:
            data: Data to validate
            context: Additional context (existing files, repo info, etc.)
        
        Returns:
            Dict with validation results
        """
        context = context or {}
        
        # Step 1: Schema validation
        schema_valid, schema_errors = self.validate_against_schema(data)
        
        # Step 2: Business rules validation
        business_result = self.validate_business_rules(data, context)
        
        all_errors = schema_errors + business_result.get('errors', [])
        
        return {
            "valid": len(all_errors) == 0,
            "errors": all_errors,
            "warnings": business_result.get('warnings', []),
            "suggestions": business_result.get('suggestions', {}),
            "schema_url": self.schema_url
        }
