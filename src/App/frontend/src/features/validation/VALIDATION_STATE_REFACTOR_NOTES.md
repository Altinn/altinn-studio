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
- `ExpressionValidation` is still an effect-component that computes derived state and writes it back into the store.
- Schema and invalid-data validations are still stored, but they are now recalculated by the form-data state machine when debounced data changes instead of by separate React effect components.
- `ValidationPlugin` and `ValidationStorePlugin` still store validations per node in `state.nodes.nodeData[...]`, and many consumers read from that node-scoped cache instead of deriving validations directly.
- `useWaitForValidation()` still depends on `processedLast` in the validation slice and `registry.current.validationsProcessed[...]` in the node generator registry, because frontend validation completion is currently observed indirectly through rendered node instances.

## Research findings

### Where selector-time derivation is already possible

- Data-model owned validations are already selector-friendly:
  - backend validations live under `state.data.models[dataType].validations.backend`
  - schema validations are updated in the form-data state machine on debounced changes
  - invalid-data validations are updated in the form-data state machine on debounced changes
- Repeating-group field expansion already happens from form data at read time through `FormStore.data.useDebouncedAllPaths(reference)`.
- Expression validation is already close to field-level derivation:
  - `ExpressionValidation.tsx` expands field paths using `useDebouncedAllPaths`
  - each expanded field is evaluated independently in `FieldExpressionValidation`

### What still requires node state today

- Per-node visibility masks are stored in node state:
  - `validationVisibility`
  - `initialVisibility`
  - attachment-specific visibility overrides
- Hidden state is mirrored into node state and used by validation selectors.
- Page- and subtree-level queries currently iterate over `state.nodes.nodeData` and read cached per-node validations:
  - `useVisibleValidations`
  - `useVisibleValidationsDeep`
  - `useGetNodesWithErrors`
  - `usePageHasVisibleRequiredValidations`
- `useWaitForValidation()` waits for backend validation freshness, then waits until all validating nodes have observed the latest `processedLast` token.

### Main architectural constraint

The difficult part is not field validation lookup itself. The difficult part is answering queries shaped like:

- "what validations belong to this rendered node instance?"
- "what validations exist in this subtree/page?"
- "which repeating-group rows/pages contain errors?"

Those queries need:

- layout structure
- component-to-binding relationships
- rendered node indexing for repeating groups
- current hidden state / page membership
- current visibility masks

That means removing stored per-node validations does not automatically let us remove all node-related validation state.

### Important design constraint for the replacement

The replacement query layer should not rebuild the current `nodes` model under a different name.

Specifically:

- it should derive data-model location from layout structure plus form data, not from `state.nodes`
- it should avoid the current dashed/indexed node id concept as the primary identifier
- it should prefer an identifier shape based on:
  - component id
  - data type
  - concrete data-model path / location

This would make instance identity more explicit and less tied to historical node-registry behavior.

### Likely end state

The cleanest long-term split looks like this:

- Data store:
  - backend/schema/invalid-data validations per data model
- Selector layer:
  - field and node validation derivation on demand
  - expression validation derived on demand
- Node state:
  - visibility state only, or as little node-specific validation state as possible
- No plugin-managed per-node validation arrays in zustand

In other words, `ValidationPlugin` should stop being a validation result cache and become, at most, a visibility helper while consumers move to selector-time computation.

The query layer beneath this should ideally expose a derived "component instance reference" model rather than node ids.

For example, conceptually:

- `componentId`
- `dataType`
- `location`
  - either a concrete field path
  - or a structured repeating-group context that can produce concrete field paths

That would also let helpers such as `useDataModelLocationForNodeRaw(...)` be replaced with pure derivation from layout and form data.

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

- `src/features/validation/expressionValidation/ExpressionValidation.tsx`

The ideal direction is that these stop pushing derived validations into the store and instead expose derived results directly to the selectors that need them.

Recommended order for the next pass:

1. Extract pure expression-validation helpers at the field level.
2. Build a selector/hook that returns validations for one node without writing them into `state.nodes`.
3. Migrate node-local consumers such as `useUnifiedValidationsForNode` to that selector path.
4. Only after node-local reads work without cached node validations, tackle page/subtree queries such as `usePageHasVisibleRequiredValidations` and `useVisibleValidationsDeep`.

This de-risks the migration by preserving node visibility state while removing the stored validation arrays first.

### 4. Normalize backend/data-model lookup at the boundary

The backend still talks in `dataElementId`, while frontend state is now keyed by `dataType`.

That is fine, but the translation should ideally happen only at the backend-response boundary so that internal selectors and state updates can stay consistently keyed by `dataType`.

### 5. Be careful with expression validation performance

