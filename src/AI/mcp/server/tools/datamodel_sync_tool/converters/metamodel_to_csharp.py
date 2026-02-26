"""Converter from ModelMetadata to C# classes.

Matches Altinn Studio's JsonMetadataToCsharpConverter logic.
"""

from typing import Dict, Set, List
from ..metamodel import ModelMetadata, ElementMetadata, ElementType, BaseValueType
from ..utils import TypeMapper, RestrictionMapper


class ModelMetadataToCsharpConverter:
    """Converts ModelMetadata to C# class definitions."""
    
    def __init__(self, namespace: str = "Altinn.App.Models", indent_size: int = 4):
        self.namespace = namespace
        self.indent_size = indent_size
        
    def convert(
        self, 
        metadata: ModelMetadata, 
        separate_namespace: bool = False,
        use_nullable_reference_types: bool = False
    ) -> str:
        """Convert ModelMetadata to C# code.
        
        Args:
            metadata: The model metadata to convert
            separate_namespace: Whether to use separate namespace per model
            use_nullable_reference_types: Whether to use nullable reference types
            
        Returns:
            Complete C# file content as string
        """
        root_element = metadata.get_root_element()
        namespace = self.namespace
        
        if separate_namespace:
            namespace = f"{self.namespace}.{root_element.TypeName}"
        
        # Build all classes
        classes: Dict[str, str] = {}
        self._create_class_recursive(classes, root_element, metadata, use_nullable_reference_types)
        
        # Build final output
        lines = []
        
        # Nullable directive
        if use_nullable_reference_types:
            lines.append("#nullable enable")
        else:
            lines.append("#nullable disable")
        
        # Using statements
        lines.extend([
            "using System;",
            "using System.Collections.Generic;",
            "using System.ComponentModel.DataAnnotations;",
            "using System.Linq;",
            "using System.Text.Json.Serialization;",
            "using System.Xml.Serialization;",
            "using Microsoft.AspNetCore.Mvc.ModelBinding;",
            "using Newtonsoft.Json;",
            ""
        ])
        
        # Namespace
        lines.append(f"namespace {namespace}")
        lines.append("{")
        
        # Add all classes
        for class_code in classes.values():
            lines.append(class_code)
        
        lines.append("}")
        
        return "\n".join(lines)
    
    def _create_class_recursive(
        self, 
        classes: Dict[str, str],
        element: ElementMetadata,
        metadata: ModelMetadata,
        use_nullable: bool
    ):
        """Recursively create class definitions."""
        if element.TypeName in classes:
            return
        
        lines = []
        
        # XmlRoot attribute for root element
        if element.ParentElement is None:
            if metadata.TargetNamespace:
                lines.append(f'{self._indent(1)}[XmlRoot(ElementName="{element.Name}", Namespace="{metadata.TargetNamespace}")]')
            else:
                lines.append(f'{self._indent(1)}[XmlRoot(ElementName="{element.Name}")]')
        else:
            lines.append("")
        
        # Class declaration
        lines.append(f"{self._indent(1)}public class {element.TypeName}")
        lines.append(f"{self._indent(1)}{{")
        
        # Check if we need AltinnRowId (for repeating elements)
        if self._should_write_altinn_row_id(element, metadata):
            self._write_altinn_row_id(lines)
        
        # Get child elements
        child_elements = [
            e for e in metadata.Elements.values()
            if e.ParentElement == element.ID
        ]
        
        # Sort by order (field, then groups)
        child_elements.sort(key=lambda e: (e.Type != ElementType.FIELD, e.Name))
        
        element_order = 0
        referred_types: Set[str] = set()
        
        for child in child_elements:
            if child.Type == ElementType.FIELD:
                self._parse_field_property(lines, child, element_order, use_nullable)
                element_order += 1
            elif child.Type == ElementType.GROUP:
                self._parse_group_property(lines, child, element_order, use_nullable)
                element_order += 1
                referred_types.add(child.TypeName)
            elif child.Type == ElementType.ATTRIBUTE:
                self._parse_attribute_property(lines, child, use_nullable)
        
        lines.append(f"{self._indent(1)}}}")
        lines.append("")
        
        classes[element.TypeName] = "\n".join(lines)
        
        # Recursively process referred types
        for type_name in referred_types:
            referred_element = next(
                (e for e in metadata.Elements.values() if e.TypeName == type_name and e.Type == ElementType.GROUP),
                None
            )
            if referred_element:
                self._create_class_recursive(classes, referred_element, metadata, use_nullable)
    
    def _parse_field_property(
        self, 
        lines: List[str], 
        element: ElementMetadata,
        order: int,
        use_nullable: bool
    ):
        """Generate C# property for a field element."""
        nullable_ref = "?" if use_nullable else ""
        cs_type, is_value_type = TypeMapper.base_value_type_to_csharp(element.XsdValueType)
        
        # Write restriction annotations
        self._write_restriction_annotations(lines, element)
        
        # XmlElement attribute
        if not element.IsTagContent:
            nillable_attr = ", IsNullable = true" if element.Nillable else ""
            lines.append(f'{self._indent(2)}[XmlElement("{element.XName}", Order = {order + 1}{nillable_attr})]')
            
            # JSON attributes
            lines.append(f'{self._indent(2)}[JsonProperty("{element.XName}")]')
            lines.append(f'{self._indent(2)}[JsonPropertyName("{element.XName}")]')
        else:
            lines.append(f'{self._indent(2)}[XmlText()]')
        
        # Required attribute
        required = element.MinOccurs > 0
        if required and is_value_type and not element.IsTagContent:
            lines.append(f'{self._indent(2)}[Required]')
        
        # Property declaration
        if element.MaxOccurs > 1:
            # List property
            lines.append(f'{self._indent(2)}public List<{cs_type}>{nullable_ref} {element.Name} {{ get; set; }}')
        else:
            # Single property
            if is_value_type:
                lines.append(f'{self._indent(2)}public {cs_type}? {element.Name} {{ get; set; }}')
                
                # ShouldSerialize method for non-nillable optional value types
                if not element.Nillable and element.MinOccurs == 0:
                    lines.append("")
                    lines.append(f'{self._indent(2)}public bool ShouldSerialize{element.Name}() => {element.Name}.HasValue;')
            else:
                lines.append(f'{self._indent(2)}public {cs_type}{nullable_ref} {element.Name} {{ get; set; }}')
        
        lines.append("")
    
    def _parse_group_property(
        self,
        lines: List[str],
        element: ElementMetadata,
        order: int,
        use_nullable: bool
    ):
        """Generate C# property for a group element."""
        nullable_ref = "?" if use_nullable else ""
        
        # Write restriction annotations
        self._write_restriction_annotations(lines, element)
        
        # XmlElement attribute
        nillable_attr = ", IsNullable = true" if element.Nillable else ""
        lines.append(f'{self._indent(2)}[XmlElement("{element.XName}", Order = {order + 1}{nillable_attr})]')
        
        # JSON attributes
        lines.append(f'{self._indent(2)}[JsonProperty("{element.XName}")]')
        lines.append(f'{self._indent(2)}[JsonPropertyName("{element.XName}")]')
        
        # Property declaration
        if element.MaxOccurs > 1:
            lines.append(f'{self._indent(2)}public List<{element.TypeName}>{nullable_ref} {element.Name} {{ get; set; }}')
        else:
            lines.append(f'{self._indent(2)}public {element.TypeName}{nullable_ref} {element.Name} {{ get; set; }}')
        
        lines.append("")
    
    def _parse_attribute_property(
        self,
        lines: List[str],
        element: ElementMetadata,
        use_nullable: bool
    ):
        """Generate C# property for an attribute element."""
        nullable_ref = "?" if use_nullable else ""
        cs_type, is_value_type = TypeMapper.base_value_type_to_csharp(element.XsdValueType)
        
        # Write restriction annotations
        self._write_restriction_annotations(lines, element)
        
        # XmlAttribute
        lines.append(f'{self._indent(2)}[XmlAttribute("{element.XName}")]')
        
        # Fixed value handling
        if element.FixedValue:
            lines.append(f'{self._indent(2)}[BindNever]')
            if cs_type == 'string':
                lines.append(f'{self._indent(2)}public {cs_type} {element.Name} {{ get; set; }} = "{element.FixedValue}";')
            else:
                lines.append(f'{self._indent(2)}public {cs_type} {element.Name} {{ get; set; }} = {element.FixedValue};')
        else:
            required = element.MinOccurs > 0
            if required and is_value_type:
                lines.append(f'{self._indent(2)}[Required]')
            lines.append(f'{self._indent(2)}public {cs_type}{nullable_ref} {element.Name} {{ get; set; }}')
        
        lines.append("")
    
    def _write_restriction_annotations(self, lines: List[str], element: ElementMetadata):
        """Write validation annotations based on restrictions."""
        if element.IsReadOnly:
            lines.append(f'{self._indent(2)}[BindNever]')
        
        restrictions = element.Restrictions
        
        # String length
        if 'minLength' in restrictions:
            lines.append(f'{self._indent(2)}[MinLength({restrictions["minLength"].value})]')
        
        if 'maxLength' in restrictions:
            lines.append(f'{self._indent(2)}[MaxLength({restrictions["maxLength"].value})]')
        
        # Range
        has_range = False
        if 'minInclusive' in restrictions and 'maxInclusive' in restrictions:
            min_val = self._format_range_value(restrictions['minInclusive'].value, element.XsdValueType)
            max_val = self._format_range_value(restrictions['maxInclusive'].value, element.XsdValueType)
            lines.append(f'{self._indent(2)}[Range({min_val}, {max_val})]')
            has_range = True
        elif 'minimum' in restrictions and 'maximum' in restrictions:
            min_val = self._format_range_value(restrictions['minimum'].value, element.XsdValueType)
            max_val = self._format_range_value(restrictions['maximum'].value, element.XsdValueType)
            lines.append(f'{self._indent(2)}[Range({min_val}, {max_val})]')
            has_range = True
        
        # Pattern
        if 'pattern' in restrictions:
            pattern = restrictions['pattern'].value.replace('\\', '\\\\')
            lines.append(f'{self._indent(2)}[RegularExpression(@"{pattern}")]')
        
        # Type-specific validation
        if element.XsdValueType and not has_range:
            regex = RestrictionMapper.get_validation_regex(element.XsdValueType)
            if regex:
                lines.append(f'{self._indent(2)}[RegularExpression(@"{regex}")]')
            elif element.XsdValueType in [
                BaseValueType.INT, BaseValueType.LONG, BaseValueType.DOUBLE,
                BaseValueType.DECIMAL, BaseValueType.INTEGER,
                BaseValueType.POSITIVE_INTEGER, BaseValueType.NEGATIVE_INTEGER,
                BaseValueType.NON_NEGATIVE_INTEGER, BaseValueType.NON_POSITIVE_INTEGER
            ]:
                min_limit, max_limit = RestrictionMapper.get_range_limits(element.XsdValueType)
                lines.append(f'{self._indent(2)}[Range({min_limit}, {max_limit})]')
    
    def _format_range_value(self, value: str, base_type: BaseValueType) -> str:
        """Format range value for C# Range attribute."""
        is_decimal = '.' in value or ',' in value
        
        # Add 'd' suffix for decimal types if not already decimal
        if not is_decimal and base_type not in [BaseValueType.INT, BaseValueType.LONG]:
            return f"{value}d"
        
        return value
    
    def _should_write_altinn_row_id(self, element: ElementMetadata, metadata: ModelMetadata) -> bool:
        """Check if AltinnRowId property should be added."""
        # Add if any element with this type has MaxOccurs > 1
        return any(
            e.TypeName == element.TypeName and e.MaxOccurs > 1
            for e in metadata.Elements.values()
        )
    
    def _write_altinn_row_id(self, lines: List[str]):
        """Write AltinnRowId property."""
        lines.append(f'{self._indent(2)}[XmlAttribute("altinnRowId")]')
        lines.append(f'{self._indent(2)}[JsonPropertyName("altinnRowId")]')
        lines.append(f'{self._indent(2)}[System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]')
        lines.append(f'{self._indent(2)}[Newtonsoft.Json.JsonIgnore]')
        lines.append(f'{self._indent(2)}public Guid AltinnRowId {{ get; set; }}')
        lines.append("")
        lines.append(f'{self._indent(2)}public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;')
        lines.append("")
    
    def _indent(self, level: int = 1) -> str:
        """Generate indentation string."""
        return ' ' * (level * self.indent_size)
