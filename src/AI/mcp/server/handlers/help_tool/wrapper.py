"""altinn_help - Detailed documentation lookup tool."""

from typing import Dict, Any
from server.handlers import (
    register_tool,
    ToolCategory,
    OperationMode,
    ToolSuccess,
    ToolError,
)


# Help topics with detailed documentation
HELP_TOPICS = {
    "overview": """
# Altinn Studio Development Overview

## What is Altinn Studio?
Altinn Studio is a platform for developing digital services for Norwegian public agencies.

## Key Concepts
- **Apps**: Self-contained digital services
- **Data Models**: JSON Schema-based data structures
- **Layouts**: UI definitions in JSON format
- **Policies**: XACML-based authorization rules
- **Process**: BPMN workflow definitions

## Development Workflow
1. Define data model (.schema.json)
2. Generate XSD and C# (altinn_datamodel_sync)
3. Create UI layouts (altinn_layout_*)
4. Configure authorization (altinn_policy_*)
5. Add text resources (altinn_resource_*)
""",
    "datamodel": """
# Data Model Development

## File Structure
- `App/models/model.schema.json` - Source of truth (create manually)
- `App/models/model.xsd` - Generated from schema
- `App/models/model.cs` - Generated from schema

## JSON Schema Format
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "fieldName": {"type": "string"}
  }
}
```

## Tools
- `altinn_datamodel_docs` - Full documentation
- `altinn_datamodel_sync` - Generate XSD/C# from schema
""",
    "layout": """
# Layout Development

## File Structure
- `App/ui/layouts/*.json` - Layout definitions
- `App/ui/Settings.json` - UI settings

## Component Structure
```json
{
  "data": {
    "layout": [
      {
        "id": "unique-id",
        "type": "Input",
        "dataModelBindings": {
          "simpleBinding": "fieldName"
        }
      }
    ]
  }
}
```

## Tools
- `altinn_layout_list` - Get available components
- `altinn_layout_props` - Get component properties
- `altinn_layout_validate` - Validate layout JSON
""",
    "policy": """
# Authorization Policy Development

## File Location
- `App/config/authorization/policy.xml`

## XACML Structure
Policies define who can do what actions on which resources.

## Tools
- `altinn_policy_docs` - Full documentation
- `altinn_policy_summarize` - Parse and summarize policy.xml
- `altinn_policy_validate` - Validate against requirements
""",
    "resource": """
# Text Resource Development

## File Structure
- `App/config/texts/resource.nb.json` - Norwegian Bokmål
- `App/config/texts/resource.nn.json` - Norwegian Nynorsk
- `App/config/texts/resource.en.json` - English

## Format
```json
{
  "language": "nb",
  "resources": [
    {"id": "key", "value": "Text value"}
  ]
}
```

## Tools
- `altinn_resource_docs` - Full documentation
- `altinn_resource_validate` - Validate resource files
""",
}


def _get_available_topics():
    """Get list of available help topics."""
    return list(HELP_TOPICS.keys())


@register_tool(
    name="altinn_help",
    description="Get detailed documentation on Altinn development topics.",
    category=ToolCategory.DOCS,
    mode=OperationMode.IDEMPOTENT,
    schema_hints={
        "topic": f"One of: {', '.join(HELP_TOPICS.keys())}",
    },
)
def help_tool(topic: str = "overview") -> Dict[str, Any]:
    """Get detailed documentation on a specific topic.
    
    Args:
        topic: The help topic to retrieve.
    """
    topic_lower = topic.lower().strip()
    
    if topic_lower not in HELP_TOPICS:
        return ToolError(
            error_code="UNKNOWN_TOPIC",
            message=f"Unknown topic: {topic}",
            recommended_args={"topic": "overview"},
            why=f"Available topics: {', '.join(HELP_TOPICS.keys())}",
        ).to_dict()
    
    content = HELP_TOPICS[topic_lower]
    
    return ToolSuccess(
        content=content,
    ).to_dict()
