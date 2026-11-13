---
name: studio-data-model
description: 'How Altinn data models work: JSON Schema conventions, C# class generation, binding names, and the datamodel sync workflow. Load before creating or changing anything under App/models/.'
---

# ALTINN DATAMODEL STRUCTURE AND RULES

## CRITICAL REQUIREMENT

When working with Altinn datamodels, change **ONLY** the `.schema.json` file, then call `altinn_datamodel_sync` with its path. Altinn Studio Designer then generates the `.cs` and `.xsd` files and adds or updates the model's data type in `App/config/applicationmetadata.json`, exactly as "Generate model" in Studio does. **Never write or edit the `.cs` or `.xsd` file yourself.**

**IMPORTANT:** A new app made in Studio has **ONE** data model, and its files are named `model`:

- `model.cs`
- `model.schema.json`
- `model.xsd`

**Keep the C# class name and the XML root element of an existing model.** The JSON schema sets them in two different ways:

- The C# class name is the root type name. If the root refers to a type in `$defs` or `definitions` through a `oneOf` with one `$ref`, the root type name is the name of that type. If the root has its own `properties`, the root type name is the `@xsdRootElement` value. Do not put a `$ref` directly on the root, because Designer cannot generate the model from such a schema.
- The XML root element is the `@xsdRootElement` value.

A new class name breaks the app's C# code. A new root element changes the XML of the data the app stores. So in an existing model, do not change `@xsdRootElement`, do not rename the type that the root refers to, and do not move the root properties into or out of a `$defs` type. A new data model needs a root type name that no other data model in the app uses.

## FILE STRUCTURES

### 1. C# MODEL FILE (model.cs)

**Structure:**

- Namespace: `Altinn.App.Models.[ModelName]`
- Class declaration with `[XmlRoot]` attribute
- Properties with serialization attributes:
  - `[XmlElement]` with name and order
  - `[Required]` if property is mandatory
  - `[JsonProperty]` and `[JsonPropertyName]`

**Example:**

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models.ModelName
{
  [XmlRoot(ElementName="ModelName")]
  public class ModelName
  {
    [XmlElement("propertyName", Order = 1)]
    [Required]
    [JsonProperty("propertyName")]
    [JsonPropertyName("propertyName")]
    public string propertyName { get; set; }
  }
}
```

### 2. JSON SCHEMA FILE (model.schema.json)

**Structure:**

- `$schema` and `$id` declarations
- `@xsdNamespaces` and `@xsdSchemaAttributes` sections
- `@xsdRootElement`, the XML root element, matching the model name for a new model
- `"required"` array listing mandatory properties
- `"properties"` object defining each property with its type
- `"$defs"` section for reusable data type definitions
- `"$ref"` references to link to defined types

**Example:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "http://altinn-repositories:3000/org/repo/App/models/ModelName.schema.json",
  "info": {
    "rootNode": ""
  },
  "@xsdNamespaces": {
    "xsd": "http://www.w3.org/2001/XMLSchema",
    "xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "seres": "http://seres.no/xsd/forvaltningsdata"
  },
  "@xsdSchemaAttributes": {
    "AttributeFormDefault": "Unqualified",
    "ElementFormDefault": "Qualified",
    "BlockDefault": "None",
    "FinalDefault": "None"
  },
  "@xsdRootElement": "ModelName",
  "type": "object",
  "required": ["propertyName"],
  "properties": {
    "propertyName": {
      "type": "string"
    },
    "complexProperty": {
      "$ref": "#/$defs/ComplexType"
    }
  },
  "$defs": {
    "ComplexType": {
      "properties": {
        "subProperty": {
          "@xsdType": "string",
          "type": "string"
        }
      }
    }
  }
}
```

### 3. XML SCHEMA FILE (model.xsd)

**Structure:**

- XML declaration and namespace definitions
- `xs:annotation` section with `rootNode` attribute
- `xs:element` with the model name
- `xs:complexType` with `xs:sequence` of property elements
- Each property as `xs:element` with type and `minOccurs` attributes

