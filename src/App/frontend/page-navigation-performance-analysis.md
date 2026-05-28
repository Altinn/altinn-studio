# Page-to-page navigation performance analysis

## Symptom

Navigating from one form page to the next (e.g. clicking **Neste**/**Forrige**, or
selecting a page in the navigation bar) has a noticeable delay that was not present in
earlier versions. The delay is consistent and reproducible, and it occurs even on trivial
pages with little or no content.

## Reproduction

- App: `altinn-apps-all-components` (component-library test app, 32 pages).
- Action: navigate page → page within the same task (e.g. to the `SimpleTable` page,
  which renders an empty table).
- Observation: ~230–310 ms of unresponsiveness per navigation.

## Methodology

Because navigation crosses a component unmount/remount, the work was measured with a
small singleton timer that records phase timestamps across the whole navigation and a set
of per-navigation call/time counters on suspected hot paths. The phases recorded were:

- `save-wait` — awaiting the on-change-page form-data save.
- `validation` — awaiting `onPageNavigationValidation`.
- `before-navigate` — from the end of the pre-navigation awaits to the react-router
  `navigate()` call.
- `page-committed` — from `navigate()` until React commits the new page.
- `page-painted` — a `requestAnimationFrame` after commit (≈ first paint).

Counters were added to: `evalExpr`, `useExpressionDataSources`, `useAllValidations`,
`usePageHasVisibleRequiredValidations`, `GenericComponent` render, `NodeGenerator`
render, and the node-store mutation callbacks (`addNode` / `removeNode` / `setNodeProp`).

## Measurements

A representative navigation produced:

```
before-navigate                        +  0.6ms   (total   0.6ms)
page-committed                         +307.9ms   (total 308.5ms)
page-painted                           +  2.4ms   (total 310.9ms)
· useExpressionDataSources               419 calls   0.0ms total
· NodeGenerator.render                   403 calls   0.0ms total
· useAllValidations                        4 calls   3.2ms total
· usePageHasVisibleRequiredValidations     4 calls   0.0ms total
· GenericComponent.render                  9 calls   0.0ms total
(addNode / removeNode / setNodeProp:       0 calls)
```

Key observations:

1. **Essentially all the time is in `page-committed`** — the synchronous React
   render+commit between the URL change and the new page appearing. `save-wait` and
   `validation` did not even fire for navigation-bar navigations (they use `skipAutoSave`
   and don't validate), so those are not the cause. The react-router loaders are not the
   cause either — they do not re-run on a same-task page navigation.

2. **It is not expression evaluation.** `evalExpr` was called **zero** times during the
   navigation (it does not appear in the counters). Hidden/expression results are cached
   and are not recomputed on a plain navigation.

3. **It is not visible component rendering.** Only **9** `GenericComponent`s rendered —
   the handful actually on the target page.

4. **It is not validation traversal.** `useAllValidations` (4 calls, 3.2 ms) and
   `usePageHasVisibleRequiredValidations` (4 calls, ~0 ms) are cheap.

5. **It is not a node-store mutation cascade.** `addNode` / `removeNode` / `setNodeProp`
   were never called during the navigation.

6. **The cost is the node-generator tree re-rendering.** `NodeGenerator.render` fired
   **403 times** — one per component node across _all_ pages of the form — and
   `useExpressionDataSources` fired **419 times**. Each individual render does ~0 ms of
   our own work; the ~308 ms is pure React reconciliation/commit overhead of re-rendering
   ~400 component subtrees (each `NodeGenerator` also renders `AddRemoveNode`,
   `NodePropertiesValidation`, `GeneratorNodeProvider`, `WhenParentAdded`, etc.).

## Root cause

On every page navigation, the **entire node-generator tree re-renders**, even though
nothing about those nodes changed.

By design, a node generator is mounted for **every** component on **every** page of the
form (see `src/utils/layout/generator/NodeGenerator.tsx`):

> A node generator will always be rendered when a component is present in a layout, even
> if the component normally is hidden, the user is on another page […]

This tree (`NodesProvider` → `LayoutSetGenerator` → `PageGenerator` → `GenerateComponent`
→ `NodeGenerator`) lives inside `FormProvider`, which is mounted at the **task** route
level (`src/routes/task/task.route.tsx`).

Two things combine to make navigation re-render this whole tree:

### 1. The route subtree re-renders on every navigation

With the react-router data router, navigating re-renders the matched route component
tree. `FormProvider` is a route element, so on each navigation it re-renders and recreates
its child subtree — `NodesProvider`, the generator providers, and `LayoutSetGenerator` —
inline. None of the generator components (`LayoutSetGenerator`, `PageGenerator`,
`GenerateComponent`, `NodeGenerator`) are memoized, so this parent re-render cascades all
the way down to all ~400 node generators.

### 2. The generator context value identity changes on every render

The generator context providers defeat their own memoization. In
`src/utils/layout/generator/GeneratorContext.tsx`:

```ts
export function GeneratorGlobalProvider({ children, ...rest }: PropsWithChildren<GlobalProviderProps>) {
  const value: GeneratorContext = useMemo(
    () => ({ /* …defaults… */, ...rest }),
    [rest], // ⚠️ `rest` is a brand-new object on every render
  );
  return <Provider value={value}>{children}</Provider>;
}
```

The `{ children, ...rest }` rest-spread produces a new `rest` object on every render, so
`useMemo([rest])` never hits and the **context value gets a new identity on every
render**. `GeneratorPageProvider` has the same pattern (`[parent, rest]`). Because every
node consumes this context through the many `GeneratorInternal.use*` hooks
(`useParent`, `useDepth`, `useRowIndex`, `useIdMutators`, `usePage`, `useIsValid`, …),
a single re-render of the provider forces **every** consumer in the tree to re-render —
bypassing memoization even where it exists.

Together: a navigation re-renders `FormProvider`, which re-renders the generator providers,
whose context value identity changes, which re-renders all ~400 node generators and their
subtrees — ≈ 308 ms of React overhead doing no actual work.

## Why this is a regression

The generator files and the generator context were last reworked by the store-consolidation
refactors (notably `#18652 "simplifying FormStore"` and `#18344 "Combining zustand
stores"`), which moved bootstrap/layout data from a dedicated context (`FormBootstrap`)
into the combined `FormStore` and reshaped the generator providers. Combined with the
react-router data-router migration (which re-renders route element trees on navigation),
the unmemoized generator tree and the unstable provider context value now cause the full
tree to re-render on every page change. In earlier versions the generator tree was not
re-rendered on navigation, so the cost was not paid.

