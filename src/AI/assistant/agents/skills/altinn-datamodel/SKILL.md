---
description: How Altinn data models work: JSON Schema conventions, C# class generation, binding names, and the datamodel sync workflow. Load before creating or changing anything under App/models/.
title: Datamodeller
docs_url: https://docs.altinn.studio/nb/altinn-studio/v8/concepts/data-model/
---

# ALTINN DATAMODEL STRUCTURE AND RULES

## CRITICAL REQUIREMENT

A data model is three files with the same name: `model.schema.json`, `model.cs` and `model.xsd`. The JSON schema is the source. **Change only the `.schema.json` file**, then call `altinn_datamodel_sync` with its path. Altinn Studio Designer then generates the `.cs` and `.xsd` files and adds or updates the model's data type in `App/config/applicationmetadata.json`, exactly as "Generate model" in Studio does. **Never write or edit the `.cs` or `.xsd` file yourself**, and do not change the generated namespace or class name.

**Keep the `@xsdRootElement` of an existing model.** It is the name of the C# class and of the XML root element. A new value renames the class, which breaks the app's C# code, and changes the XML of the data the app stores.

A new app made in Studio has one data model called `model`, with the root element `model`.

## FILE STRUCTURES

### 1. C# MODEL FILE (model.cs)

Designer generates this file. Read it to learn the class and property names; never write it.

**Structure:**

- Namespace: `Altinn.App.Models.[ModelName]`, or `Altinn.App.Models` when the model's data type already has the class reference `Altinn.App.Models.[ModelName]`
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
- `@xsdRootElement` matching the model name
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

Designer generates this file too; never write it.

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

The root data model is always called `model` and represents the single survey/form response. Use `oneOf` at the root level to reference the main data structure:

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

- `@xsdRootElement` in the JSON schema becomes the class name in C# and the root element in XSD
- Keep the name of an existing model; for a new model, use the same name as its file (e.g., "model")

### 2. Property Names:

- Use camelCase (e.g., "firstName")
- The property key in the JSON schema becomes the property name in C# and the element name in XSD

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

Make each of these changes in the JSON schema only, then call `altinn_datamodel_sync`.

### 1. Adding a Data Type:

- Add new definition in `$defs` section of JSON schema

### 2. Adding a Property:

- Use `$ref` in JSON schema if referencing a defined type
- Add to "required" array in JSON schema if mandatory, or set `"@xsdMinOccurs": 0` if optional

### 3. Removing a Property:

- Update "required" array in JSON schema if it was mandatory
- Remove unused type definitions from `$defs` if no longer referenced

### 4. Modifying a Property:

- Change its type using the type mapping table
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
- [ ] `@xsdRootElement` of an existing model is unchanged

### Generated Files:

- [ ] `altinn_datamodel_sync` reported success after the last change to the JSON schema
- [ ] The `.cs` and `.xsd` files were changed only by `altinn_datamodel_sync`
