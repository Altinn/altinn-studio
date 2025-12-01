# Datamodel Sync Tool

This tool replicates **Altinn Studio's exact datamodel generation capabilities**, producing identical XSD and C# output to what the Altinn Studio Designer generates.

## Architecture

The tool follows Altinn Studio's modular architecture:

```
datamodel_sync_tool/
├── __init__.py                    # Package exports
├── datamodel_sync_tool.py         # Main MCP tool entry point
├── test_generation.py             # Test script
│
├── metamodel/                     # Intermediate representation
│   ├── __init__.py
│   ├── enums.py                  # ElementType, BaseValueType, SchemaValueType
│   └── model_metadata.py         # ModelMetadata, ElementMetadata classes
│
├── converters/                    # Format converters
│   ├── __init__.py
│   ├── json_schema_to_metamodel.py   # JSON Schema → ModelMetadata
│   ├── metamodel_to_csharp.py        # ModelMetadata → C# classes
│   └── metamodel_to_xsd.py           # ModelMetadata → XSD
│
└── utils/                         # Utility functions
    ├── __init__.py
    ├── type_mapping.py           # Type conversions (JSON/XSD/C#)
    ├── naming.py                 # Name formatting (PascalCase, etc.)
    └── restrictions.py           # Validation rules mapping
```

## Generation Flow

```
JSON Schema
    ↓
[JsonSchemaToMetamodelConverter]
    ↓
ModelMetadata (intermediate representation)
    ↓         ↘
    ↓          [ModelMetadataToXsdConverter]
    ↓                    ↓
[ModelMetadataToCsharpConverter]
    ↓                    ↓
C# Classes            XSD File
```

## Key Features

### 1. ModelMetadata Intermediate Layer
- **ElementMetadata**: Represents each element with full metadata (type, restrictions, cardinality)
- **Hierarchical structure**: Parent-child relationships preserved
- **Type mapping**: Consistent mapping across JSON Schema → XSD → C#

### 2. Type Mapping
- **JSON Schema types** → `SchemaValueType` enum
- **XSD types** → `BaseValueType` enum  
- **C# types** → Proper nullable handling, value types vs reference types

### 3. Validation Annotations
- **MinLength/MaxLength**: String restrictions
- **Range**: Numeric min/max with proper C# limits
- **RegularExpression**: Pattern validation
- **Required**: Cardinality constraints

### 4. C# Generation Features
- **XmlElement** attributes with Order
- **JsonProperty** and **JsonPropertyName** for dual serialization
- **Required** attributes for mandatory fields
- **ShouldSerialize** methods for optional value types
- **AltinnRowId** for repeating elements
- **Nullable reference types** support

### 5. XSD Generation Features
- **xs:complexType** definitions
- **xs:sequence** with proper ordering
- **minOccurs/maxOccurs** cardinality
- **nillable** attribute support
- **Proper namespace handling**

## Usage

### As MCP Tool

```python
from server.tools.datamodel_sync_tool import datamodel_sync

result = datamodel_sync(schema_file_path="/path/to/model.schema.json")

# result = {
#     "status": "ok",
#     "generated": [
#         {"path": "model.xsd", "content": "...", "bytes": 1234, "sha256": "..."},
#         {"path": "model.cs", "content": "...", "bytes": 5678, "sha256": "..."}
#     ],
#     "warnings": [],
#     "errors": []
# }
```

### Programmatic Usage

```python
from server.tools.datamodel_sync_tool import DatamodelGenerator
import json

# Load schema
with open('model.schema.json', 'r') as f:
    schema = json.load(f)

# Generate files
generator = DatamodelGenerator(namespace="Altinn.App.Models")
results = generator.generate_from_json_schema(
    schema,
    generate_xsd=True,
    generate_csharp=True
)

print(results['xsd'])
print(results['csharp'])
```

### Testing

```bash
# Test with simple schemas
python test_generation.py

# Test with real Altinn app schema
python test_generation.py /path/to/app/App/models/model.schema.json
```

## Matching Altinn Studio

This implementation matches the following Altinn Studio classes:

1. **JsonSchemaToMetamodelConverter** → `Altinn.Studio.DataModeling.Converter.Metadata.JsonSchemaToMetamodelConverter`
2. **ModelMetadataToCsharpConverter** → `Altinn.Studio.DataModeling.Converter.Csharp.JsonMetadataToCsharpConverter`
3. **ModelMetadataToXsdConverter** → `Altinn.Studio.DataModeling.Converter.Json.JsonSchemaToXmlSchemaConverter`

The converters replicate the exact logic including:
- Property ordering (XmlElement Order attribute)
- Type mapping (BaseValueType enum)
- Restriction handling (MinLength, MaxLength, Range, Pattern)
- Nullable handling (both value types and reference types)
- Complex type generation and nesting

## Benefits Over Previous Implementation

### ✅ Proper Architecture
- Modular, testable components
- Clear separation of concerns
- Intermediate representation (ModelMetadata)

### ✅ Type Safety
- Enums for all type constants
- Dataclasses for structured data
- Type hints throughout

### ✅ Extensibility
- Easy to add new target formats
- Simple to enhance type mappings
- Clean extension points

### ✅ Maintainability
- Well-organized file structure
- Clear naming conventions
- Comprehensive documentation

### ✅ 1:1 Compatibility
- Matches Altinn Studio's exact output
- Same validation rules
- Identical annotation patterns

## Future Enhancements

- **XSD → JSON Schema** conversion (reverse direction)
- **JSON normalization** (resolve $ref, expand $defs)
- **Strategy pattern** for different schema types (General vs Seres)
- **Metadata persistence** (.metadata.json files)
- **Application metadata updates** (applicationmetadata.json integration)