## Cost summary

| Phase / counter            | Value           | Conclusion                                       |
| -------------------------- | --------------- | ------------------------------------------------ |
| `page-committed`           | ~230–308 ms     | Where all the time goes                          |
| `evalExpr`                 | 0 calls         | Not expression evaluation                        |
| `GenericComponent.render`  | ~9              | Not visible-component rendering                  |
| `useAllValidations`        | 4 calls / ~3 ms | Not validation traversal                         |
| `add/remove/setNodeProp`   | 0 calls         | Not a store-mutation cascade                     |
| `NodeGenerator.render`     | ~403            | **Whole node-generator tree re-renders**         |
| `useExpressionDataSources` | ~419            | Consistent with all node generators re-rendering |

## Potential remediation directions

1. **Stabilize the generator context value** — depend on the individual provider props
   rather than the rest-spread object in `GeneratorGlobalProvider` and
   `GeneratorPageProvider`, so the context value keeps a stable identity across renders.
2. **Insulate the generator tree from navigation re-renders** — add a memo boundary
   (e.g. around `LayoutSetGenerator`, or per node at `GenerateComponent`) so a parent
   re-render from navigation does not cascade into the ~400-node tree. This is only
   effective once (1) makes the context identity stable.
3. **Longer term** — reconsider mounting a generator component for every node on every
   page; lazy/scoped generation per active task/page would reduce the always-mounted
   component count that drives this cost.
