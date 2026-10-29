# AGENTS.md

Before changing queries, cache behavior, or query tests, read [the query boundary](README.md).

- When adapting exports, expose domain hooks and operations through `index.ts`. Keep query definitions and key
  factories in internal files such as `*.queries.ts`.
- Check inferred return types after moving a hook. Select plain application values and give callbacks explicit
  argument and return types so TanStack results and options stay private. Renaming or wrapping a generic TanStack
  hook still exposes its API.
- When moving an imperative cache caller, use a domain helper and the opaque `AppQueryClient` handle. Preserve the
  existing `window.queryClient` contract used by Studio preview and Cypress.
- During a move, preserve cache keys, retries, polling, cancellation, mutation ordering, and callback identity unless
  the task calls for a behavior change. These can affect form saving and process transitions.
- When migrating a test, inject typed API method fakes through `apis` in
  [renderWithProviders](../../test/renderWithProviders.tsx), or use
  [createQueryTestWrapper](../../test/queryTestUtils.tsx) for a focused hook test. Keep the hooks, providers, and cache
  running. Keep tests that inspect TanStack behavior in this folder. Mock HTTP only in API client implementation
  tests.
