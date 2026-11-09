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

    def iter_schema_errors(self, data: Any) -> Iterator[tuple[SchemaPath, str]]:
        """Yield the path of each schema error in the data, and its message.

        A schema that cannot be used raises: that is no error in the data, and must not pass as one that the
        data had before a change too.
        """
        resolver = RefResolver.from_schema(self.schema)
        validator = _SchemaValidator(self.schema, resolver=resolver)
        for error in validator.iter_errors(data):
            yield tuple(error.absolute_path), error.message
