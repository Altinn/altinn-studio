# Performance Optimization: Per-Component Re-rendering

## Problem

Every component re-renders when any single field changes. Typing in one Input causes all components on the page to re-render.

## Root Cause Analysis

Compared our implementation against a POC at `app-frontend-react/src/next` that achieves true per-component re-rendering. The POC uses three layers of defense:

1. **`React.memo()`** on the component renderer
2. **Granular Zustand selectors** — each component only subscribes to its own data
3. **No parent re-renders** — parent components don't subscribe to form data

Our implementation had broad `state.data` subscriptions at multiple levels causing cascading re-renders.

## Fixes Applied

### 1. ComponentRenderer in FormEngine.tsx — DONE
- **Was:** `useStore(client.formDataStore, (s) => s.data)` — every component subscribed to the entire data tree
- **Fix:** Removed subscription. Hidden evaluation moved into a Zustand selector returning a boolean (only re-renders when hidden state flips). Added `memo()` wrapper and `useCallback` for `renderChildren`.

### 2. useLanguage() in useLanguage.ts — DONE
- **Was:** `useStore(client.formDataStore, (state) => state.data)` — used by ~15 components
- **Why it existed:** `resolveTextResource` can replace variables from form data
- **Fix:** Removed subscription. `langAsString` now reads form data lazily via `client.textResourceDataSources.formDataGetter` (uses `getState()` at call time). Components only re-render when text resources or language change.
- **Trade-off:** Text resources with dataModel variables won't reactively update on screen when the referenced field changes. If this becomes a problem, a targeted subscription for only those text resources would be needed.

### 3. useIsRequired() in hooks.ts — DONE
- **Was:** `useStore(client.formDataStore, (state) => state.data)` + `useMemo` — every input component subscribed to all data
- **Fix:** Expression evaluated inside a Zustand selector returning a boolean.

### 4. usePageOrder() in hooks.ts — DONE
- **Was:** `useStore(client.formDataStore, (state) => state.data)` + `useMemo`
- **Fix:** Evaluated inside a `useShallow` selector returning the filtered page array.

### 5. DataTask in task.tsx — DONE
- **Was:** `useExpressionValidation()`, `useSchemaValidation()`, `useFormDataPersistence()` all subscribe to `state.data`, causing DataTask to re-render → Outlet → Page → FormEngine → all components
- **Fix:** Extracted into renderless `<DataTaskSideEffects />` component. Re-renders are isolated and don't cascade into the component tree.

### 6. Page in page.tsx — DONE
- **Was:** `useFormData()` for debug display caused Page to re-render on every keystroke, breaking memo on FormEngine's children
- **Fix:** Removed debug display (was commented out by user). Page no longer subscribes to form data.

## Remaining Work

The fixes above significantly reduced re-renders but didn't fully achieve per-component isolation. Areas to investigate:

### Remaining broad subscriptions to audit
- **`useExpressionValidation`** and **`useSchemaValidation`** write to the validation store on every data change. If validation store updates cause components to re-render via `useFieldValidations`, this could still cascade. Check if validation store writes produce new references even when validations haven't changed.
- **`useFormDataPersistence`** — verify it doesn't cause cascading effects.

### Zustand selector behavior
- Our formDataStore is created without `subscribeWithSelector` middleware. The POC uses `subscribeWithSelector`. Without it, Zustand still runs selectors on every store update, but the selector return value comparison may behave differently. Investigate whether adding `subscribeWithSelector` middleware helps.
- The `useStore(store, () => { ... })` pattern (used in ComponentRenderer for hidden, and useIsRequired) runs the selector on every store update to compare the result. This is correct behavior — it evaluates but only triggers re-render if the result changed. However, verify Zustand is actually comparing the return values properly without the middleware.

### Component-level subscriptions to verify
- Components using `useBoundValue` with `useShallow` — these should be fine since they select a single primitive value
- Components using `useMultiBinding` (Custom) — uses `useShallow` on an object, verify shallow comparison works correctly
- Components using `useFieldValidations` — returns a new array on every call if any validation exists (the `[...spread]` creates a new reference). Consider returning a stable reference when validations haven't changed.

### POC patterns we haven't adopted yet
- The POC reads the bound value AND evaluates hidden AND validates all inside `RenderComponent` via selectors, then passes results down as props. Our architecture delegates these to individual component hooks. Both approaches can work, but the POC's approach gives tighter control over what triggers re-renders.
- The POC uses a single global store (`layoutStore`) rather than a client instance via Context. Our Context-based approach is fine but means `useFormClient()` adds an extra layer.

## How to Debug Re-renders

Use React DevTools Profiler:
1. Enable "Record why each component rendered" in Profiler settings
2. Type in a field and stop the profiler
3. Check which components rendered and why (props changed, hooks changed, parent rendered)

Or add temporary logging:
```typescript
// In ComponentRenderer, before the memo wrapper:
console.log('Render:', component.id, component.type);
```

## Reference

POC location: `/Users/adam.haeger/Projects/digdir/app-frontend-react/src/next`
Key file: `src/next/components/RenderComponent.tsx` — the memo'd component renderer with granular selectors
