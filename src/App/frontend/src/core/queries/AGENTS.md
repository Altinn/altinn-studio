# AGENTS.md

Keep TanStack Query private to this folder. Features use domain hooks and plain application interfaces so changes
to query keys, cache lifetimes, or TanStack itself do not spread into UI code. Hooks, route loaders, prefetching,
and invalidation share query definitions to keep their behavior consistent.

Separate HTTP transport from query policy. Put HTTP calls, URL construction, and response decoding in React-free
domain clients in `src/core/api-client/`. Put query definitions, mutations, and cache operations here. Use the
existing typed API client injection.

- When adapting exports, expose domain hooks and operations through `index.ts`. Keep query definitions and key
  factories in internal files such as `*.queries.ts`.
- Check inferred return types after moving a hook. Select plain application values and give callbacks explicit
  argument and return types so TanStack results and options stay private. Renaming or wrapping a generic TanStack
  hook still exposes its API.
- Accept only the application options a domain needs, and translate them to TanStack options here. Keep arbitrary
  query options and observer results out of public interfaces.
- When moving an imperative cache caller, use a domain helper and the opaque `AppQueryClient` handle. Preserve the
  existing `window.queryClient` contract used by Studio preview and Cypress.
- During a move, preserve cache keys, retries, polling, cancellation, mutation ordering, and callback identity unless
  the task calls for a behavior change. These can affect form saving and process transitions.
- When migrating a test, inject typed API method fakes through `apis` in
  [renderWithProviders](../../test/renderWithProviders.tsx), or use
  [createQueryTestWrapper](../../test/queryTestUtils.tsx) for a focused hook test. Keep the hooks, providers, and cache
  running. These helpers supply an isolated cache and typed API clients for each render. Mocking hooks would hide
  problems with query keys, enabled conditions, invalidation, cancellation, and loading or error behavior. Keep tests
  that inspect TanStack behavior in this folder. Mock HTTP only in API client implementation tests.
