"""Base validator class for schema-driven validation"""

import warnings
from collections.abc import Iterator
from typing import Any

import regex

with warnings.catch_warnings():
    # RefResolver is deprecated in jsonschema, but we still rely on it here.
    # Filter its deprecation warning locally to avoid noisy startup logs.
    warnings.filterwarnings(
        "ignore",
        category=DeprecationWarning,
        message="jsonschema.RefResolver is deprecated*",
    )
    from jsonschema import Draft7Validator, RefResolver, ValidationError, validators

SchemaPath = tuple[str | int, ...]


def _check_ecma_pattern(validator, pattern, instance, _schema):
    """Check the `pattern` keyword with the `regex` package.

    JSON Schema patterns use ECMA-262 syntax. The schemas use `\\p{L}`,
    which Python `re` does not support.
    """
    if validator.is_type(instance, "string") and not regex.search(pattern, instance):
        yield ValidationError(f"{instance!r} does not match {pattern!r}")


_SchemaValidator = validators.extend(Draft7Validator, {"pattern": _check_ecma_pattern})


class BaseValidator:
    """Base class for validators that check data against a JSON schema"""

    def __init__(self, schema: dict[str, Any]):
        self.schema = schema

    def validate_against_schema(self, data: dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate data against JSON schema

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = [message for _path, message in self.iter_schema_errors(data)]
        return len(errors) == 0, errors

    def iter_schema_errors(self, data: dict[str, Any]) -> Iterator[tuple[SchemaPath, str]]:
        """Yield the location of each schema error in the data, and its message."""
        try:
            resolver = RefResolver.from_schema(self.schema)
            validator = _SchemaValidator(self.schema, resolver=resolver)

            for error in validator.iter_errors(data):
                path = tuple(error.absolute_path)
                location = ".".join(str(p) for p in path) if path else "root"
                yield path, f"[{location}] {error.message}"

        except Exception as e:
            yield (), f"Schema validation error: {e!s}"
