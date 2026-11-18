# Shared expression tests

The JSON tests for expressions that both the App frontend and the App backend run, so that their implementations
agree. `evaluation` tests expression functions, contexts, invalid input and layout preprocessing. `validation` tests
expression validation.

A test with `disabledFrontend: true` or `disabledBackend: true` marks a known difference between the two. Remove the
marker when they agree. `evaluation/functions/gatewayAction/frontend-unavailable.json` is not a difference. It checks
that the frontend stub throws, and the backend, which supports the function, skips it.

The backend's [runner](../../App/backend/test/Altinn.App.Core.Tests/LayoutExpressions/CommonTests/TestFunctions.cs)
also skips whole function folders: functions the backend has not implemented yet, and functions that stay
frontend-only because they depend on frontend state or navigation, or are experimental. A test there fails
when a function folder has neither a backend test nor a place in those lists.

## Calculation tests

`calculation` tests the calculation step: how the result of a calculation is written into the data model. The
functions are tested in `evaluation`, so these tests use the simplest expressions that give each shape of result:
literals, `object`, `list`, `if`, `dataModel`, `argv` and `jmespath`. The folders are named after the shape of the
result and the target: `scalars`, `null`, `objects`, `lists`, `targets` (repeating groups, indices, missing parents),
`order` (several calculations in sequence), `dataTypes` and `errors`.

The frontend [runner](../../App/frontend/src/features/formData/shared-calculations.test.tsx) boots a form with the
data and the calculations. The backend
[runner](../../App/backend/test/Altinn.App.SourceGenerator.Integration.Tests/SharedCalculations/SharedCalculationTests.cs)
runs `DataModelFieldCalculator` through the generated `IFormDataWrapper` that apps use, and again through
`ReflectionFormDataWrapper`. Both runners load every JSON file in every folder, so a new folder cannot be left out.

### The data model

Every test uses the same data model. The frontend reads it from
[`calculation/model.schema.json`](calculation/model.schema.json), and the backend from
[`CalculationTestModel`](../../App/backend/test/Altinn.App.SourceGenerator.Integration.Tests/Models/CalculationTestModel.cs),
with its generated wrapper committed under `gen`. A backend test checks that the two have the same properties and
types. When a test needs a new shape, add it to both and build the backend test project to update the generated
wrapper.

The model is written the way Studio generates one: optional numbers and booleans are nullable in C# and have the plain
schema type, `nullableDecimal` and `nullableBoolean` also allow `null` in the schema, and the non-nullable value types
are in `valueTypes`, which is required in the schema. Rows in `rows`, `copies` and `rows[].children` have an
`altinnRowId`.

### Format

```json
{
  "name": "Rows past the end are appended with new ids",
  "dataModel": { "rows": [{ "altinnRowId": "a0000000-0000-4000-8000-000000000001", "total": 0 }] },
  "calculations": [
    { "field": "rows", "expression": ["list", ["object", "total", 1], ["object", "total", 2]] }
  ],
  "expects": {
    "rows": [
      { "altinnRowId": "a0000000-0000-4000-8000-000000000001", "total": 1 },
      { "altinnRowId": "<new>", "total": 2 }
    ]
  }
}
```

- `dataModel` is the data of the data type `default`. With more than one data type, use `dataModels`, a list of
  `{ "dataElement": { "id", "dataType" }, "data" }`, and key `calculations` and `expects` by data type. The frontend
  calculates the data types that have calculations.
- `calculations` is the list in `models/{dataType}.calculation.json`. Both sides read it the way they read the file,
  so an invalid calculation is a test too.
- `expects` is the whole data model after the calculations, so a write anywhere else shows up.
- `expectsFailure` is a part of the error message instead. The backend matches it against the exception the
  calculation throws, the frontend against the error it logs or throws.
- `expectsFailureBackend` is a part of the message the backend fails with. It replaces `expectsFailure` on the
  backend, or stands next to `expects` and `expectsWarnings` when only the backend fails: the backend fails with this
  message, and the frontend gets that result.
- `expectsWarnings` lists parts of the warnings the calculations log, such as when a value cannot be converted. Each
  must match a warning, and each warning must match one of them. Without it, no warning may be logged.
- `expectsErrors` lists parts of the errors the calculations log, with the same rules as `expectsWarnings`. A
  calculation whose expression fails to evaluate logs an error, keeps the previous value, and the other calculations
  still run, so it stands next to `expects`.
- `testCases` is a list of cases with their own `name` and expectation. A case uses the data and the calculations of
  the file unless it has its own. The file itself is a case when it has an expectation.
- Rows in the data must have an `altinnRowId`, as data from the backend always has. Use UUIDs, since the backend reads
  them into a `Guid`.

### Comparing the result

The frontend compares the data it would save, `currentData` as JSON, exactly: a property that is missing is not the
same as one that is `null`.

A C# model cannot leave out a property, so the backend serializes the model as the app does, and a property that
`expects` leaves out must be `null` there. A property that `expects` sets to `null` must be `null` on both sides, which
the frontend only passes when the property is there with `null`. Write the data so that the non-nullable value types
in `valueTypes` are set before the calculations run, since the backend always serializes them, as `0` and `false` when
nothing set them. Numbers are compared by value.

The backend gives new rows their ids when the changes are collected, after data processing, so its runner does the same
before it compares. An `altinnRowId` of `"<new>"` matches an id that is not in the data before the calculations and
that no other row has. Any other id must match exactly.

### Disabled tests

A test or a test case with `disabledFrontend: true` or `disabledBackend: true` is a known difference between the two,
and `comment` says what each side does. Remove the marker when they agree. Set `RUN_DISABLED=1` when you run either
runner to run the disabled tests too.

What decides which data types are calculated stays in the tests of each side: the backend calculates the form data of
the current task, and the frontend calculates the data models in its bootstrap, except in a read-only form.
