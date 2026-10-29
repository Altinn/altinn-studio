# Query boundary

This folder isolates TanStack Query from the rest of the app frontend, as decided in
[epic #18156](https://github.com/Altinn/altinn-studio/issues/18156). Features use domain hooks and plain application
interfaces. This folder owns query definitions, mutations, and cache operations. HTTP transport lives in
`src/core/api-client/`.

Keeping query keys, cache lifetimes, and TanStack result types here lets us change cache behavior or replace TanStack
without changing UI code. Hooks, route loaders, prefetching, and invalidation share the same query definitions.

Tests inject typed API method fakes while running the real hooks, providers, and cache. Mocking hooks would hide
problems with query keys, enabled conditions, invalidation, cancellation, and loading or error behavior. The shared
[render helpers](../../test/renderWithProviders.tsx) supply an isolated cache and API clients for each test render.
