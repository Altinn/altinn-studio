# App frontend queries

This folder isolates TanStack Query from the rest of the app frontend. Features use domain hooks and plain
application interfaces so changes to query keys, cache lifetimes, or TanStack itself do not spread into UI code.
Hooks, route loaders, prefetching, and invalidation share query definitions to keep their behavior consistent.

## Interfaces

Request functions stay separate from query policy. The flat [AppQueriesProvider](AppQueriesProvider.tsx),
`useAppQueries`, and `useAppMutations` interfaces provide request injection. Register request functions in
[queries.ts](queries.ts). Existing HTTP clients in [core/api-client](../api-client) remain React-free. Query
definitions, mutations, and cache operations belong here.

- Expose domain hooks and operations through `index.ts`. Keep query definitions and key factories in internal
  files such as `*.queries.ts`.
- Check inferred return types after moving a hook. Select plain application values and give callbacks explicit
  argument and return types so TanStack results and options stay private. Renaming or wrapping a generic TanStack
  hook still exposes its API.
- Accept only the application options a domain needs, and translate them to TanStack options here. Keep arbitrary
  query options and observer results out of public interfaces.
- Use domain helpers and the opaque [AppQueryClient](queryClient.ts) handle for imperative cache operations.
  Preserve the `window.queryClient` contract used by Studio preview and Cypress.

When moving queries, preserve cache keys, retries, polling, cancellation, mutation ordering, and callback identity
unless the task calls for a behavior change. These can affect form saving and process transitions.

## Testing

Inject typed request fakes through `queries` and `mutations` in
[renderWithProviders](../../test/renderWithProviders.tsx), or use
[createQueryTestWrapper](../../test/queryTestUtils.tsx) for a focused hook test. These helpers supply an isolated
cache and flat typed request mocks for each render while keeping the hooks, providers, and cache running.

Mocking hooks would hide problems with query keys, enabled conditions, invalidation, cancellation, and loading or
error behavior. Keep tests that inspect TanStack behavior in this folder. Mock HTTP only in API client
implementation tests.
