# Query boundary

This folder owns TanStack Query for the app frontend. The decision comes from
[epic #18156](https://github.com/Altinn/altinn-studio/issues/18156).

Feature code should describe the data or operation it needs. It should not need
query keys, cache lifetimes, observer results, skip tokens, or mutation filters.
Keeping those decisions here lets us change cache behavior or replace TanStack
without changing UI code. It also keeps query definitions consistent between
hooks, route loaders, prefetching, and invalidation.

## Public modules

- Put queries, mutations, cache reads, and invalidation in a domain module here.
  Keep HTTP transport in `src/core/api-client/`.
- Export domain hooks and operations through the domain's `index.ts`. Keep query
  definitions and key factories in internal files such as `*.queries.ts`.
- Return plain application values and interfaces. Select the fields callers need
  rather than returning or spreading a TanStack query or mutation result.
  Give callbacks plain argument and return types, including refetch callbacks.
- Accept application options that the domain needs. Translate them to TanStack
  options here instead of exporting `UseQueryOptions` or accepting arbitrary
  options from callers.
- Export domain prefetch, invalidate, and cache helpers for imperative callers.
  The app root and router pass the opaque cache handle created in
  `queryClient.ts` to these helpers; feature code uses hooks rather than client methods.
- Import TanStack directly in implementations here. Keep its hooks, types,
  constants, and managers private. Re-exporting them under another name or through
  a generic wrapper defeats the boundary and bypasses the import restriction.

The client factory, provider, and developer tools in this folder compose the app.
`window.queryClient` remains available for the existing Studio preview, Cypress,
and console integration. Keep that compatibility contract out of feature code.

## Changing existing queries

Preserve cache keys, retry behavior, polling, cancellation, mutation ordering, and
callback identity unless the task calls for a behavior change. These affect form
saving and process transitions even when a refactor appears to be only a move.

## Testing

Keep the real domain hooks, providers, and TanStack Query running in tests. Inject
API method fakes through `apis` in [renderWithProviders](../../test/renderWithProviders.tsx),
or use [createQueryTestWrapper](../../test/queryTestUtils.tsx) for focused hook tests.
Both create a separate cache and typed clients for each render. API method argument
and response types supply completion and catch invalid fixtures without casts.
Use the returned `apis` mocks to inspect calls or resolve pending requests.

Mocking hooks hides query keys, enabled conditions, invalidation, cancellation, and
loading/error behavior. Module mocks of query hooks, API clients, or their provider
also bypass dependency injection. ESLint rejects these mocks and HTTP mocks in
feature tests. API client implementation tests may mock HTTP to verify request
construction and response parsing.

Keep tests that inspect TanStack behavior here. ESLint rejects TanStack imports
outside this folder, internal module imports from callers, and re-exports of
imported TanStack bindings.
