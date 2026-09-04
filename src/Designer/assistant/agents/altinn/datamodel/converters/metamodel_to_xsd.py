"""Converter from ModelMetadata to XSD (XML Schema).

Matches Altinn Studio's XSD generation logic.
"""

from typing import List, Set
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
from ..metamodel import ModelMetadata, ElementMetadata, ElementType, BaseValueType
from ..utils import TypeMapper


class ModelMetadataToXsdConverter:
    """Converts ModelMetadata to XSD (XML Schema Definition)."""
    
    XS_NAMESPACE = "http://www.w3.org/2001/XMLSchema"
    SERES_NAMESPACE = "http://seres.no/xsd/forvaltningsdata"
    
    def __init__(self):
        pass
    
    def convert(self, metadata: ModelMetadata) -> str:
        """Convert ModelMetadata to XSD string.
        
        Args:
            metadata: The model metadata to convert
            
        Returns:
            Formatted XSD as string
        """
        # Create root schema element
        schema = Element('xsd:schema')
        schema.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        schema.set('xmlns:seres', self.SERES_NAMESPACE)
        schema.set('xmlns:xs', self.XS_NAMESPACE)
        schema.set('attributeFormDefault', 'unqualified')
        schema.set('elementFormDefault', 'qualified')
        schema.set('xmlns:xsd', self.XS_NAMESPACE)
        
        # Only set targetNamespace if it's a valid namespace URI (not a file path)
        if metadata.TargetNamespace and not metadata.TargetNamespace.endswith('.json'):
            schema.set('targetNamespace', metadata.TargetNamespace)
        
        # Add annotation
        annotation = SubElement(schema, 'xs:annotation')
        documentation = SubElement(annotation, 'xs:documentation')
        root_attr = SubElement(documentation, 'xsd:attribute')
        root_attr.set('name', 'rootNode')
        root_attr.set('fixed', '')
        
        # Get root element
        root_element = metadata.get_root_element()
        
        # Create root element definition
        self._create_root_element(schema, root_element, metadata)
        
        # Create complex type definitions
        complex_types_added: Set[str] = set()
        self._create_complex_types(schema, root_element, metadata, complex_types_added)
        
        # Format and return
        return self._prettify_xml(schema)
    
    def _create_root_element(
        self, 
        schema: Element, 
        root: ElementMetadata,
        metadata: ModelMetadata
    ):
        """Create the root element definition."""
        element = SubElement(schema, 'xs:element')
        element.set('name', root.Name)
        
        # Create complex type for root
        complex_type = SubElement(element, 'xs:complexType')
        sequence = SubElement(complex_type, 'xs:sequence')
        
        # Add child elements
        children = [
            e for e in metadata.Elements.values()
            if e.ParentElement == root.ID
        ]
        
        for child in children:
            self._add_element_reference(sequence, child, metadata)
    
    def _create_complex_types(
        self,
        schema: Element,
        parent: ElementMetadata,
        metadata: ModelMetadata,
        added_types: Set[str]
    ):
        """Recursively create complex type definitions."""
        # Get child group elements (complex types)
        children = [
            e for e in metadata.Elements.values()
            if e.ParentElement == parent.ID and e.Type == ElementType.GROUP
        ]
        
        for child in children:
            if child.TypeName not in added_types:
                self._create_complex_type_definition(schema, child, metadata, added_types)
                added_types.add(child.TypeName)
                
                # Recursively process this type's children
                self._create_complex_types(schema, child, metadata, added_types)
    
    def _create_complex_type_definition(
        self,
        schema: Element,
        element: ElementMetadata,
        metadata: ModelMetadata,
        added_types: Set[str]
    ):
        """Create a complex type definition."""
        complex_type = SubElement(schema, 'xs:complexType')
        complex_type.set('name', element.TypeName)
        
        sequence = SubElement(complex_type, 'xs:sequence')
        
        # Add child elements
        children = [
            e for e in metadata.Elements.values()
            if e.ParentElement == element.ID
        ]
        
        for child in children:
            self._add_element_reference(sequence, child, metadata)
    
    def _add_element_reference(
        self,
        parent: Element,
        element: ElementMetadata,
        metadata: ModelMetadata
    ):
        """Add an element reference to a sequence or choice."""
        elem = SubElement(parent, 'xs:element')
        
        # IMPORTANT: Set attributes in the correct order for Altinn Studio compatibility
        # Order must be: minOccurs, name, type
        
        # Set minOccurs first
        if element.MinOccurs == 0:
            elem.set('minOccurs', '0')
        
        # Set name second
        elem.set('name', element.XName)
        
        # Set maxOccurs if > 1
        if element.MaxOccurs > 1:
            if element.MaxOccurs >= 99999:
                elem.set('maxOccurs', 'unbounded')
            else:
                elem.set('maxOccurs', str(element.MaxOccurs))
        
        # Set type last
        if element.Type == ElementType.FIELD:
            # Simple type - map to XSD type
            xsd_type = self._get_xsd_type(element)
            elem.set('type', xsd_type)
            
            # Add nillable if applicable
            if element.Nillable:
                elem.set('nillable', 'true')
        elif element.Type == ElementType.GROUP:
            # Complex type reference
            elem.set('type', element.TypeName)
            
            # Add nillable if applicable
            if element.Nillable:
                elem.set('nillable', 'true')
        elif element.Type == ElementType.ATTRIBUTE:
            # Attributes are handled separately
            pass
    
    def _get_xsd_type(self, element: ElementMetadata) -> str:
        """Get XSD type for an element."""
        if element.XsdValueType:
            type_map = {
                BaseValueType.STRING: 'xs:string',
                BaseValueType.NORMALIZED_STRING: 'xs:normalizedString',
                BaseValueType.TOKEN: 'xs:token',
                BaseValueType.INT: 'xs:int',
                BaseValueType.SHORT: 'xs:short',
                BaseValueType.DECIMAL: 'xs:decimal',
                BaseValueType.INTEGER: 'xs:integer',
                BaseValueType.POSITIVE_INTEGER: 'xs:positiveInteger',
                BaseValueType.NEGATIVE_INTEGER: 'xs:negativeInteger',
                BaseValueType.NON_NEGATIVE_INTEGER: 'xs:nonNegativeInteger',
                BaseValueType.NON_POSITIVE_INTEGER: 'xs:nonPositiveInteger',
                BaseValueType.DATE_TIME: 'xs:dateTime',
                BaseValueType.DATE: 'xs:date',
                BaseValueType.TIME: 'xs:time',
                BaseValueType.DURATION: 'xs:duration',
                BaseValueType.TIME_PERIOD: 'xs:duration',
                BaseValueType.G_YEAR: 'xs:gYear',
                BaseValueType.G_YEAR_MONTH: 'xs:gYearMonth',
                BaseValueType.G_MONTH: 'xs:gMonth',
                BaseValueType.G_MONTH_DAY: 'xs:gMonthDay',
                BaseValueType.G_DAY: 'xs:gDay',
                BaseValueType.BOOLEAN: 'xs:boolean',
                BaseValueType.DOUBLE: 'xs:double',
                BaseValueType.LONG: 'xs:long',
                BaseValueType.ANY_URI: 'xs:anyURI',
            }
            return type_map.get(element.XsdValueType, 'xs:string')
        
        return 'xs:string'
    
    def _prettify_xml(self, element: Element) -> str:
        """Return a pretty-printed XML string."""
        rough_string = tostring(element, encoding='unicode')
        reparsed = minidom.parseString(rough_string)
        
        # Get pretty XML
        pretty = reparsed.toprettyxml(indent='  ', encoding='utf-8').decode('utf-8')
        
        # Remove empty lines
        lines = [line for line in pretty.split('\n') if line.strip()]
        
        return '\n'.join(lines)
