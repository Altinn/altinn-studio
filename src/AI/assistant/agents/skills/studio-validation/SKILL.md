---
name: studio-validation
description: Choose and set up validation of form data. Covers data model constraints, required fields, expression validation in validation.json, C# validators, when messages show, where their texts come from, and what the backend checks on process/next.
metadata:
  studio-title: Validering
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/validation/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/validation/
---

The frontend shows messages while the user fills in the form. The backend runs the checks again on `process/next`, so
a rule protects the data only when it runs there too.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## Choose a mechanism

Use the first one that can express the rule. The first three show the message in the browser as the user works, and
need no code.

| Rule | Mechanism |
| --- | --- |
| A field must have a value | `required` on the component |
| Format, length, range or allowed values of one field | A constraint in the data model |
| A rule over values in the form, across fields or rows | Expression validation in `App/models/<dataTypeId>.validation.json` |
| File type, size and number of attachments | Settings on the data type, the `studio-app-configuration` skill |
| Anything else, such as lookups in other systems, rules across data types or file content | A C# validator |

Let `required` alone decide whether a field is empty, and write every other rule to accept an empty value. The app
holds back required errors until the user tries to move on, but shows the other kinds at once. A rule that fires on
an empty field shows an error before the user has started.

## Required fields

- Set `"required": true` on the component, or an expression (the `studio-expressions` skill).
- Hidden components are never required, in the browser or on the backend. To require a field only when it shows, set
  both `required` and `hidden`.
- The built-in message is "Du må fylle ut {0}", where `{0}` is the component's `shortName` text or, without one, its
  `title`. Set `textResourceBindings.requiredValidation` to a text key to replace it. The app fills `{0}` only into its
  built-in texts, so write the field name into your own text.
- Whether the backend checks required fields depends on the `RequiredValidation` setting. See the version file.

## Data model constraints

- The frontend checks the data against the JSON schema, such as `maxLength`, `pattern`, `minimum` and `enum`. The
  backend checks the attributes on the C# class, such as `[MaxLength]`, `[RegularExpression]` and `[Range]`.
- Change only the JSON schema, then generate the C# class from it, as the `studio-data-model` skill describes. Until
  the class is generated, the backend checks the old rules, and a value the browser accepts can fail when the user
  submits, with the attribute's own message.
- The frontend shows a built-in message for each keyword. To give a field its own message, add `errorMessage` with a
  text key to the schema object that holds the failing keyword. When the keyword sits in a definition under `$defs`,
  the message goes there and applies to every field that uses the definition. The backend does not read
  `errorMessage`.
- `XsdValidation` under `AppSettings` makes the backend also check the data against the XSD. It is off by default.

## Expression validation

Write the rules in `App/models/<dataTypeId>.validation.json`, where `<dataTypeId>` is the `id` of the data type in
`applicationmetadata.json`. Start the file with the `$schema` line the version file gives.

```json
{
  "validations": {
    "Kontakt.Epost": [
      {
        "message": "kontakt.epost.feil-domene",
        "severity": "error",
        "condition": ["and",
          ["greaterThan", ["stringLength", ["dataModel", ["argv", 0]]], 0],
          ["not", ["endsWith", ["dataModel", ["argv", 0]], "@altinn.no"]]
        ]
      }
    ]
  },
  "definitions": {}
}
```

- Each key is a data model path in the form `dataModelBindings` uses. In a repeating group, leave the index out and
  the rule runs for every row.
- `condition` is `true` when the value is wrong, and then the message shows. Turning this around is the most common
  mistake.
- `["argv", 0]` is the path of the field the rule runs for, row index included. Use it, not `["value"]`, which the
  backend does not have.
- `severity` is `error` (the default), `warning`, `info` or `success`. Only `error` stops the user.
- `message` is a text key, or literal text when no key matches. It takes no `{0}` parameters.
- A rule in `definitions` can be reused by its name as a string, or with `ref` and the properties you override.

The frontend and the backend run these rules differently. Write rules that give the same result in both:

- Key each rule on a field that a visible component binds. The frontend shows a rule's message only at such a
  component. The backend runs every key, and the user sees an error on any other key only in the error summary after
  a failed submit.
- Make the condition `false` when the keyed field is empty, as the `stringLength` guard above does. The backend skips
  a rule when the keyed field is `null`, but runs it on `""`. The frontend runs it in both cases. Without the guard,
  the browser and the backend disagree about an empty field.
