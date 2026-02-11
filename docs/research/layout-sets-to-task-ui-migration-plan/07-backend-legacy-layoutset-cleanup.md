# Step 7: Backend Legacy `LayoutSet` Cleanup

## Goal

Remove remaining backend runtime use of legacy `LayoutSet` abstractions and replace them with direct task-folder/UI configuration access.

## Scope

- `src/App/backend`
- Runtime paths still consuming or producing `LayoutSet` solely as a compatibility shape
- Related telemetry/tests/public surface updates required to complete the cleanup

## Out of Scope

- Frontend runtime changes (already migrated to `ui`)
- CLI migration behavior changes unless needed for backend contract alignment
- Studio/Designer changes

## Why this step exists

The runtime no longer reads `layout-sets.json`, but backend still synthesizes and passes `LayoutSet` objects in several paths. This preserves legacy shape/terminology and adds avoidable indirection.

## Tasks

1. Introduce a backend-native task UI resolution model for runtime use:
   - Task folder id (`taskId`)
   - Resolved default datatype id (or null when not resolvable)
   - Any runtime fields currently read through `LayoutSet` compatibility objects
2. Replace `GetLayoutSetForTask` usage in runtime paths with direct task UI resolution:
   - `PdfController`
   - `ExpressionsExclusiveGateway`
   - Any other callers in backend runtime code
3. Refactor `GetLayoutModelForTask` to stop constructing legacy `LayoutSet` unless strictly required by immutable model contracts.
4. Remove obsolete/compatibility API surface in backend interfaces where possible:
   - `IAppResources` (public/internal variants)
   - Implementation methods in `AppResourcesSI`
5. Rename telemetry activities that still use legacy wording (`LayoutSet`) when tied to task UI resolution semantics.
6. Update tests/snapshots/public API verifications to match the cleaned runtime contract and naming.
7. Verify no backend runtime code path relies on legacy `LayoutSet` as an intermediate compatibility layer.

## Deliverables

- Backend runtime no longer synthesizes `LayoutSet` objects just to pass datatype/folder information internally.
- Runtime code uses task-folder/UI configuration terminology consistently.
- Public/internal interfaces are simplified to the minimum required contract.

## Risks

- Broad interface changes can affect tests and extension points.
- PDF and process-gateway behavior may regress if datatype resolution semantics drift.

## Acceptance Criteria

- Search in backend runtime code confirms no compatibility-only `LayoutSet` construction/translation remains.
- Existing behavior for task datatype resolution, PDF formatting, and gateway expression evaluation is preserved.
- Relevant backend tests and API verification snapshots are updated and passing.
