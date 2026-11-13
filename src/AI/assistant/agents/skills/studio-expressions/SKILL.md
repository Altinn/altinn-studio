---
name: studio-expressions
description: Write dynamic expressions, the JSON arrays that set hidden, required, readOnly and texts in layouts and drive expression validation and gateway conditions. Covers types, comparisons, functions and common mistakes.
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
  skill), and gateway conditions in `process.bpmn` (the `studio-process` skill)

## Where expressions run

- The frontend evaluates every expression in the layouts again whenever the data it reads changes.
- The backend evaluates `hidden`, `hiddenRow`, `required` and `removeWhenHidden` when it checks required fields and
  removes hidden data. It also evaluates validation files and gateway conditions. Which of these
  are on by default differs between the versions.
- The backend never evaluates `readOnly`, texts or option properties. `readOnly` does not stop an API client from
  writing the field. Check it in C# when it matters.
- The backend lacks these frontend functions: `displayValue`, `formatNumber`, `optionLabel`, `linkToPage`,
  `linkToComponent`, `value`, `authContext` and `externalApi`. Never use them in `hidden`, `required`, validation
  files or gateway conditions. `gatewayAction` exists only in the backend, for gateway conditions.
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
- Numbers in strings, `null` and dates follow the rules on the data types page that the version file links. Also:
  - Leave out a leading `+` on a number in a string. Only the backend accepts it.
  - Comparing a time with a zone to one without is an error. Compare dates with `compare`, not with `lessThan`.
- `if` takes two or four arguments: `["if", condition, value]` or `["if", condition, value, "else", other]`. Without
  `"else"` it returns `null` when the condition is false.
- `round` returns a string for display. The backend adds `,` as a thousands separator, as in `"1,234.50"`, and the
  frontend does not. Never compare its result as a number in an expression the backend evaluates.

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

Before you use a function the table does not list, check that the app's version has it. The version file says
which functions differ, and links the function reference for that version.

## Data model paths and components

- A `dataModel` path is the dot path from the root of the model, in the same form as `dataModelBindings`, and in the
  same case. Read it from `App/models/<dataTypeId>.schema.json`.
- `component` needs a component id that exists and has a `simpleBinding`. Otherwise the expression fails.
- `component` returns `null` when the component, its group or its page is hidden. `dataModel` returns the stored value
  whatever is shown. Use `component` when a hidden answer should count as unanswered.

## Repeating groups

- Leave indexes out inside a row. On a component in a row, `["dataModel", "Ansatte.Alder"]` reads that row, and
  `component` finds the component in the same row. Validation files run once per row, the same way.
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

Expressions in layouts never change the data. To store a computed value in the data model, write C#. The
`studio-app-lib` skill covers `IDataWriteProcessor`.

- Never create `App/models/<dataTypeId>.calculation.json`. The docs describe calculations with expressions, but they
  are not released yet.
- Never add rules to `RuleConfiguration.json` or `RuleHandler.js`. The version files say why.

## Before you finish

- Every function exists in the app's version, in the same case, and every `if` has two or four arguments.
- Every `dataModel` path exists in the data model, and every `component` id exists and has a `simpleBinding`.
- Expressions that the backend evaluates use only functions the backend has.
- The layout file still validates against its `$schema`.
- Each expression gives the result you want when a value it reads is `null`, such as an empty field or a hidden
  component.
- Inside a repeating group, an expression that should read its own row has no index.
