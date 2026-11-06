---
name: studio-expressions
description: Write dynamic expressions, the JSON arrays that set hidden, required, readOnly and texts in layouts and drive expression validation, calculated fields and gateway conditions. Covers types, comparisons, functions and common mistakes.
metadata:
  studio-title: Dynamiske uttrykk
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/expressions/
---

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## The form

An expression is a JSON array whose first item is a function name. The other items are arguments: a string, number,
boolean or `null`, or another expression. The app evaluates the innermost expressions first.

```json
"hidden": ["equals", ["dataModel", "Soknad.HarBarn"], false]
```

- Function names are case-sensitive. An unknown or wrongly cased name, such as `lowercase` for `lowerCase`, is an
  error in both the frontend and the backend.
- Every nested array is a function call. There are no list or object literals.
- A JSON object inside an expression is an error.

## Where an expression is allowed

A property takes an expression only where the schema allows one. The `$schema` of a layout file points to the
published layout schema. In it, a property accepts an expression when its definition references
`expression.schema.v1.json#/definitions/boolean`, `.../string` or `.../number`. That type is also what the result is
cast to. The ones you meet most:

- `hidden`, `required` and `readOnly` on components, and `data.hidden` on a page
- values in `textResourceBindings`
- on a repeating group: `hiddenRow`, the buttons under `edit`, and `hidden` in `tableColumns`
- on components with options: `optionFilter`, and the `source` properties for options from the data model
- outside layouts: `condition` and `message` in `App/models/<dataTypeId>.validation.json` (the `studio-validation`
  skill), `expression` in `App/models/<dataTypeId>.calculation.json`, and gateway conditions in `process.bpmn` (the
  `studio-process` skill)

## Where expressions run

- The frontend evaluates every expression in the layouts again whenever the data it reads changes.
- The backend evaluates `hidden`, `hiddenRow`, `required` and `removeWhenHidden` when it checks required fields and
  removes hidden data. It also evaluates validation files, calculation files and gateway conditions. Which of these
  are on by default differs between the versions.
- The backend never evaluates `readOnly`, texts or option properties. `readOnly` does not stop an API client from
  writing the field. Check it in C# when it matters.
- The backend lacks these frontend functions: `displayValue`, `optionLabel`, `linkToPage`, `linkToComponent`,
  `value`, `authContext` and `externalApi`. Never use them in `hidden`, `required`, validation files or calculation
  files. `gatewayAction` exists only in the backend, for gateway conditions.
- When an expression fails, the frontend logs the error in the browser console and uses the property's default. A
  failing `hidden` therefore shows the component. The backend has no fallback. The request fails, which can stop the
  user from submitting.

## Types and comparisons

Each function casts its arguments to the types it expects. The casts are strict.

- `equals` and `notEquals` compare as strings. `1` equals `"1"` and `true` equals `"true"`, but `1` does not equal
  `true`, and `0`, `""` and `null` are all different.
- Where the app expects a boolean, it accepts `true`, `false`, `1`, `0`, `"1"`, `"0"`, `"true"`, `"false"` and `null`,
  which counts as `false`. Any other value is an error. So `"hidden": ["dataModel", "X"]` hides on `1`, but
  `["equals", ["dataModel", "X"], true]` does not.
- A string casts to a number only when it is a plain number with `.` as the decimal sign. `"1,5"` and `"1 000"` are
  errors. Leave out a leading `+`, which only the backend accepts.
- `null` means missing. `greaterThan`, `lessThan` and the other number comparisons return `false` when either side is
  `null`. `plus`, `minus`, `multiply` and `divide` treat `null` as `0`. `concat` treats it as `""`.
- Dates are ISO 8601 strings, such as `2024-05-17` or `2024-05-17T12:00:00`, with an optional `Z` or offset. Compare
  them with `compare` and the operators `isBefore`, `isAfter` or `isSameDay`, not with `lessThan`. Comparing a time
  with a zone to one without is an error.
- `if` takes two or four arguments: `["if", condition, value]` or `["if", condition, value, "else", other]`. Without
  `"else"` it returns `null` when the condition is false.
- `round` returns a string for display. The backend adds `,` as a thousands separator, as in `"1,234.50"`, and the
  frontend does not. Never store its result in a number field from `calculation.json`, or compare it as a number in an
  expression the backend evaluates.

## Functions agents use most