- Put a comparison or `and`, `or` or `not` at the top of the condition. The backend fails on a condition that returns
  anything but `true` or `false`, such as a bare `["dataModel", ...]` or an `if` without `"else"`.
- Both skip fields that belong to hidden components.

The `studio-expressions` skill covers the functions and how values compare.

## C# validators

Write a C# validator for rules that need code. The `studio-app-lib` skill covers the interfaces and how to register
them. What matters for the user:

- An `IValidator` or `IFormDataValidator` runs on every save by default, so its messages show while the user fills
  in the form. An `ITaskValidator`, an `IDataElementValidator` and any validator that sets `NoIncrementalValidation`
  run only on `process/next`. Their messages show first when the user tries to submit.
- Set the issue's `Field` to the path exactly as the component's `dataModelBindings` has it, with row indexes, and
  `DataElementId` to the data element. Then the message shows at the component. An error without them shows only in
  the error summary after a failed submit, and a warning without them does not show at all.
- Set `CustomTextKey` to a text key. To put values into the text, set `CustomTextParameters` to a dictionary, and give
  the text resource a variable with `"dataSource": "customTextParameters"` and the dictionary key as `key`. The
  `studio-text-resources` skill covers variables.

## When the user sees messages

- `showValidations` on a component sets which kinds show at once. The default, `["AllExceptRequired"]`, shows schema,
  expression and C# messages as soon as the data changes, even when the page opens.
- When the user submits, the frontend shows every error at its field and in an error summary, and stops if there is
  one. Otherwise it calls `process/next`, and shows the errors the backend returns.
- The frontend checks pages when the user moves between them only when one of these is set. Each takes an object such
  as `{ "page": "current", "show": ["All"] }`, where `page` is `current`, `currentAndPrevious` or `all`, and `show`
  lists validation types:
  - `validationOnNavigation` in `data` of a page's layout file, or for every page under `pages` in the `Settings.json`
    next to the `layouts` folder. The page's own setting wins. It overrides the component settings below, and it
    checks only when the user moves forward.
  - `validateOnNext` and `validateOnPrevious` on `NavigationButtons`
  - `validateOnForward` and `validateOnBackward` on `NavigationBar`
  - `validation` on each item in `actions` on `CustomButton`
- `validateOnSaveRow` on a `RepeatingGroup` makes the frontend check a row when the user saves it. It takes a list of
  validation types, such as `["All"]`, not a boolean.
- Messages on hidden components never show and never stop the user.

## What the backend checks on process/next

On `process/next` the backend runs every validator for the task, not only those that run on save:

- data annotations on the C# class, always
- required fields, expression validation and XSD, when their settings are on
- the data type settings: content type, size, `minCount` and `maxCount`
- signatures, in signing tasks
- the app's own C# validators

Any issue with severity `error` stops the process with `409 Conflict`, and the response lists the issues. Warnings do
not stop it. The backend skips all validation in two cases only: the action is `reject` and the task allows it, or
the task is a service task. A caller cannot turn off single validators. A rule that runs only in the browser does not
protect data that an API client sends.

## Before you finish

- Every text key that a rule or validator uses exists in every `App/config/texts/resource.<lang>.json`.
- The file name of each validation file matches a data type id, and every key and `dataModel` path in it exists in
  the data model.
- The settings in `App/appsettings.json` turn on the backend checks the rules need. See the version file.
- The app builds.
- Run the app locally. Enter a wrong value and check the message at the field, then a right value and check that the
  message goes away. Try to submit with an empty required field. Test repeating group rows and hidden fields.
- Call `GET {org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate` on the running app. It returns every
  issue `process/next` would find for the current task.

## Docs

- [Validering (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/validation/) and
  [Validering (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/validation/): which
  mechanism to choose, the validation types for `showValidations`, and the built-in checks on the backend.
- [Validering med uttrykk (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/validation/expression-validation/):
  the file format, with `definitions` and `ref`. The example writes `lowercase`, which must be `lowerCase`.
- [Påkrevde felt (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/validation/required/):
  how the app builds the required message from `shortName` and `title`.
- [Begrensninger i datamodellen (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/validation/data-model/):
  the built-in messages for each schema keyword, and `errorMessage`.
- [Validering i C# (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/validation/csharp/) and
  [Validering i C# (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/validation/csharp/):
  the interfaces, severity, and messages in several languages.
