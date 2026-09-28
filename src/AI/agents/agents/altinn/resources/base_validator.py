"""Base validator class for schema-driven validation with business rules"""

import warnings
from abc import ABC, abstractmethod
from typing import Any

import requests

with warnings.catch_warnings():
    # RefResolver is deprecated in jsonschema, but we still rely on it here.
    # Filter its deprecation warning locally to avoid noisy startup logs.
    warnings.filterwarnings(
        "ignore",
        category=DeprecationWarning,
        message="jsonschema.RefResolver is deprecated*",
    )
    from jsonschema import Draft7Validator, RefResolver


class BaseValidator(ABC):
    """Base class for schema-driven validators with custom business rules"""

    def __init__(self, schema_url: str):
        self.schema_url = schema_url
        self.schema = None

    def _load_schema(self) -> dict[str, Any]:
        """Load schema from URL"""
        try:
            response = requests.get(self.schema_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Failed to load schema from {self.schema_url}: {e}") from e

    def validate_against_schema(self, data: dict[str, Any]) -> tuple[bool, list[str]]:
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
            errors.append(f"Schema validation error: {e!s}")

        return len(errors) == 0, errors

    @abstractmethod
    def validate_business_rules(self, data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        """
        Override in subclass to implement custom business rules

        Returns:
            Dict with 'errors', 'warnings', 'suggestions' keys
        """

    def validate(self, data: dict[str, Any], context: dict[str, Any] | None = None) -> dict[str, Any]:
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
        _schema_valid, schema_errors = self.validate_against_schema(data)

        # Step 2: Business rules validation
        business_result = self.validate_business_rules(data, context)

        all_errors = schema_errors + business_result.get("errors", [])

        return {
            "valid": len(all_errors) == 0,
            "errors": all_errors,
            "warnings": business_result.get("warnings", []),
            "suggestions": business_result.get("suggestions", {}),
            "schema_url": self.schema_url,
        }
