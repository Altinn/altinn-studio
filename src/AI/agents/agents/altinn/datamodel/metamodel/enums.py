"""Enums matching Altinn Studio's DataModeling library."""

from enum import Enum, auto


class ElementType(Enum):
    """Type of element in the model metadata."""
    FIELD = "Field"
    GROUP = "Group"
    ATTRIBUTE = "Attribute"


class BaseValueType(Enum):
    """XSD base value types matching Altinn Studio's BaseValueType enum."""
    STRING = "String"
    NORMALIZED_STRING = "NormalizedString"
    TOKEN = "Token"
    INT = "Int"
    SHORT = "Short"
    DECIMAL = "Decimal"
    INTEGER = "Integer"
    POSITIVE_INTEGER = "PositiveInteger"
    NEGATIVE_INTEGER = "NegativeInteger"
    NON_NEGATIVE_INTEGER = "NonNegativeInteger"
    NON_POSITIVE_INTEGER = "NonPositiveInteger"
    DATE_TIME = "DateTime"
    DATE = "Date"
    TIME = "Time"
    DURATION = "Duration"
    TIME_PERIOD = "TimePeriod"
    G_YEAR = "GYear"
    G_YEAR_MONTH = "GYearMonth"
    G_MONTH = "GMonth"
    G_MONTH_DAY = "GMonthDay"
    G_DAY = "GDay"
    BOOLEAN = "Boolean"
    DOUBLE = "Double"
    LONG = "Long"
    ANY_URI = "AnyURI"


class SchemaValueType(Enum):
    """JSON Schema value types."""
    NULL = auto()
    BOOLEAN = auto()
    OBJECT = auto()
    ARRAY = auto()
    NUMBER = auto()
    STRING = auto()
    INTEGER = auto()


class CompatibleXsdType(Enum):
    """Compatible XSD type indicators."""
    NILLABLE = auto()
    SIMPLE_TYPE_RESTRICTION = auto()
