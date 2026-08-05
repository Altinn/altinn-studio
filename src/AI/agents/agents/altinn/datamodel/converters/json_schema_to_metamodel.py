"""Converter from JSON Schema to ModelMetadata.

Matches Altinn Studio's JsonSchemaToMetamodelConverter logic.
"""

from typing import Dict, List, Optional, Any, Set
from ..metamodel import (
    ModelMetadata, ElementMetadata, ElementType, 
    SchemaValueType, BaseValueType, Restriction
)
from ..utils import TypeMapper, NamingConverter, RestrictionMapper


class JsonSchemaToMetamodelConverter:
    """Converts JSON Schema to ModelMetadata intermediate representation."""
    
    MAX_MAX_OCCURS = 99999
    
    def __init__(self):
        self.model_metadata: Optional[ModelMetadata] = None
        self.schema: Optional[Dict] = None
        self.required_properties: Dict[str, List[str]] = {}
        self.model_name: str = ""
        
    def convert(self, schema: Dict[str, Any]) -> ModelMetadata:
        """Convert JSON Schema to ModelMetadata.
        
        Args:
            schema: Parsed JSON Schema dictionary
            
        Returns:
            ModelMetadata instance with all elements
        """
        self.model_metadata = ModelMetadata()
        self.schema = schema
        self.required_properties = {}
        
        # Extract model name from title or use default
        self.model_name = schema.get('title', 'Model')
        
        # Set target namespace if present
        if '$id' in schema:
            self.model_metadata.TargetNamespace = schema['$id']
        
        # Process the root schema
        self._process_schema(schema)
        
        return self.model_metadata
    
    def _process_schema(self, schema: Dict[str, Any]):
        """Process the root JSON Schema."""
        root_name = NamingConverter.to_csharp_compatible(self.model_name)
        
        context = {
            'id': root_name,
            'parent_id': '',
            'name': root_name,
            'xpath': '/',
            'schema_value_type': SchemaValueType.OBJECT,
            'is_nillable': False,
            'xml_text': False,
            'order_oblivious': False,
            'is_array': False,
            'restrictions': {}
        }
        
        # Add root element if it has properties
        if 'properties' in schema:
            self._add_element(schema, context, is_root=True)
            
            # Track required properties
            if 'required' in schema:
                self._add_required_properties(context['id'], schema['required'])
            
            # Process all properties
            self._process_properties(schema.get('properties', {}), context)
    
    def _process_properties(self, properties: Dict[str, Any], parent_context: Dict):
        """Process properties keyword."""
        for prop_name, prop_schema in properties.items():
            current_context = {
                'id': NamingConverter.combine_id(parent_context['id'], prop_name),
                'name': prop_name,
                'parent_id': parent_context['id'],
                'xpath': NamingConverter.combine_xpath(parent_context['xpath'], prop_name),
                'schema_value_type': None,
                'is_nillable': False,
                'xml_text': prop_schema.get('@xsdText', False),
                'order_oblivious': parent_context.get('order_oblivious', False),
                'is_array': False,
                'restrictions': {}
            }
            
            self._process_sub_schema(prop_schema, current_context)
    
    def _process_sub_schema(self, schema: Dict[str, Any], context: Dict):
        """Process a sub-schema (property definition)."""
        # Check if required
        if 'required' in schema:
            self._add_required_properties(context['id'], schema['required'])
        
        # Determine schema type
        if self._is_primitive_type(schema):
            self._process_primitive_type(schema, context)
        elif self._is_array_type(schema):
            self._process_array_type(schema, context)
        elif self._is_object_type(schema):
            self._process_object_type(schema, context)
        elif '$ref' in schema:
            self._process_ref_type(schema, context)
        elif 'oneOf' in schema:
            self._process_one_of(schema, context)
        elif 'allOf' in schema:
            self._process_all_of(schema, context)
        elif 'anyOf' in schema:
            self._process_any_of(schema, context)
    
    def _is_primitive_type(self, schema: Dict) -> bool:
        """Check if schema defines a primitive type."""
        if 'type' not in schema:
            return False
        
        schema_type = schema['type']
        if isinstance(schema_type, list):
            # Filter out 'null' and check if remaining is primitive
            non_null_types = [t for t in schema_type if t != 'null']
            if len(non_null_types) == 1:
                return non_null_types[0] in ['string', 'number', 'integer', 'boolean']
            return False
        
        return schema_type in ['string', 'number', 'integer', 'boolean']
    
    def _is_array_type(self, schema: Dict) -> bool:
        """Check if schema defines an array type."""
        schema_type = schema.get('type')
        if isinstance(schema_type, list):
            return 'array' in schema_type
        return schema_type == 'array'
    
    def _is_object_type(self, schema: Dict) -> bool:
        """Check if schema defines an object type."""
        if 'properties' in schema:
            return True
        schema_type = schema.get('type')
        if isinstance(schema_type, list):
            return 'object' in schema_type
        return schema_type == 'object'
    
    def _process_primitive_type(self, schema: Dict, context: Dict):
        """Process a primitive type field."""
        schema_type = schema['type']
        
        # Handle nullable types (type: ["string", "null"])
        if isinstance(schema_type, list):
            context['is_nillable'] = 'null' in schema_type
            non_null_types = [t for t in schema_type if t != 'null']
            if non_null_types:
                schema_type = non_null_types[0]
        
        # Map to SchemaValueType
        type_map = {
            'string': SchemaValueType.STRING,
            'number': SchemaValueType.NUMBER,
            'integer': SchemaValueType.INTEGER,
            'boolean': SchemaValueType.BOOLEAN,
        }
        context['schema_value_type'] = type_map.get(schema_type, SchemaValueType.STRING)
        
        # Extract restrictions
        context['restrictions'] = RestrictionMapper.extract_restrictions(schema)
        
        self._add_element(schema, context)
    
    def _process_array_type(self, schema: Dict, context: Dict):
        """Process an array type."""
        context['is_array'] = True
        context['schema_value_type'] = SchemaValueType.ARRAY
        
        items = schema.get('items', {})
        
        if self._is_primitive_type(items):
            # Array of primitives
            self._add_element(schema, context)
        elif 'properties' in items:
            # Array of objects
            self._process_object_type(schema, context)
        elif '$ref' in items:
            # Array of referenced types
            self._add_element(schema, context)
    
    def _process_object_type(self, schema: Dict, context: Dict):
        """Process an object/complex type."""
        # For arrays, get the items schema
        if context.get('is_array'):
            items = schema.get('items', {})
            properties = items.get('properties', {})
            required = items.get('required', [])
        else:
            properties = schema.get('properties', {})
            required = schema.get('required', [])
        
        # Add the group element
        self._add_element(schema, context, element_type=ElementType.GROUP)
        
        # Track required properties
        if required:
            self._add_required_properties(context['id'], required)
        
        # Process child properties
        if properties:
            self._process_properties(properties, context)
    
    def _process_ref_type(self, schema: Dict, context: Dict):
        """Process a $ref reference."""
        ref_path = schema.get('$ref', '')
        
        if not ref_path:
            return
        
        # Resolve the reference
        resolved_schema = self._resolve_ref(ref_path)
        
        if resolved_schema:
            # Process the resolved schema with the current context
            self._process_sub_schema(resolved_schema, context)
        else:
            # Fallback: treat as complex type
            context['schema_value_type'] = SchemaValueType.OBJECT
            self._add_element(schema, context, element_type=ElementType.GROUP)
    
    def _resolve_ref(self, ref_path: str) -> Optional[Dict]:
        """Resolve a JSON Schema $ref pointer.
        
        Args:
            ref_path: JSON Pointer like "#/$defs/Innsender" or "#/definitions/Innsender"
            
        Returns:
            Resolved schema dict or None if not found
        """
        if not ref_path.startswith('#/'):
            # External references not supported yet
            return None
        
        # Parse the pointer path
        parts = ref_path[2:].split('/')  # Remove '#/' and split
        
        # Navigate through the schema
        current = self.schema
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        
        return current if isinstance(current, dict) else None
    
    def _process_one_of(self, schema: Dict, context: Dict):
        """Process oneOf keyword (typically for nullable types)."""
        one_of_schemas = schema.get('oneOf', [])
        
        # Check for nullable pattern
        non_null_schemas = [s for s in one_of_schemas if s.get('type') != 'null']
        
        if len(non_null_schemas) == 1:
            context['is_nillable'] = len(one_of_schemas) > 1
            self._process_sub_schema(non_null_schemas[0], context)
        else:
            # Multiple options - process first non-null
            for sub_schema in non_null_schemas:
                self._process_sub_schema(sub_schema, context)
                break
    
    def _process_all_of(self, schema: Dict, context: Dict):
        """Process allOf keyword (typically for restrictions)."""
        all_of_schemas = schema.get('allOf', [])
        
        # Merge restrictions from all schemas
        for sub_schema in all_of_schemas:
            if '$ref' in sub_schema:
                self._process_ref_type(sub_schema, context)
            else:
                # Extract and merge restrictions
                restrictions = RestrictionMapper.extract_restrictions(sub_schema)
                context['restrictions'].update(restrictions)
                
                # Process the schema
                if 'type' in sub_schema:
                    self._process_sub_schema(sub_schema, context)
    
    def _process_any_of(self, schema: Dict, context: Dict):
        """Process anyOf keyword."""
        any_of_schemas = schema.get('anyOf', [])
        
        # Process first non-null schema
        for sub_schema in any_of_schemas:
            if sub_schema.get('type') != 'null':
                self._process_sub_schema(sub_schema, context)
                break
    
    def _add_element(
        self, 
        schema: Dict, 
        context: Dict, 
        element_type: Optional[ElementType] = None,
        is_root: bool = False
    ):
        """Add an element to the model metadata."""
        element_id = context['id']
        
        # Skip if already added
        if element_id in self.model_metadata.Elements:
            return
        
        # Determine element type
        if element_type is None:
            if context.get('schema_value_type') == SchemaValueType.OBJECT or 'properties' in schema:
                element_type = ElementType.GROUP
            else:
                element_type = ElementType.FIELD
        
        # Determine type name
        if element_type == ElementType.FIELD:
            type_name = context.get('schema_value_type', SchemaValueType.STRING).name.lower()
        else:
            type_name = NamingConverter.to_csharp_compatible(context['name'])
        
        # Calculate min/max occurs
        min_occurs = self._get_min_occurs(schema, context)
        max_occurs = self._get_max_occurs(schema, context)
        
        # Map to XSD value type
        xsd_value_type = None
        if context.get('schema_value_type'):
            format_hint = schema.get('format')
            xsd_value_type = TypeMapper.map_json_schema_to_base_value_type(
                context['schema_value_type'], 
                format_hint
            )
        
        # Create element metadata
        element = ElementMetadata(
            ID=element_id,
            Name=NamingConverter.to_csharp_compatible(context['name']),
            XName=context['name'],
            TypeName=type_name,
            ParentElement=context['parent_id'] if context['parent_id'] else None,
            XsdValueType=xsd_value_type,
            XPath=context['xpath'],
            JsonSchemaPointer=f"#/properties/{context['name']}",
            MinOccurs=min_occurs,
            MaxOccurs=max_occurs,
            Type=element_type,
            Restrictions=context.get('restrictions', {}),
            FixedValue=schema.get('const'),
            DataBindingName=self._get_data_binding_name(element_type, max_occurs, element_id, context['xpath']),
            DisplayString=f"{element_id} : [{min_occurs}..{max_occurs}] {type_name}",
            IsTagContent=context.get('xml_text', False),
            Nillable=context.get('is_nillable', False),
            OrderOblivious=context.get('order_oblivious', False),
        )
        
        self.model_metadata.Elements[element_id] = element
    
    def _get_min_occurs(self, schema: Dict, context: Dict) -> int:
        """Calculate minOccurs for an element."""
        if context.get('is_nillable'):
            return 0
        
        # Check if this property is required
        parent_id = context.get('parent_id', context['id'])
        if self._is_required(parent_id, context['name']):
            return 1
        
        # Check minItems for arrays
        if context.get('is_array') and 'minItems' in schema:
            return schema['minItems']
        
        return 0
    
    def _get_max_occurs(self, schema: Dict, context: Dict) -> int:
        """Calculate maxOccurs for an element."""
        if context.get('is_array'):
            if 'maxItems' in schema:
                return schema['maxItems']
            return self.MAX_MAX_OCCURS
        
        return 1
    
    def _get_data_binding_name(self, element_type: ElementType, max_occurs: int, 
                                element_id: str, xpath: str) -> Optional[str]:
        """Generate data binding name for an element."""
        if element_type != ElementType.GROUP and '.' in element_id:
            # Extract data binding path from xpath
            first_prop = element_id[:element_id.index('.')]
            binding_path = xpath.replace(f"/{first_prop}/", "")
            return binding_path.replace('/', '.')
        elif element_type == ElementType.GROUP and max_occurs > 1:
            first_prop = element_id[:element_id.index('.')] if '.' in element_id else element_id
            binding_path = xpath.replace(f"/{first_prop}/", "")
            return binding_path.replace('/', '.')
        
        return None
    
    def _add_required_properties(self, parent_id: str, required: List[str]):
        """Track required properties for a parent element."""
        if parent_id not in self.required_properties:
            self.required_properties[parent_id] = []
        self.required_properties[parent_id].extend(required)
    
    def _is_required(self, parent_id: str, property_name: str) -> bool:
        """Check if a property is required."""
        return property_name in self.required_properties.get(parent_id, [])
