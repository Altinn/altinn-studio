# New frontend architecture in nextsrc/

- Status: Proposed
- Deciders: Team
- Date: 17.02.2026

## Result

A1: Layered (Technical Separation) — API clients and query definitions live in `core/`, UI components in `features/`, and routes in `routes/`.

Details:

- Technical implementations and technology should not bleed out to consumers. E.g. TanStack Query implementations should not bleed out to UI components.
- Layout Components belong (for now) in the `features/FormEngine/` feature folder.
- App Components belong in the `libs/` folder.

## Problem context

The existing `src/` codebase has grown organically and accumulated several structural problems:

- A deeply nested React Context hierarchy makes components hard to test in isolation and costly to refactor.
- Server state is managed through a mix of Zustand stores and custom context providers rather than a dedicated data-fetching layer.
- There is no consistent pattern for routing, data loading, or error handling — these concerns are scattered across components and providers.
- The test setup requires significant scaffolding (`renderWithProviders`) because components depend on the full provider tree to function.

A clean-slate `nextsrc/` directory lets us establish correct patterns without being constrained by backwards compatibility with the legacy structure.

## Decision drivers

- B1: Routes, their loaders, and their styles should be co-located so that each route is self-contained and easy to navigate.
- B2: Infrastructure (API clients, query definitions, error handling) should be clearly separated from feature UI code.
- B3: Server state should be managed exclusively through React Query, removing the need for custom context/Zustand wrappers for remote data.
- B4: UI components should receive only data props and not depend on app-level hooks or context.
- B5: The folder structure should make it obvious where new code belongs with minimal ambiguity.

## Alternatives considered

- A1: Layered — technical concerns (API, queries, UI) are separated into top-level folders.
- A2: Feature-based — each domain owns its API, queries, and components in a single folder.

## Pros and cons

### A1: Layered (Technical Separation)

```
src/
  core/
    api/
      instance.api.ts
      parties.api.ts
      client.ts
    queries/
      instance.queries.ts
      parties.queries.ts
    queryClient.ts
  features/
    instance/
      InstancePage.tsx
    party-selection/
      PartySelectionPage.tsx
  routes/
    index/
    instance/
    party-selection/
  layouts/
  router.tsx
```

- Good, because architectural layers are visible at a glance — API, queries, and UI are always in predictable locations (B2, B5).
- Good, because all query keys and query definitions are centralised, making cache invalidation patterns obvious (B3).
- Good, because loaders only need to import from `core/queries/` — one predictable location (B1).
- Good, because the structure itself prevents accidentally mixing API logic into components (B2).
- Good, because multiple routes sharing the same query just import from the same place — no duplication.
- Bad, because adding a field to the UI often requires changes in three or more folders (api, queries, component).
- Bad, because deleting a feature requires hunting through multiple layers to remove all related files.
- Bad, because components importing from `core/queries/` creates long-distance coupling across the tree.
- Bad, because shared query files make it easy to accidentally introduce dependencies between features.
- Bad, because this scales poorly with team size — multiple developers working on different features will conflict in shared files.

### A2: Feature-Based (Domain Separation)

```
nextsrc/
  core/
    api/
      client.ts
    queryClient.ts
  features/
    instance/
      api/
        instance.api.ts
      queries/
        instance.queries.ts
      components/
        InstanceList.tsx
      types.ts
      index.ts
    party-selection/
      api/
      queries/
      components/
      types.ts
      index.ts
  routes/
    index/
    instance/
    party-selection/
  layouts/
  router.tsx
```

- Good, because everything related to a domain is in one place — changing a concept means editing one folder.
- Good, because removing a feature is as simple as deleting one folder.
- Good, because each feature can be owned by a different developer or team with minimal conflicts.
- Good, because features can be tested in isolation by mocking only their own API boundary (B4).
- Good, because `index.ts` files make the public API of each feature explicit.
- Good, because features are independent — changes to one are unlikely to break another.
- Bad, because nesting is deeper: `features/instance/queries/instance.queries.ts` vs `core/queries/instance.queries.ts`.
- Bad, because routes need to import from multiple feature folders rather than one central location.
- Bad, because cross-feature data needs (e.g. a route that combines instance and party data) require imports from multiple feature folders.
- Bad, because the approach requires discipline — without good `index.ts` conventions the structure can become inconsistent. (Mitigation: Eslint rules to ensure only content from `index.ts` is exported.)
- Bad, because similar patterns may be duplicated across features if the boundary between feature-internal and shared utilities is not actively maintained.

## When to choose which

Choose **A1 (layered)** if:

- Small to medium app (single team, fewer than ~10 main features).
- Heavy use of loaders that benefit from centralised query access.
- Features frequently share data and cache invalidation logic.
- The team is new to React Query and benefits from seeing all queries in one place.

Choose **A2 (feature-based)** if:

- Medium to large app with many distinct domains.
- Multiple developers or teams working simultaneously on separate features.
- Features are relatively independent and rarely share queries.
- You anticipate features growing complex enough to justify their own internal structure.
- You plan to eventually extract features into separate packages or micro-frontends.

**Hybrid approach:** Start layered for simplicity, and extract features into feature folders as they grow complex enough to justify it. Keep simple features in the layered structure until they earn the added complexity of a dedicated folder.