**Example:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<xsd:schema xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xmlns:seres="http://seres.no/xsd/forvaltningsdata"
            xmlns:xs="http://www.w3.org/2001/XMLSchema"
            attributeFormDefault="unqualified"
            elementFormDefault="qualified"
            xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>
      <xsd:attribute name="rootNode" fixed="" />
    </xs:documentation>
  </xs:annotation>
  <xs:element name="ModelName">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="propertyName" type="xs:string" />
        <xs:element minOccurs="0" name="optionalProperty" type="xs:string" />
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xsd:schema>
```

## DATA TYPES AND REFERENCES

### 1. Using $defs for Reusable Data Types

The `$defs` section allows you to define reusable data types within your JSON schema. This promotes consistency and reduces duplication.

**Structure:**

```json
"$defs": {
  "TypeName": {
    "properties": {
      "propertyName": {
        "@xsdType": "string",
        "type": "string",
        "@xsdMinOccurs": 0
      }
    }
  }
}
```

### 2. Using $ref to Reference Defined Types

Use `$ref` to reference types defined in the `$defs` section or external schemas.

**Internal Reference:**

```json
"complexProperty": {
  "$ref": "#/$defs/ComplexType"
}
```

**Array of References:**

```json
"arrayProperty": {
  "type": "array",
  "items": {
    "$ref": "#/$defs/ItemType"
  },
  "@xsdMinOccurs": 0,
  "@xsdMaxOccurs": "unbounded"
}
```

### 3. Common Data Type Patterns

**Enumeration Types:**

```json
"$defs": {
  "StatusType": {
    "@xsdType": "string",
    "@xsdStructure": "XmlSchemaSimpleTypeRestriction",
    "type": "string",
    "enum": [
      "Active",
      "Inactive",
      "Pending"
    ]
  }
}
```

**Restricted String Types:**

```json
"$defs": {
  "PersonName": {
    "@xsdType": "string",
    "@xsdStructure": "XmlSchemaSimpleTypeRestriction",
    "type": "string",
    "maxLength": 175,
    "minLength": 1
  }
}
```

**Complex Object Types:**

```json
"$defs": {
  "Address": {
    "properties": {
      "street": {
        "@xsdType": "string",
        "type": "string",
        "@xsdMinOccurs": 0
      },
      "city": {
        "@xsdType": "string",
        "type": "string",
        "@xsdMinOccurs": 0
      },
      "postalCode": {
        "@xsdType": "string",
        "type": "string",
        "@xsdMinOccurs": 0
      }
    }
  }
}
```

### 4. XSD Attributes for JSON Schema

**Common XSD Attributes:**

- `@xsdType`: Specifies the XSD type (e.g., "string", "boolean", "integer")
- `@xsdMinOccurs`: Controls if element is optional (0) or required (omit attribute)
- `@xsdMaxOccurs`: For arrays, use "unbounded" for unlimited items
- `@xsdStructure`: Use "XmlSchemaSimpleTypeRestriction" for enums and restricted types

## POLYMORPHISM AND OOB CONCEPTS

### 1. Using $defs for Reusable Data Types

The `$defs` section allows you to define reusable data types within your JSON schema. This promotes consistency and reduces duplication.

**Structure:**

```json
"$defs": {
  "TypeName": {
    "properties": {
      "propertyName": {
        "@xsdType": "string",
        "type": "string",
        "@xsdMinOccurs": 0
      }
    }
  }
}
```

### 2. Using $ref to Reference Defined Types

Use `$ref` to reference types defined in the `$defs` section following standard object-oriented programming principles.

**Internal Reference:**

```json
"complexProperty": {
  "$ref": "#/$defs/ComplexType"
}
```

**Array of References:**

```json
"arrayProperty": {
  "type": "array",
  "items": {
    "$ref": "#/$defs/ItemType"
  },
  "@xsdMinOccurs": 0,
  "@xsdMaxOccurs": "unbounded"
}
```

### 3. Root Model Definition with oneOf

Some data models use `oneOf` at the root level to reference the main data structure:

```json
"@xsdRootElement": "model",
"type": "object",
"oneOf": [
  {
    "$ref": "#/$defs/MainDataModel"
  }
],
"$defs": {
  "MainDataModel": {
    "properties": {
      "surveyField1": {
        "@xsdType": "string",
        "type": "string"
      },
      "surveyField2": {
        "$ref": "#/$defs/ComplexType"
      }
    }
  }
}
```

This ensures there is only one instance of the main `model` object representing the entire app's data.

### 4. Common Data Type Patterns

**Enumeration Types:**

```json
"$defs": {
  "StatusType": {
    "@xsdType": "string",
    "@xsdStructure": "XmlSchemaSimpleTypeRestriction",
    "type": "string",
    "enum": ["Active", "Inactive", "Pending"]
  }
}
```

**Restricted String Types:**

```json
"$defs": {
  "PersonName": {
    "@xsdType": "string",
    "@xsdStructure": "XmlSchemaSimpleTypeRestriction",
    "type": "string",
    "maxLength": 175,
    "minLength": 1
  }
}
```

## TYPE MAPPINGS

| Base Type | C# Type  | JSON Schema Type | XSD Type    |
| --------- | -------- | ---------------- | ----------- |
| string    | string   | string           | xs:string   |
| integer   | int      | integer          | xs:integer  |
| number    | decimal  | number           | xs:decimal  |
| boolean   | bool     | boolean          | xs:boolean  |
| date      | DateTime | string           | xs:date     |
| datetime  | DateTime | string           | xs:dateTime |
| array     | List<T>  | array            | complex     |
| object    | Class    | object/$ref      | complex     |

## NAMING CONVENTIONS

### 1. Model Names:

- Use PascalCase (e.g., "TaxReport")
- Must be consistent across all three files
- `@xsdRootElement` becomes the root element in XSD, and the root type name becomes the class name in C#

### 2. Property Names:

- Use camelCase (e.g., "firstName")
- Must be consistent across all three files
- Used as property name in C#, property key in JSON schema, and element name in XSD

### 3. Data Type Names in $defs:

- Use PascalCase (e.g., "PersonDetails", "AddressInfo")
- Should be descriptive and follow object-oriented naming principles
- Avoid generic names like "Type1" or "Data"

## VALIDATION RULES

You write the JSON schema part of each rule. The generated C# and XSD files follow from it.

### 1. Required Properties:

- C#: Add `[Required]` attribute
- JSON Schema: Include in "required" array
- XSD: Omit `minOccurs="0"` attribute

### 2. Optional Properties:

- C#: No `[Required]` attribute
- JSON Schema: Add `"@xsdMinOccurs": 0` attribute
- XSD: Add `minOccurs="0"` attribute

### 3. Array Properties:

- C#: Use `List<T>` type
- JSON Schema: Use `"type": "array"` with `"items"` containing `$ref` or type definition
- XSD: Use `maxOccurs="unbounded"` for unlimited items

### 4. Property Order:

- C#: Specify in Order parameter of `[XmlElement]`
- XSD: Maintain same sequence order
- JSON Schema: Order not enforced but recommended for consistency

## EDITING GUIDELINES

### 1. Adding a Data Type:

- Add new definition in `$defs` section of JSON schema
- Use consistent naming across all files

### 2. Adding a Property:

- Use `$ref` in JSON schema if referencing a defined type
- Add to "required" array in JSON schema if mandatory

### 3. Removing a Property:

- Update "required" array in JSON schema if it was mandatory
- Remove unused type definitions from `$defs` if no longer referenced

### 4. Modifying a Property:

- Update type using the type mapping table
- If changing from simple type to complex type, create new `$defs` entry and use `$ref`

### 5. Working with References:

- Always use `$ref` when referencing types defined in `$defs`
- Keep `$defs` section organized and avoid duplicate type definitions
- Use descriptive names for reusable types to improve maintainability

**REMEMBER:** Change the `.schema.json` file, then call `altinn_datamodel_sync`. If it reports an error, such as a C# compiler error, fix the JSON schema and call it again. Never change the `.cs` or `.xsd` file to make the error go away.

## MANDATORY VALIDATION CHECKLIST

Before finalizing any Altinn datamodel generation, **VERIFY ALL** of the following:

### JSON Schema Validation:

- [ ] All properties have appropriate `@xsdType` annotations
- [ ] Optional properties have `@xsdMinOccurs: 0`
- [ ] Arrays have `@xsdMaxOccurs: "unbounded"`
- [ ] Enums have `@xsdStructure: "XmlSchemaSimpleTypeRestriction"`
- [ ] All `$ref` references point to valid `$defs` entries
- [ ] `@xsdRootElement` and the root type name of an existing model are unchanged

### Cross-File Consistency:

- [ ] `altinn_datamodel_sync` reported success after the last change to the JSON schema
- [ ] Property names identical across all three files
- [ ] Required properties match in all files
- [ ] Data types correspond according to mapping table
- [ ] Property order in C# matches XSD sequence
- [ ] Complex types exist in all relevant files
