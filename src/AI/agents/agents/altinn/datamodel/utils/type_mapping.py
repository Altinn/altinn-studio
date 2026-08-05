"""Type mapping utilities for JSON Schema, XSD, and C# types."""

from typing import Tuple, Optional
from ..metamodel.enums import BaseValueType, SchemaValueType


class TypeMapper:
    """Maps types between JSON Schema, XSD, and C# formats."""
    
    @staticmethod
    def json_schema_to_xsd_type(json_type: SchemaValueType, format_hint: Optional[str] = None) -> str:
        """Convert JSON Schema type to XSD type."""
        if json_type == SchemaValueType.STRING:
            if format_hint:
                format_map = {
                    'date': 'xs:date',
                    'date-time': 'xs:dateTime',
                    'time': 'xs:time',
                    'duration': 'xs:duration',
                    'uri': 'xs:anyURI',
                    'year': 'xs:gYear',
                    'year-month': 'xs:gYearMonth',
                    'month': 'xs:gMonth',
                    'day': 'xs:gDay',
                }
                return format_map.get(format_hint, 'xs:string')
            return 'xs:string'
        elif json_type == SchemaValueType.INTEGER:
            return 'xs:int'
        elif json_type == SchemaValueType.NUMBER:
            return 'xs:decimal'
        elif json_type == SchemaValueType.BOOLEAN:
            return 'xs:boolean'
        elif json_type == SchemaValueType.ARRAY:
            return 'xs:string'  # Arrays are handled specially
        else:
            return 'xs:string'
    
    @staticmethod
    def base_value_type_to_csharp(base_type: Optional[BaseValueType]) -> Tuple[str, bool]:
        """Convert BaseValueType to C# type.
        
        Returns:
            Tuple of (csharp_type, is_value_type)
        """
        if base_type is None:
            return ('string', False)
        
        type_map = {
            BaseValueType.STRING: ('string', False),
            BaseValueType.NORMALIZED_STRING: ('string', False),
            BaseValueType.TOKEN: ('string', False),
            BaseValueType.INT: ('int', True),
            BaseValueType.SHORT: ('short', True),
            BaseValueType.DECIMAL: ('decimal', True),
            BaseValueType.INTEGER: ('decimal', True),
            BaseValueType.POSITIVE_INTEGER: ('decimal', True),
            BaseValueType.NEGATIVE_INTEGER: ('decimal', True),
            BaseValueType.NON_NEGATIVE_INTEGER: ('decimal', True),
            BaseValueType.NON_POSITIVE_INTEGER: ('decimal', True),
            BaseValueType.DATE_TIME: ('DateTime', True),
            BaseValueType.DATE: ('string', False),
            BaseValueType.TIME: ('string', False),
            BaseValueType.DURATION: ('string', False),
            BaseValueType.TIME_PERIOD: ('string', False),
            BaseValueType.G_YEAR: ('string', False),
            BaseValueType.G_YEAR_MONTH: ('string', False),
            BaseValueType.G_MONTH: ('string', False),
            BaseValueType.G_MONTH_DAY: ('string', False),
            BaseValueType.G_DAY: ('string', False),
            BaseValueType.BOOLEAN: ('bool', True),
            BaseValueType.DOUBLE: ('double', True),
            BaseValueType.LONG: ('long', True),
            BaseValueType.ANY_URI: ('string', False),
        }
        
        return type_map.get(base_type, ('string', False))
    
    @staticmethod
    def xsd_type_to_csharp(xsd_type: str) -> Tuple[str, bool]:
        """Convert XSD type string to C# type.
        
        Returns:
            Tuple of (csharp_type, is_value_type)
        """
        # Remove namespace prefix
        clean_type = xsd_type.split(':')[-1] if ':' in xsd_type else xsd_type
        
        type_map = {
            'string': ('string', False),
            'int': ('int', True),
            'integer': ('int', True),
            'decimal': ('decimal', True),
            'double': ('double', True),
            'float': ('float', True),
            'boolean': ('bool', True),
            'date': ('DateTime', True),
            'dateTime': ('DateTime', True),
            'time': ('string', False),
            'duration': ('string', False),
            'anyURI': ('string', False),
        }
        
        return type_map.get(clean_type, ('string', False))
    
    @staticmethod
    def map_json_schema_to_base_value_type(
        json_type: SchemaValueType, 
        format_hint: Optional[str] = None
    ) -> Optional[BaseValueType]:
        """Map JSON Schema type to BaseValueType."""
        if json_type == SchemaValueType.STRING:
            if format_hint:
                format_map = {
                    'date': BaseValueType.DATE,
                    'date-time': BaseValueType.DATE_TIME,
                    'time': BaseValueType.TIME,
                    'duration': BaseValueType.DURATION,
                    'uri': BaseValueType.ANY_URI,
                    'year': BaseValueType.G_YEAR,
                    'year-month': BaseValueType.G_YEAR_MONTH,
                    'month': BaseValueType.G_MONTH,
                    'day': BaseValueType.G_DAY,
                }
                return format_map.get(format_hint, BaseValueType.STRING)
            return BaseValueType.STRING
        elif json_type == SchemaValueType.BOOLEAN:
            return BaseValueType.BOOLEAN
        elif json_type == SchemaValueType.NUMBER:
            return BaseValueType.DECIMAL
        elif json_type == SchemaValueType.INTEGER:
            return BaseValueType.INTEGER
        else:
            return None
