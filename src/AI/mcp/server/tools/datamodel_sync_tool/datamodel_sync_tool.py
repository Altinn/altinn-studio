"""Datamodel generation tool matching Altinn Studio's capabilities.

This tool generates XSD and C# files from JSON Schema files,
using the same conversion logic as Altinn Studio Designer.
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, Any

from mcp.types import ToolAnnotations
from server.tools import register_tool

from .converters import (
    JsonSchemaToMetamodelConverter,
    ModelMetadataToCsharpConverter,
    ModelMetadataToXsdConverter,
)


class DatamodelGenerator:
    """Main generator class matching Altinn Studio's datamodel generation."""
    
    def __init__(self, namespace: str = "Altinn.App.Models"):
        self.namespace = namespace
        self.json_to_metamodel = JsonSchemaToMetamodelConverter()
        self.metamodel_to_csharp = ModelMetadataToCsharpConverter(namespace=namespace)
        self.metamodel_to_xsd = ModelMetadataToXsdConverter()
    
    def generate_from_json_schema(
        self, 
        schema: Dict[str, Any],
        generate_xsd: bool = True,
        generate_csharp: bool = True
    ) -> Dict[str, str]:
        """Generate XSD and/or C# from JSON Schema.
        
        Args:
            schema: Parsed JSON Schema dictionary
            generate_xsd: Whether to generate XSD file
            generate_csharp: Whether to generate C# class file
            
        Returns:
            Dictionary with generated content: {'xsd': '...', 'csharp': '...'}
        """
        results = {}
        
        # Step 1: Convert JSON Schema to ModelMetadata (intermediate representation)
        metadata = self.json_to_metamodel.convert(schema)
        
        # Step 2: Generate XSD from ModelMetadata
        if generate_xsd:
            xsd_content = self.metamodel_to_xsd.convert(metadata)
            results['xsd'] = xsd_content
        
        # Step 3: Generate C# from ModelMetadata
        if generate_csharp:
            csharp_content = self.metamodel_to_csharp.convert(
                metadata,
                separate_namespace=False,
                use_nullable_reference_types=False
            )
            results['csharp'] = csharp_content
        
        return results


# Global generator instance
_generator = DatamodelGenerator()


@register_tool(
    name="datamodel_sync",
    description="""
Generates XSD and C# files from a JSON schema file.

This tool replicates Altinn Studio's exact datamodel generation logic, producing
identical XSD and C# output to what the Altinn Studio Designer generates.

The generation process:
1. Parses the JSON Schema
2. Converts to ModelMetadata (intermediate representation)
3. Generates XSD from ModelMetadata
4. Generates C# classes from ModelMetadata

Parameters:
- schema_file_path: Path to the .schema.json file to process

Returns:
- status: "ok" | "error"
- generated: List of generated files with path, content, bytes, sha256
- warnings: Any warnings during generation
- errors: Any errors encountered

Example usage:
{
  "schema_file_path": "/path/to/model.schema.json"
}

Response format:
{
  "status": "ok",
  "generated": [
    {
      "path": "model.xsd",
      "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
      "bytes": 1234,
      "sha256": "abc123..."
    },
    {
      "path": "model.cs", 
      "content": "using System;\\nnamespace Altinn.App.Models { ... }",
      "bytes": 5678,
      "sha256": "def456..."
    }
  ],
  "warnings": [],
  "errors": []
}
""",
    title="Datamodel Sync Tool",
    annotations=ToolAnnotations(
        title="Datamodel Sync Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def datamodel_sync(schema_file_path: str) -> Dict[str, Any]:
    """Generate XSD and C# files from a JSON schema file.
    
    Args:
        schema_file_path: Path to the .schema.json file to process
        
    Returns:
        Dictionary with status, generated files, warnings, and errors
    """
    # Validate required parameter
    if not schema_file_path:
        return {
            "status": "error",
            "generated": [],
            "warnings": [],
            "errors": ["Missing required parameter: schema_file_path"]
        }
    
    # Validate file exists and is readable
    schema_path = Path(schema_file_path)
    if not schema_path.exists():
        return {
            "status": "error",
            "generated": [],
            "warnings": [],
            "errors": [f"Schema file does not exist: {schema_file_path}"]
        }
    
    try:
        # Load the JSON schema
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_content = json.load(f)
        
        # Generate base filename (remove .schema.json extension)
        base_name = schema_path.stem
        if base_name.endswith('.schema'):
            base_name = base_name[:-7]  # Remove .schema part
        
        generated_files = []
        warnings = []
        errors = []
        
        # Generate both XSD and C# using the new converters
        try:
            results = _generator.generate_from_json_schema(
                schema_content,
                generate_xsd=True,
                generate_csharp=True
            )
            
            # Add XSD to results
            if 'xsd' in results:
                xsd_content = results['xsd']
                generated_files.append({
                    "path": f"{base_name}.xsd",
                    "content": xsd_content,
                    "bytes": len(xsd_content.encode('utf-8')),
                    "sha256": hashlib.sha256(xsd_content.encode('utf-8')).hexdigest()
                })
            
            # Add C# to results
            if 'csharp' in results:
                cs_content = results['csharp']
                generated_files.append({
                    "path": f"{base_name}.cs",
                    "content": cs_content,
                    "bytes": len(cs_content.encode('utf-8')),
                    "sha256": hashlib.sha256(cs_content.encode('utf-8')).hexdigest()
                })
                
        except Exception as e:
            errors.append(f"Generation failed: {str(e)}")
            import traceback
            errors.append(f"Traceback: {traceback.format_exc()}")
        
        # Return response
        if errors:
            return {
                "status": "error",
                "generated": generated_files,  # Return any successfully generated files
                "warnings": warnings,
                "errors": errors
            }
        else:
            return {
                "status": "ok",
                "generated": generated_files,
                "warnings": warnings,
                "errors": errors
            }
            
    except json.JSONDecodeError as e:
        return {
            "status": "error",
            "generated": [],
            "warnings": [],
            "errors": [f"Invalid JSON in schema file: {str(e)}"]
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "generated": [],
            "warnings": [],
            "errors": [
                f"Failed to process schema: {str(e)}",
                f"Traceback: {traceback.format_exc()}"
            ]
        }
