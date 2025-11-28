"""Test script to verify datamodel generation matches Altinn Studio output."""

import json
from pathlib import Path
from datamodel_sync_tool import DatamodelGenerator


def test_simple_schema():
    """Test with a simple JSON Schema."""
    
    # Simple test schema
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "https://altinn.no/schemas/test/model",
        "title": "TestModel",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "maxLength": 100
            },
            "age": {
                "type": "integer",
                "minimum": 0,
                "maximum": 150
            },
            "email": {
                "type": "string",
                "format": "email"
            },
            "isActive": {
                "type": "boolean"
            }
        },
        "required": ["name", "age"]
    }
    
    # Generate files
    generator = DatamodelGenerator()
    results = generator.generate_from_json_schema(schema)
    
    print("=" * 80)
    print("GENERATED XSD:")
    print("=" * 80)
    print(results['xsd'])
    print()
    
    print("=" * 80)
    print("GENERATED C#:")
    print("=" * 80)
    print(results['csharp'])
    print()


def test_complex_schema():
    """Test with a complex nested schema."""
    
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "https://altinn.no/schemas/test/company",
        "title": "CompanyModel",
        "type": "object",
        "properties": {
            "organizationNumber": {
                "type": "string",
                "pattern": "^[0-9]{9}$"
            },
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 255
            },
            "employees": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "firstName": {"type": "string"},
                        "lastName": {"type": "string"},
                        "birthDate": {
                            "type": "string",
                            "format": "date"
                        }
                    },
                    "required": ["firstName", "lastName"]
                }
            },
            "address": {
                "type": "object",
                "properties": {
                    "street": {"type": "string"},
                    "postalCode": {"type": "string"},
                    "city": {"type": "string"}
                }
            }
        },
        "required": ["organizationNumber", "name"]
    }
    
    # Generate files
    generator = DatamodelGenerator()
    results = generator.generate_from_json_schema(schema)
    
    print("=" * 80)
    print("COMPLEX SCHEMA - GENERATED XSD:")
    print("=" * 80)
    print(results['xsd'])
    print()
    
    print("=" * 80)
    print("COMPLEX SCHEMA - GENERATED C#:")
    print("=" * 80)
    print(results['csharp'])
    print()


def test_with_real_schema(schema_path: str):
    """Test with a real Altinn app schema file."""
    
    schema_file = Path(schema_path)
    if not schema_file.exists():
        print(f"Schema file not found: {schema_path}")
        return
    
    with open(schema_file, 'r') as f:
        schema = json.load(f)
    
    # Generate files
    generator = DatamodelGenerator()
    results = generator.generate_from_json_schema(schema)
    
    print("=" * 80)
    print(f"REAL SCHEMA ({schema_file.name}) - GENERATED XSD:")
    print("=" * 80)
    print(results['xsd'])
    print()
    
    print("=" * 80)
    print(f"REAL SCHEMA ({schema_file.name}) - GENERATED C#:")
    print("=" * 80)
    print(results['csharp'])
    print()
    
    # Save to files for comparison
    output_dir = schema_file.parent
    base_name = schema_file.stem.replace('.schema', '')
    
    xsd_path = output_dir / f"{base_name}.xsd"
    cs_path = output_dir / f"{base_name}.cs"
    
    with open(xsd_path, 'w', encoding='utf-8') as f:
        f.write(results['xsd'])
    print(f"✓ Saved XSD to: {xsd_path}")
    
    with open(cs_path, 'w', encoding='utf-8') as f:
        f.write(results['csharp'])
    print(f"✓ Saved C# to: {cs_path}")


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("DATAMODEL GENERATION TEST")
    print("=" * 80 + "\n")
    
    # Test simple schema
    test_simple_schema()
    
    # Test complex schema
    test_complex_schema()
    
    # Test with real schema if path provided
    import sys
    if len(sys.argv) > 1:
        test_with_real_schema(sys.argv[1])
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80 + "\n")
