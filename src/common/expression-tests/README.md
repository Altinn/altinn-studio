# Shared expression tests

This directory is the single source for JSON tests used by the Altinn app frontend and backend.

- `evaluation` contains expression function, context, invalid input, and layout preprocessor tests.
- `validation` contains expression validation tests.

Tests run in both consumers unless the JSON file has `disabledFrontend: true` or `disabledBackend: true`.
The exceptions below record the observed incompatible result. Remove the marker when the two implementations agree.

## Tests disabled in the frontend

| Test                                                                                                     | Expected                                                                                                 | Observed in the frontend                                                                                                                              |
|----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `evaluation/invalid/group-missing-child.json`                                                            | Layout construction throws an error matching `*missing-child*`.                                          | `ExprValidation.throwIfInvalid` returns normally and throws no error because it validates the expression syntax, not the referenced layout hierarchy. |
| `evaluation/invalid/two-components-same-id.json`                                                         | Layout construction throws an error matching `*duplicate-id*`.                                           | `ExprValidation.throwIfInvalid` returns normally and throws no error.                                                                                 |
| `evaluation/invalid/two-groups-same-child.json`                                                          | Layout construction throws an error matching `*double-referenced-child*`.                                | `ExprValidation.throwIfInvalid` returns normally and throws no error.                                                                                 |
| `evaluation/context-lists/groups/rows-before-after.json`                                                 | The `after` component follows both generated rows for `group1`.                                          | The frontend puts `after` directly after `before`, ahead of the generated `comp3` and `comp4` row contexts.                                           |
| `evaluation/context-lists/nonRepeatingGroups/cards-in-group.json`                                        | Two `cards1` contexts, with row indices `0` and `1`; each contains indexed `comp3` and `comp4` children. | One unindexed `cards1` context containing one unindexed `comp3` and `comp4` pair.                                                                     |
| `evaluation/functions/component/non-repeating-group-in-repeating-group.json`                             | Component lookup returns `"Accordion child input 2,3"`.                                                  | Layout setup throws `Missing row ID in data model for group1[0]`.                                                                                     |
| `evaluation/functions/text/should-return-text-resource-with-variable-in-rep-group.json`                  | Text lookup returns `"Hello world Vidar"`.                                                               | The runner throws `Component 'myndig' has 0 repeating parent components, but rowIndices contains 2 indices.` and produces no expression result.       |
| `evaluation/functions/text/should-return-text-resource-with-variable-in-rep-group-no-index-markers.json` | Text lookup returns `"Hello world Arne"`.                                                                | The runner throws `Component 'myndig' has 0 repeating parent components, but rowIndices contains 2 indices.` and produces no expression result.       |
| `validation/ignore-value-null.json`                                                                      | No validation issues for null values.                                                                    | Two issues are produced: `Always invalid rule` for `personer[0].navn` and `personer[2].navn`. The hidden second row is omitted.                       |

## Tests disabled in the backend

| Test                                                                      | Expected                                                                      | Observed in the backend                                                                                            |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `evaluation/functions/component/hidden-by-child-visibility-callback.json` | Component lookup returns `null` because `showInExpandedEdit` hides the child. | Component lookup returns `"Hell og lykke AS"`; the backend does not apply this frontend child-visibility callback. |
| `evaluation/functions/instanceContext/instanceOwnerNameOrg.json`          | Instance owner name is `"My Org AS"`.                                         | Throws `Unknown Instance context property instanceOwnerName`.                                                      |
| `evaluation/functions/instanceContext/instanceOwnerNamePerson.json`       | Instance owner name is `"Firstname Lastname"`.                                | Throws `Unknown Instance context property instanceOwnerName`.                                                      |
| `validation/value-function.json`                                          | One `hello world` issue for `form.name`.                                      | Throws `Function "value" not implemented in backend ["value"]`.                                                    |

## Function folders not yet implemented in the backend

The backend runner excludes these complete folders. Its coverage check fails if this list and the folders get out of sync.
For every file in these folders, the expected value is the file's `expects` value; the backend instead throws
`Function "<function>" not implemented in backend` when parsing or evaluating the expression.

| Folder                                           | Missing backend function    |
|--------------------------------------------------|-----------------------------|
| `evaluation/functions/authContext`               | `authContext`               |
| `evaluation/functions/externalApi`               | `externalApi`               |
| `evaluation/functions/value`                     | `value`                     |

## Frontend-only function folders

The backend runner also excludes functions intended to remain frontend-only. They depend on frontend state, produce
frontend navigation links, or are explicitly experimental frontend functionality. The expected and observed results
are the same as for the folders above.

| Folder                                           | Frontend-only function      |
|--------------------------------------------------|-----------------------------|
| `evaluation/functions/_experimentalSelectAndMap` | `_experimentalSelectAndMap` |
| `evaluation/functions/displayValue`              | `displayValue`              |
| `evaluation/functions/linkToComponent`           | `linkToComponent`           |
| `evaluation/functions/linkToPage`                | `linkToPage`                |
| `evaluation/functions/optionLabel`               | `optionLabel`               |