| Function | Use |
| --- | --- |
| `["dataModel", "Path.To.Field"]` | A value from the data model. A second argument names another data type. |
| `["component", "componentId"]` | The value bound to a component's `simpleBinding`, or `null` when it is hidden |
| `equals`, `notEquals` | Compare as strings |
| `greaterThan`, `greaterThanEq`, `lessThan`, `lessThanEq` | Compare numbers |
| `compare` | Compare dates, as in `["compare", a, "isBefore", b]`, or any other operator |
| `and`, `or`, `not`, `if` | Combine conditions and pick a value |
| `commaContains` | Test one value in a comma-separated value, such as from `Checkboxes` with a `simpleBinding` |
| `contains`, `startsWith`, `stringLength`, `concat` | Work with text |
| `text` | A text resource by key |
| `countDataElements` | The number of data elements of a data type, such as attachments |
| `frontendSettings` | A setting under `FrontEndSettings` in `App/appsettings*.json`. Name it with a lower-case first letter. |
| `instanceContext` | Facts about the instance, such as `instanceOwnerPartyType` |

The [function reference](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/expressions/reference/functions/)
lists every function. Check the version file before you use one the table does not list.

## Data model paths and components

- A `dataModel` path is the dot path from the root of the model, in the same form as `dataModelBindings`, and in the
  same case. Read it from `App/models/<dataTypeId>.schema.json`.
- `component` needs a component id that exists and has a `simpleBinding`. Otherwise the expression fails.
- `component` returns `null` when the component, its group or its page is hidden. `dataModel` returns the stored value
  whatever is shown. Use `component` when a hidden answer should count as unanswered.

## Repeating groups

- Leave indexes out inside a row. On a component in a row, `["dataModel", "Ansatte.Alder"]` reads that row, and
  `component` finds the component in the same row. Validation and calculation files run once per row, the same way.
- An explicit index, as in `Ansatte[0].Navn`, always reads that row, for every row.
- From outside the group, `component` on a component in the group fails, because no row is chosen.
- To hide a row, use `hiddenRow` on the group, not `hidden` on each child.

## Common mistakes

- A path written as a string. `["equals", "Person.Navn", "Ola"]` compares two fixed strings. Write
  `["dataModel", "Person.Navn"]`.
- The logic turned around. `hidden` is `true` to hide, and a validation `condition` is `true` when the value is wrong.
- A component that is required only when shown. Hidden components are never required, so set both `required` and
  `hidden` rather than repeating the condition in `required`.
- `equals` against a boolean when the data holds `1`, `"yes"` or a code value. Compare with the value the data holds.
- A frontend-only function where the backend evaluates the expression.
- Copying a long condition to many components. Hide the group or the page that holds them instead.

## Computed values

Expressions in layouts never change the data. To store a computed value in the data model:

- Use `App/models/<dataTypeId>.calculation.json` when one expression gives the value, and the app's version supports
  it. The key is the path of the target field. Inside a repeating group, leave the index out and the app computes
  each row.

  ```json
  {
    "calculations": {
      "Regnskap.Sum": {
        "expression": ["minus", ["dataModel", "Regnskap.Inntekter"], ["dataModel", "Regnskap.Utgifter"]]
      }
    }
  }
  ```

- Use C# for anything else, such as lookups in other systems or values from several data types. The
  `studio-app-lib` skill covers `IDataWriteProcessor`.
- Never add rules to `RuleConfiguration.json` or `RuleHandler.js`. The version files say why.

## Before you finish

- Every function exists in the reference, in the same case, and every `if` has two or four arguments.
- Every `dataModel` path exists in the data model, and every `component` id exists and has a `simpleBinding`.
- Expressions that the backend evaluates use only functions the backend has.
- The layout file still validates against its `$schema`.
- Run the app and open every page you changed with the browser console open. Errors there name the failing
  expression. The app's developer tools (Ctrl+Shift+K, the tab "Uttrykk") evaluate an expression for a component you
  pick.
- Change the values each expression reads and check that the result follows. In a repeating group, test with two
  rows.

## Docs

- [Dynamikk (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/expressions/): the uses, the
  functions and the data types in a v8 app.
- [Uttrykk (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/expressions/): the uses in a v9 app.
- [Funksjoner (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/expressions/reference/functions/):
  every function, with arguments and examples.
- [Datatyper (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/expressions/reference/datatypes/):
  the casting rules in full.
- [Kalkulering av datafelt (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/dataprocessing/calculation/)
  and [Regne ut verdier med uttrykk (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/dataprocessing/calculation/):
  when the app computes the values in `calculation.json`.
