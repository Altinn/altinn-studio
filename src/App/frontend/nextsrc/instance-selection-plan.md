# Plan: Port Instance Selection Page to nextsrc (TDD)

## Context

Port the instance selection page from `src/` to `nextsrc/`. Write tests first (TDD), then make them pass.

## Approach: Tests First

### Phase 1: Write Tests

#### 1a. Loader tests (`instanceSelectionLoader.test.ts` — new file)

Mock `InstanceApi` and `GlobalData`. Test:

- **Returns instances sorted ascending** when `getActiveInstances` returns data
- **Auto-creates and redirects** when zero instances (calls `InstanceApi.create`, returns `redirect`)
- **Throws 401** when no selected party

#### 1b. Page component tests (`InstanceSelectionPage.test.tsx` — rewrite)

Mock `useLoaderData` and `GlobalData`. Test:

- **Renders table with instance data** — dates formatted, "Endret av" names shown
- **Continue button navigates** to `/instance/{id}` on click
- **"Start pa nytt" button** triggers instance creation mutation
- **Pagination renders** when instances exceed first rowsPerPageOption
- **Sort direction 'desc'** reverses instance order

### Phase 2: Make Tests Pass (implementation order)

#### 2a. Add API method + type to `instanceApi.ts`
- `ISimpleInstance` type
- `getActiveInstances(partyId)` static method

#### 2b. Create `instanceSelectionLoader.ts`
- Fetch instances, sort, handle zero-instances redirect

#### 2c. Wire loader in `router.tsx`

#### 2d. Rewrite `InstanceSelectionPage.tsx`
- `useLoaderData()` for instances
- Config from `GlobalData.applicationMetadata.onEntry.instanceSelection`
- Desktop table + mobile layout (CSS media queries at 992px)
- Inline pagination using designsystemet `usePagination`/`Pagination`/`Select`
- Hardcoded Norwegian strings with TODO for i18n
- `useMutation` for new instance creation
- Ctrl/Cmd+click → open in new tab

#### 2e. Update `InstanceSelectionPage.module.css`

## Files

| File | Action |
|------|--------|
| `nextsrc/core/apiClient/instanceApi.ts` | Add `getActiveInstances` + `ISimpleInstance` |
| `nextsrc/features/instantiate/pages/instance-selection/instanceSelectionLoader.ts` | Create |
| `nextsrc/features/instantiate/pages/instance-selection/instanceSelectionLoader.test.ts` | Create (first) |
| `nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage.tsx` | Rewrite |
| `nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage.test.tsx` | Rewrite (first) |
| `nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage.module.css` | Rewrite |
| `nextsrc/router.tsx` | Add loader + errorElement |

## What's intentionally NOT ported

- `PresentationComponent`, `ReadyForPrint`, `ErrorReport`/`ErrorListFromInstantiation`
- `useSetNavigationEffect`, `useProcessingMutation` — use simpler patterns
- Page `<title>` tag

## Reference: Old code key files

- `src/features/instantiate/selection/InstanceSelection.tsx` — main UI component
- `src/features/instantiate/selection/ActiveInstancesProvider.tsx` — data fetching + MaybeInstantiate logic
- `src/features/instantiate/selection/InstanceSelection.test.tsx` — old tests
- `src/features/instantiate/selection/InstanceSelection.module.css` — old styles
- `src/app-components/Pagination/Pagination.tsx` — pagination pattern reference

## Reference: nextsrc patterns to follow

- `nextsrc/features/instantiate/pages/instance/instanceLoader.ts` — loader pattern
- `nextsrc/core/apiClient/instanceApi.ts` — API client pattern
- `nextsrc/core/globalData.ts` — GlobalData access pattern
- `nextsrc/routesBuilder.ts` — route builder pattern

## Verification

1. `yarn test -- instanceSelectionLoader` — loader tests pass
2. `yarn test -- InstanceSelectionPage` — component tests pass
3. `yarn tsc` — type checks pass
4. `yarn lint` — clean