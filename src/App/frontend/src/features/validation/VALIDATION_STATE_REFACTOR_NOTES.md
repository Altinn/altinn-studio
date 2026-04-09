# Validation State Refactor Notes

## Current state after the second pass

- Validation ownership has moved into `state.data.models[dataType]`.
- Each `DataModelState` stores validation buckets in `validations`:
  - `backend`
  - `schema`
  - `invalidData`
  - `expression`
- Validation producers for frontend validations now update by `dataType`, not `dataElementId`.
- Backend validation ingestion is still keyed by `dataElementId`, because that is the shape returned by the backend API.

## What was removed

- The separate stored merged validation map in `state.validation.state.dataModels`.
- The old pattern where validation state lived outside the form data models even though the models had already been consolidated into one store.

## Remaining complexity

- We still keep four validation buckets per model and merge them on read in some selectors.
- The merge ordering is currently implicit in selectors such as `useNodeValidation`.
- Some read paths still start from `dataElementId` and need a lookup back into `state.data.models`.
- `SchemaValidation`, `InvalidDataValidation`, and `ExpressionValidation` are still effect-components that compute derived state and write it back into the store.

## Recommended next steps

### 1. Centralize read-time merging

Status: done in the current refactor pass.

Introduce one shared selector/helper for field validations per model, for example:

- `selectFieldValidations(model, field)`
- `selectAllFieldValidations(model)`

This keeps merge ordering in one place and removes repeated knowledge from consumers.

### 2. Store only backend validations

Longer term, consider storing only backend validations in the store and deriving the rest on read:

- schema validations from debounced form data + schema
- invalid-data validations from invalid debounced form data
- expression validations from expression config + data sources

This would remove most of the effect-driven synchronization and make validation state easier to reason about.

### 3. Replace effect-components with selectors or query-like derived state

Candidates:

- `src/features/validation/schemaValidation/SchemaValidation.tsx`
- `src/features/validation/invalidDataValidation/InvalidDataValidation.tsx`
- `src/features/validation/expressionValidation/ExpressionValidation.tsx`

The ideal direction is that these stop pushing derived validations into the store and instead expose derived results directly to the selectors that need them.

### 4. Normalize backend/data-model lookup at the boundary

The backend still talks in `dataElementId`, while frontend state is now keyed by `dataType`.

That is fine, but the translation should ideally happen only at the backend-response boundary so that internal selectors and state updates can stay consistently keyed by `dataType`.

### 5. Be careful with expression validation performance

Expression validation is the riskiest part to move fully to derived selectors because:

- it currently updates incrementally per field
- it needs to work for repeating structures
- it can become expensive if recomputed too broadly

If this is refactored further, benchmark and preserve the current granularity where possible.
