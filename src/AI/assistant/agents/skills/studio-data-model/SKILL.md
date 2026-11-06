---
name: studio-data-model
description: "Data models under App/models: the JSON schema that the C# class and XSD are generated from, the data type and classRef in applicationmetadata.json, binding paths, naming rules and the constraints Studio supports."
metadata:
  studio-title: Datamodeller
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/data/data-modeling/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/data/data-modeling/
---

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## How the files fit together

An app can have any number of data models, with any valid name. Many apps have more than one, and only about one app
in four has a model called `model`. Read the data types in `applicationmetadata.json` to find an app's models.

For a data type with the id `soknad`:

- `App/models/soknad.schema.json` is the source. The frontend validates input against it.
- `App/models/soknad.cs` is the C# class, generated from the schema. The backend reads and validates form data with
  it, and app code uses it.
- `App/models/soknad.xsd` is the XML schema, generated from the schema. It describes the data in XML, for example
  for systems that receive it.
- `App/models/soknad.prefill.json`, `soknad.validation.json` and `soknad.calculation.json` are optional
  configuration for the same data type. The `studio-prefill` and `studio-validation` skills cover the first two.

The app finds the schema, the XSD and the configuration files by the data type id, and the C# class by `classRef`. Name
all of them after the data type id, as Studio does. The data type looks like this:

```json
{
  "id": "soknad",
  "allowedContentTypes": ["application/xml"],
  "appLogic": { "autoCreate": true, "classRef": "Altinn.App.Models.Soknad.Soknad" },
  "taskId": "Task_1",
  "maxCount": 1,
  "minCount": 1
}
```

- `appLogic.classRef` is the full name of the C# class. Studio writes `Altinn.App.Models.<Class>.<Class>`, where
  `<Class>` is the name of the root's type without hyphens. When the root refers to a definition with `$ref`, as most
  uploaded XSDs do, that is the definition's name. Otherwise it is the `@xsdRootElement`. Older models use
  `Altinn.App.Models.<Class>`, and Studio keeps that form for a model that has it.
- `taskId` is the task the model belongs to. Users can change the data during that task. When the task ends, the app
  locks the data element, and later tasks can only read it.
- With `appLogic.autoCreate: true`, the app creates the data element when the task starts. Without it, something
  else creates the element, such as a user who adds a subform entry. A stateless form's model has no `taskId`.
- Several data types can share a task. The version file says which one is the default for the task's pages.
- The `studio-app-settings` skill covers the other data type settings.

## Change the schema, then generate

- Change only `<id>.schema.json`. Never change the `.cs` or `.xsd` by hand. Generation replaces both files, and hand
  edits are lost.
- Studio's data model editor generates them. It saves the schema as you edit, but writes the C# class and the XSD
  only when you click **Generer modell**. While they are behind the schema, it shows "Du har endringer som ikke er
  generert". The generator is the DataModeling library in Designer, `src/Designer/backend/src/DataModeling` in the
  altinn-studio repository.
- Until the files are generated, the backend still uses the old class. When you change a schema outside Studio and
  cannot generate the files yourself, tell the user to open the model in Studio and click **Generer modell**.
- Generation also sets `classRef`, and adds the data type when it is missing. Studio adds a new data type without a
  `taskId`. Connect it to a task in Studio's process editor, or set `taskId` and the task's default data model
  yourself as the version file says.

## Binding paths

Layouts, texts, expressions and prefill all point at a field with the same path:

- The path starts below the root element and joins property names with dots: `person.fornavn`. Use the property
  names from the JSON schema, not the C# names.
- A component binds to its task's default data model with the path alone, and to another model with
  `{ "dataType": "<data type id>", "field": "<path>" }`.
- A repeating group binds to the list, such as `personer`. Components in the group bind to the full path without an
  index, such as `personer.fornavn`.
- When you rename or move a field, search `App/` for the old path. Layouts, text variables, expressions,
  `prefill.json`, validation configuration and C# code can all use it.

## Names

Studio's editor checks these rules, and the generator depends on them:

- A model's name, which is its data type id and file name, starts with an ASCII letter in either case, followed by
  ASCII letters, digits and `_`. It has at most 100 characters, is not a C# keyword, and differs from every other
  model and data type in the app, ignoring case.
- `@xsdRootElement` names the root element in XML. The C# class is named after the root's type, as `classRef`
  above describes. Two models in one app may share a root element, but not a class name. Both C# files would
  declare the same class, so the app would not build, and Studio refuses such a model.
- A property name starts with a letter, where `æ`, `ø` and `å` count, followed by letters, digits, `_` and `-`. It is
  not a C# keyword and is unique among its siblings. The generator drops `-` from the C# name and keeps the full name
  in JSON and XML.

## Constraints Studio supports

Studio's editor writes these keywords:

- `required` on an object's properties
- `enum`
- on strings: `minLength`, `maxLength`, `pattern` and `format`, such as `date`
- on numbers and integers: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf`
- on arrays: `minItems` and `maxItems`

- The frontend validates them from the JSON schema, except `required`, which it ignores. To make the user fill in a
  field, set `required` on the component, as the `studio-validation` skill describes.
- The generator turns the lengths, `pattern` and the ranges into attributes on the C# class, so the backend
  validates them too.
- The generator handles a fixed set of keywords. On the root and on objects it stops with an error at others, such
  as `if` and `additionalProperties`. On a single field it ignores them, so the backend does not check them.
- Put reusable types in `$defs` and refer to them with `$ref` inside the same file.
- Keep the `@xsd` keywords a schema already has. Studio needs them to produce the same XSD again.

## Restricted data and Altinn 2 models

- Data that only the service owner may read or write goes in a data type of its own, with its own access rules. See
  [Beskyttede data (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/restricted-data/) or
  [Beskyttede data (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/restricted-data/).
- For an XSD from SERES or Altinn 2, upload it in Studio's data model editor rather than writing the schema. See
  [Overgang fra Seres](https://docs.altinn.studio/nb/altinn-studio/v8/guides/altinn-2/seres-migration/).

## Before you finish

- The schema, the C# file and the XSD are named after the data type id, and `classRef` names the class that the C#
  file declares.
- The C# class and the XSD are generated from the current schema, or you have told the user to generate them.
- No two data types have the same C# class.
- Every binding, text variable, expression and prefill target that used a changed path uses the new one.
- Every `taskId` names a task in `App/config/process/process.bpmn`.
- Build the app.

## Docs

- [Datamodellering (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/data/data-modeling/): the model
  files and Studio's data model editor in a v8 app.
- [Datamodellering (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/data/data-modeling/):
  the same for a v9 app.
- [Datamodell](https://docs.altinn.studio/nb/altinn-studio/v8/concepts/data-model/): what a data model is, and how
  it relates to the form.
- [Datamodellbindinger (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/):
  the short and the object form of a binding, and bindings in repeating groups.
