# Router Structure Refactor Plan

## Context

The current `src/index.tsx` had the entire router config inline, deeply nested context providers in `AppLayout`, and data loading scattered across prefetcher components and context providers. The goal is to adopt the architecture from the `nextsrc` reference: extracted router, route-based loaders, `GlobalData` singleton, type-safe route builders, and file-per-route convention. This is done in-place in `src/`.

---

## Step 1: Create `GlobalData` singleton — DONE

**Created:** `src/GlobalData.ts`

- Static class wrapping `window.org`, `window.app`, `window.altinnAppGlobalData.*`
- Static getters: `org`, `app`, `basename`, `applicationMetadata`, `userProfile`, `selectedParty`, `textResources`, `frontendSettings`, `ui`, `footer`, `availableLanguages`, `orgName`, `orgLogoUrl`, `returnUrl`
- Types reused from existing `src/global.ts`

## Step 2: Create `routesBuilder.ts` — DONE

**Created:** `src/routesBuilder.ts`

- `routes` object with path patterns matching current URL segments exactly
- Type-safe builder functions: `buildInstanceUrl()`, `buildTaskUrl()`, `buildPageUrl()`, `buildProcessEndUrl()`, `buildPartySelectionUrl()`

## Step 3: Create `ErrorPage` component — DONE

**Created:** `src/components/ErrorPage.tsx`

- Uses `useRouteError()` + `isRouteErrorResponse()` from react-router
- Renders error UI via existing `DisplayError` / `UnknownError` components

## Step 4: Extract module-level `queryClient` — DONE

**Created:** `src/queryClient.ts`

- Exports `queryClient` with same config as previous `defaultQueryClient`
- Config: `{ retry: false, staleTime: 10 * 60 * 1000, refetchOnWindowFocus: false }`

**Modified:** `src/core/contexts/AppQueriesProvider.tsx`

- Imports shared `queryClient` from `src/queryClient.ts` as default

## Step 5: Extract router to `router.tsx` and `AppLayout.tsx` — DONE

**Created:** `src/router.tsx`

- `createRouter()` function returning `createBrowserRouter(...)` with `{ basename: GlobalData.basename }`
- Uses `routesBuilder.ts` path constants and `<ErrorPage />` as `errorElement`
- Route tree identical to previous inline routes

**Created:** `src/AppLayout.tsx`

- `AppLayout` + `InstantiationUrlReset` extracted from `index.tsx`
- Same provider nesting preserved

**Modified:** `src/index.tsx`

- Simplified to: `AppQueriesProvider > ErrorBoundary > AppPrefetcher + RouterProvider`

---

## Step 6: Create route folders with loaders — DONE

**Created** route folder structure with route components and loaders:

```
src/routes/
  index/
    index.route.tsx       -- re-exports Entrypoint
    index.loader.ts       -- ensureQueryData for parties
  instance/
    instance.route.tsx    -- wraps InstanceProvider + Outlet
    instance.loader.ts    -- ensureQueryData for instance + process
  task/
    task.route.tsx        -- wraps FixWrongReceiptType + ProcessWrapper + FormProvider + Outlet
    task.loader.ts        -- ensureQueryData for instance + process (no-op if parent cached)
  page/
    page.route.tsx        -- PdfWrapper + PresentationComponent + Form
  party-selection/
    party-selection.route.tsx  -- re-exports PartySelection
    party-selection.loader.ts  -- ensureQueryData for parties
  instance-selection/
    instance-selection.route.tsx  -- re-exports InstanceSelectionWrapper
    instance-selection.loader.ts  -- ensureQueryData for parties
  process-end/
    process-end.route.tsx -- re-exports DefaultReceipt
```

**Loader pattern:** Each loader uses `queryClient.ensureQueryData()` to prefetch into the cache. Existing context providers still work — they find data already cached, so their internal fetches resolve instantly.

## Step 7: Wire loaders into `router.tsx` — DONE

**Modified:** `src/router.tsx`

- `createRouter()` now accepts `queryClient: QueryClient` parameter
- Route components imported from route folders
- Loaders wired via factory functions: `instanceLoader(queryClient)`, etc.
- Inline `Component: () => (...)` wrappers replaced with route module components

**Modified:** `src/index.tsx`

- Passes shared `queryClient` to `createRouter(queryClient)`

**Verified:** `tsc --noEmit` clean, `yarn test` 152/152 suites pass, `yarn lint` clean

## Step 8: Clean up `index.tsx` — TODO

**Modify:** `src/index.tsx`

- Remove `AppPrefetcher` (replaced by route loaders)
- Eventually remove `AppQueriesProvider` wrapping (once components are migrated off `useAppQueries`)
- Final shape: `ErrorBoundary > QueryClientProvider > RouterProvider`

---

## What stays unchanged

These providers remain in `AppLayout` — they manage state, not data fetching:
- `AppComponentsBridge`, `NavigationEffectProvider`, `ViewportWrapper`, `UiConfigProvider`, `GlobalFormDataReadersProvider`, `PartyProvider`, `KeepAliveProvider`

## Key risks & mitigations

- **URL segments must not change** — use exact same path patterns as current router
- **`window.queryClient` must remain exposed** — Studio and Cypress depend on it
- **Tests use their own routers** (`renderWithProviders.tsx`) — production router extraction doesn't break them; new loader tests should use `createMemoryRouter`
- **Loader timing changes UX** — loaders block navigation until complete. Use `defer()` or loading indicators if needed

## Verification

1. `npx tsc --noEmit` — no type errors
2. `yarn test` — existing unit tests pass
3. `yarn start` — dev server runs, navigate through all routes
4. Verify `window.queryClient` is still accessible in browser console
5. Cypress E2E tests pass (93 spec files)
