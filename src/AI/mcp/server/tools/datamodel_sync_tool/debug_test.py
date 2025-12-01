"""Debug test to trace the issue."""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

import json
from converters.json_schema_to_metamodel import JsonSchemaToMetamodelConverter

# Simple nested schema
schema = {
    "$id": "test.schema.json",
    "title": "Model",
    "type": "object",
    "properties": {
        "Innsender": {
            "type": "object",
            "properties": {
                "Organisasjon": {
                    "type": "object",
                    "properties": {
                        "Navn": {"type": "string"}
                    }
                }
            }
        }
    }
}

# Convert to metamodel
converter = JsonSchemaToMetamodelConverter()
metadata = converter.convert(schema)

print("=" * 80)
print("ELEMENTS IN METADATA:")
print("=" * 80)
for element_id, element in metadata.Elements.items():
    print(f"\nID: {element_id}")
    print(f"  Name: {element.Name}")
    print(f"  XName: {element.XName}")
    print(f"  TypeName: {element.TypeName}")
    print(f"  ParentElement: {element.ParentElement}")
    print(f"  Type: {element.Type}")
    print(f"  MinOccurs: {element.MinOccurs}")
    print(f"  MaxOccurs: {element.MaxOccurs}")

print("\n" + "=" * 80)
print("PARENT-CHILD RELATIONSHIPS:")
print("=" * 80)
for element_id, element in metadata.Elements.items():
    children = [e for e in metadata.Elements.values() if e.ParentElement == element_id]
    if children:
        print(f"\n{element_id} ({element.TypeName}) has {len(children)} children:")
        for child in children:
            print(f"  - {child.ID} ({child.TypeName}, {child.Type})")
