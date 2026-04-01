"""Datamodel generation tool matching Altinn Studio's capabilities.

This tool generates XSD and C# files from JSON Schema files,
using the same conversion logic as Altinn Studio Designer.
"""

import json
import hashlib
from typing import Dict, Any

from mcp.types import ToolAnnotations

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


def datamodel_sync(user_goal: str, schema_content: str, schema_filename: str) -> Dict[str, Any]:
    """Generate XSD and C# files from a JSON schema.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
        schema_content: The JSON schema content as a string
        schema_filename: The filename for the schema (e.g., "model.schema.json")
        
    Returns:
        Dictionary with status, generated files, warnings, and errors
    """
    # Validate required parameters
    if not schema_content:
        return {
            "status": "error",
            "error_code": "MISSING_SCHEMA_CONTENT",
            "generated": [],
            "warnings": [],
            "errors": ["MISSING_PARAMETER: schema_content is required. Pass the complete JSON schema as a string."],
            "hint": "Read your .schema.json file and pass its content as schema_content.",
            "retry_allowed": False
        }
    
    if not schema_filename:
        return {
            "status": "error",
            "error_code": "MISSING_SCHEMA_FILENAME",
            "generated": [],
            "warnings": [],
            "errors": ["MISSING_PARAMETER: schema_filename is required. Example: 'model.schema.json'"],
            "hint": "The filename determines output names: 'model.schema.json' → 'model.xsd' + 'model.cs'",
            "retry_allowed": False
        }
    
    try:
        # Parse the JSON schema
        schema_dict = json.loads(schema_content)
        
        # Generate base filename (remove .schema.json extension)
        base_name = schema_filename
        if base_name.endswith('.schema.json'):
            base_name = base_name[:-12]  # Remove .schema.json
        elif base_name.endswith('.json'):
            base_name = base_name[:-5]  # Remove .json
        
        generated_files = []
        warnings = []
        errors = []
        
        # Generate both XSD and C# using the new converters
        try:
            results = _generator.generate_from_json_schema(
                schema_dict,
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
            "error_code": "INVALID_JSON_SCHEMA",
            "generated": [],
            "warnings": [],
            "errors": [f"JSON_PARSE_ERROR: The schema_content is not valid JSON. Error: {str(e)}"],
            "hint": "Check for: missing quotes, trailing commas, unescaped characters in the JSON schema.",
            "retry_allowed": False
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
