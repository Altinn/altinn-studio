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

### Round 1: Broad form data subscriptions

#### 1. ComponentRenderer in FormEngine.tsx — DONE
- **Was:** `useStore(client.formDataStore, (s) => s.data)` — every component subscribed to the entire data tree
- **Fix:** Removed subscription. Hidden evaluation moved into a Zustand selector returning a boolean (only re-renders when hidden state flips). Added `memo()` wrapper and `useCallback` for `renderChildren`.

#### 2. useLanguage() in useLanguage.ts — DONE
- **Was:** `useStore(client.formDataStore, (state) => state.data)` — used by ~15 components
- **Why it existed:** `resolveTextResource` can replace variables from form data
- **Fix:** Removed subscription. `langAsString` now reads form data lazily via `client.textResourceDataSources.formDataGetter` (uses `getState()` at call time). Components only re-render when text resources or language change.
- **Trade-off:** Text resources with dataModel variables won't reactively update on screen when the referenced field changes. If this becomes a problem, a targeted subscription for only those text resources would be needed.

#### 3. useIsRequired() in hooks.ts — DONE
- **Was:** `useStore(client.formDataStore, (state) => state.data)` + `useMemo` — every input component subscribed to all data
- **Fix:** Expression evaluated inside a Zustand selector returning a boolean.

#### 4. usePageOrder() in hooks.ts — DONE
- **Was:** `useStore(client.formDataStore, (state) => state.data)` + `useMemo`
- **Fix:** Evaluated inside a `useShallow` selector returning the filtered page array.

### Round 2: Parent re-render cascades

#### 5. DataTask in task.tsx — DONE
- **Was:** `useExpressionValidation()`, `useSchemaValidation()`, `useFormDataPersistence()` all subscribe to `state.data`, causing DataTask to re-render → Outlet → Page → FormEngine → all components
- **Fix:** Extracted into renderless `<DataTaskSideEffects />` component. Re-renders are isolated and don't cascade into the component tree.

#### 6. Page in page.tsx — DONE
- **Was:** `useFormData()` for debug display caused Page to re-render on every keystroke, breaking memo on FormEngine's children
- **Fix:** Debug display removed/commented out. Page no longer subscribes to form data.

### Round 3: Validation store thrashing

#### 7. validationStore setFieldValidations/clearField — DONE
- **Was:** `setFieldValidations` always spread a new `fieldValidations` object even when the validations were identical. `clearField` always spread even when the path didn't exist. `useExpressionValidation` and `useSchemaValidation` call these on every data change for every field, causing the validation store to update on every keystroke, which notified all `useFieldValidations` subscribers.
- **Fix:** Both methods now compare before updating — `setFieldValidations` checks if severity+message are identical, `clearField` checks if the path exists. Also fixed `clearBackend` and `clearByPathPrefix` to skip no-op updates.

## Verified: Not Causing Issues

- **`useBoundValue`** — uses `useShallow` but returns a primitive; `Object.is` short-circuits in `shallow()`. Only re-renders when that specific field's value changes.
- **`useFieldValidations`** — the `[...spread]` creates a new array, but `useShallow` compares items by reference. Since validation store now skips no-op updates, the stored `FieldValidation[]` arrays are reference-stable.
- **`useFormDataPersistence`** — uses `onFormDataChange` callback subscription, not `useStore`. Does not cause React re-renders.
- **`subscribeWithSelector` middleware** — not needed. Zustand's `useStore` (React binding) uses `useSyncExternalStore` which already compares selector results with `Object.is`. The middleware adds subscription-level filtering on the vanilla store, but the React hook already handles this.
- **`useFormClient()` Context** — returns a stable `FormClient` instance. The Context value never changes, so it never triggers re-renders.

## Remaining Investigation (if still not fully resolved)

### Possible remaining issues
- **`useRequiredValidation`** calls `useEffect` that writes to validation store. If `hasError`/`title`/`langAsString` deps change unnecessarily, it could trigger extra store writes. `langAsString` reference stability depends on `resources` and `language` from textResourceStore — if those are stable (they should be), `langAsString` via `useCallback` should be stable too.
- **Components that call multiple hooks** — even if each hook is individually correct, React batches hook updates. If multiple hooks trigger at once (e.g. `useBoundValue` + `useIsRequired` + `useFieldValidations`), the component renders once but that's expected.

### How to debug further
Use React DevTools Profiler:
1. Enable "Record why each component rendered" in Profiler settings
2. Type in a field and stop the profiler
3. Check which components rendered and why (props changed, hooks changed, parent rendered)

Or add temporary logging:
```typescript
// In ComponentRenderer, after the memo wrapper opens:
console.log('Render:', component.id, component.type);
```

## Reference

POC location: `/Users/adam.haeger/Projects/digdir/app-frontend-react/src/next`
Key file: `src/next/components/RenderComponent.tsx` — the memo'd component renderer with granular selectors
