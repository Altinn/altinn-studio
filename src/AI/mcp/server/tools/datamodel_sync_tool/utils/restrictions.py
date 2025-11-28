"""Utilities for handling JSON Schema restrictions and validation rules."""

from typing import Dict, Any, Optional
from ..metamodel import Restriction, BaseValueType


class RestrictionMapper:
    """Maps JSON Schema validation keywords to model restrictions."""
    
    @staticmethod
    def extract_restrictions(schema: Dict[str, Any]) -> Dict[str, Restriction]:
        """Extract restrictions from JSON Schema validation keywords."""
        restrictions = {}
        
        # String length restrictions
        if 'minLength' in schema:
            restrictions['minLength'] = Restriction(str(schema['minLength']))
        
        if 'maxLength' in schema:
            restrictions['maxLength'] = Restriction(str(schema['maxLength']))
        
        # Numeric range restrictions
        if 'minimum' in schema:
            restrictions['minimum'] = Restriction(str(schema['minimum']))
        
        if 'maximum' in schema:
            restrictions['maximum'] = Restriction(str(schema['maximum']))
        
        if 'minInclusive' in schema:
            restrictions['minInclusive'] = Restriction(str(schema['minInclusive']))
        
        if 'maxInclusive' in schema:
            restrictions['maxInclusive'] = Restriction(str(schema['maxInclusive']))
        
        # Pattern restriction
        if 'pattern' in schema:
            restrictions['pattern'] = Restriction(schema['pattern'])
        
        # Total digits (for decimals)
        if 'totalDigits' in schema:
            restrictions['totalDigits'] = Restriction(str(schema['totalDigits']))
        
        return restrictions
    
    @staticmethod
    def get_range_limits(base_type: Optional[BaseValueType]) -> tuple[str, str]:
        """Get C# range limits for a given base value type.
        
        Returns:
            Tuple of (min_limit, max_limit) as C# code strings
        """
        if base_type == BaseValueType.INT:
            return ('Int32.MinValue', 'Int32.MaxValue')
        elif base_type == BaseValueType.LONG:
            return ('Int64.MinValue', 'Int64.MaxValue')
        elif base_type == BaseValueType.NEGATIVE_INTEGER:
            return ('Double.MinValue', '-1')
        elif base_type == BaseValueType.NON_POSITIVE_INTEGER:
            return ('Double.MinValue', '0')
        elif base_type == BaseValueType.NON_NEGATIVE_INTEGER:
            return ('0', 'Double.MaxValue')
        elif base_type == BaseValueType.POSITIVE_INTEGER:
            return ('1', 'Double.MaxValue')
        elif base_type in [BaseValueType.INTEGER, BaseValueType.DECIMAL, BaseValueType.DOUBLE]:
            return ('Double.MinValue', 'Double.MaxValue')
        else:
            return ('Double.MinValue', 'Double.MaxValue')
    
    @staticmethod
    def get_validation_regex(base_type: BaseValueType) -> Optional[str]:
        """Get validation regex pattern for special types."""
        regex_map = {
            BaseValueType.G_YEAR: r'^[0-9]{4}$',
            BaseValueType.G_YEAR_MONTH: r'^[0-9]{4}-(0[1-9]|1[0-2])$',
            BaseValueType.G_MONTH: r'^0[1-9]|1[0-2]$',
            BaseValueType.G_DAY: r'^0[1-9]|[1,2][0-9]|3[0,1]$',
            BaseValueType.TIME: r'^([0,1][0-9]|[2][0-3]):[0-5][0-9]:[0-5][0-9](Z|(\+|--)([0,1][0-9]|[2][0-3]):[0-5][0-9])?$',
            BaseValueType.TIME_PERIOD: r'^-?P([0-9]*Y)?([0-9]*M)?([0-9]*D)?(T([0-9]*H)?([0-9]*M)?([0-9]*S)?)?$',
            BaseValueType.DATE: r'^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$',
        }
        return regex_map.get(base_type)