Expression validation is the riskiest part to move fully to derived selectors because:

- it currently updates incrementally per field
- it needs to work for repeating structures
- it can become expensive if recomputed too broadly

If this is refactored further, benchmark and preserve the current granularity where possible.

## Recommended immediate next task

Introduce a selector-driven node-validation layer without changing page-level aggregation yet.

Concretely:

- extract pure field-level expression validation helpers
- create a `useNodeValidations` / `selectNodeValidations` path that computes:
  - empty-field validations
  - component validations
  - data-model validations
  - expression validations
- keep node visibility in state for now
- adapt one or two direct node consumers to use the new selector

This is the smallest step that moves the architecture toward "select validations when needed" without first solving the harder page/subtree aggregation problem.

## Derived instance query layer proposal

### Existing building blocks

- Layout structure:
  - `makeLayoutLookups.ts`
  - gives us:
    - `componentToParent`
    - `componentToChildren`
    - `topLevelComponents`
    - `componentToPage`
- Repeating-group row counts:
  - can be derived from the array at a repeating group's `dataModelBindings.group`
  - existing examples:
    - `FormStore.data.useFreshNumRows(...)`
    - `FormStore.data.useFreshRows(...)`
- Repeating-group binding mutation:
  - `mutateDataModelBindings(...)` in `NodeRepeatingChildren.tsx`
  - already shows how a child binding is transformed when entering a row
- Concrete field expansion:
  - `useDebouncedAllPaths(...)` / `selectAllPaths(...)`
- Hidden derivation:
  - `hidden.ts`
  - currently built from:
    - component hidden expressions
    - parent child-hidden callbacks
    - repeating-group `hiddenRow`
    - hidden page expressions

### Proposed instance reference

Avoid current indexed node ids as the primary identifier.

Instead, derive a reference shaped like:

- `componentId: string`
- `pageKey: string`
- `instanceKey: string`
  - stable serialized form of location context
- `locationContexts: Array<{ dataType: string; groupBinding: string; rowIndex: number }>`
- `effectiveDataModelBindings`
  - bindings after applying repeating-group row indexes

Notes:

- `instanceKey` should be based on the location context, not on dashed node ids.
- Example idea:
  - `componentId="address.street"`
  - `locationContexts=[{ dataType: "model", groupBinding: "people", rowIndex: 0 }, { dataType: "model", groupBinding: "people[0].addresses", rowIndex: 1 }]`
- This gives us a domain identity that can be serialized and compared without depending on node generator ids.

### Proposed query primitives

These should be pure selectors/helpers over layout + form data + minimal UI state:

- `selectComponentInstances(componentId)`
  - returns all concrete instances of one component
- `selectPageComponentInstances(pageKey)`
  - returns all instances on a page
- `selectSubtreeComponentInstances(componentId, location?)`
  - returns all instances beneath a component instance
- `selectIsHidden(instanceRef)`
  - evaluates hidden/page/hiddenRow rules for one instance
- `selectNodeValidations(instanceRef, visibilityMask)`
  - computes validations for one instance on demand

### Important migration insight

The current node generator already contains the transformation rules we need:

- repeating-group row expansion
- binding mutation
- mapping mutation
- data-model location propagation

The new query layer should reuse those rules conceptually, but expressed as pure derivation instead of render-time node creation.

### Smallest safe implementation slice

The first implementation slice should avoid page-wide aggregation.

Recommended slice:

1. Create a pure helper that derives `locationContexts` and effective bindings for a component instance under repeating groups.
2. Add a hook/selector for one component instance:
   - inputs:
     - `componentId`
     - optional explicit location context
   - outputs:
     - effective bindings
     - hidden state
     - validations
3. Use that path for direct node consumers before tackling:
   - page summaries
   - deep validations
   - pagination row error indicators
   - submit/navigation "nodes with errors" queries

### Biggest open question

How to compute all concrete instances for page-wide queries efficiently without recreating the full node tree every render.

Likely answer:

- start with component-local queries only
- then build page/subtree enumeration with memoized selectors keyed by:
  - page key / component id
  - debounced data model slices relevant to repeating groups
  - layout version

### Prototype now implemented

A first pure utility now exists in:

- `src/utils/layout/componentInstances.ts`

Current capabilities:

- apply a derived location context to a data-model reference
- apply a derived location context to all bindings for a component
- derive concrete component instances for a base component id from:
  - `layoutLookups`
  - form data
  - repeating-group ancestry

Current output shape:

- `componentId`
- `pageKey`
- `instanceKey`
- `locationContexts`
- `currentDataModelLocation`
- `effectiveDataModelBindings`

This is intended as the first building block for replacing node-id-based validation queries.
