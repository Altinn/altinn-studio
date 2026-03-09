# nextsrc/core conventions

## Purpose

`nextsrc/core/` contains shared infrastructure: API clients, query hooks, UI primitives, error handling, and global configuration. It is the only place in `nextsrc/` that may import `@tanstack/react-query` (with the exception of `nextsrc/index.tsx` for provider setup).

## Directory overview

```
core/
  api-client/         API layer (axios wrappers per domain)
  components/         Shared UI primitives (Button, Pagination)
  hooks/              Shared React hooks (useDeviceWidths)
  queries/            React Query integration (see below)
  QueryClient.ts      QueryClient instance
  axiosInstance.ts     Configured axios instance
  globalData.ts       Static data loaded at startup
  ErrorBoundary.tsx   Root error boundary component
  RootErrorFallback   Fallback UI for unrecoverable errors
  routerErrorResolver Error classification for router errors
  serverStatusCodes   HTTP status code constants
  typeguards.ts       Shared type guard utilities
```

## queries/ conventions

React Query is an implementation detail of `core/`. Code outside `core/` never imports `@tanstack/react-query` directly. This is enforced by ESLint (`no-restricted-imports`).

### Module structure

Each query domain follows this layout:

```
queries/<domain>/
  index.ts              Public API (hooks, prefetch/invalidation functions)
  <domain>.queries.ts   Internal queryOptions, mutations, query keys
  utils.ts              Optional helpers
```

Only `index.ts` is importable from outside the module. Importing internal files like `instance.queries.ts` directly is blocked by ESLint.

### Hook conventions

Hooks in `index.ts` return plain interfaces, never `UseQueryResult` or `UseMutationResult`:

```typescript
// Good - explicit return type
interface UseActiveInstancesResult {
  instances: ISimpleInstance[] | undefined;
  isLoading: boolean;
  error: Error | null;
}
function useActiveInstances(opts: { ... }): UseActiveInstancesResult { ... }

// Bad - leaking React Query types
function useActiveInstances(opts: { ... }) {
  return useQuery({ ... }); // consumers now depend on @tanstack/react-query
}
```

Common return shape fields:
- **Queries**: `data` (named semantically, e.g. `instances`, `parties`), `isLoading`, `error`
- **Mutations**: named action (e.g. `createInstance`), `isPending`, `error`
- **On-demand queries**: `performLookup` (async function returning the result), `isFetching`, `error`

### Prefetch and invalidation functions

Loaders and actions do not import `@tanstack/react-query`. Instead, each query module exports functions that accept a `QueryClient`:

```typescript
// In core/queries/instance/index.ts
export function prefetchActiveInstances(queryClient: QueryClient, partyId: string) {
  return queryClient.ensureQueryData(activeInstancesQuery(partyId));
}

// In a loader
import { prefetchActiveInstances } from 'nextsrc/core/queries/instance';
import type { QueryClient } from 'nextsrc/core/queries/types';
const data = await prefetchActiveInstances(queryClient, partyId);
```

The `QueryClient` type is re-exported from `core/queries/types.ts` so loaders don't need to import from `@tanstack/react-query`.

### Internal query definitions

`<domain>.queries.ts` files contain `queryOptions()` calls, mutation hooks, and query key factories. These are not exported from `index.ts` and are only consumed within the same module.

```typescript
// instance.queries.ts (internal)
const instanceQueries = {
  all: (partyId: string) => ['instances', partyId] as const,
  active: (partyId: string) => [...instanceQueries.all(partyId), 'active'] as const,
};

export function activeInstancesQuery(partyId: string) {
  return queryOptions({
    queryKey: instanceQueries.active(partyId),
    queryFn: () => InstanceApi.getActiveInstances(partyId),
  });
}
```

## Adding a new query domain

1. Create `core/queries/<domain>/`
2. Add `<domain>.queries.ts` with `queryOptions`, query keys, and/or mutations
3. Add `index.ts` that exports hooks with explicit return types and any prefetch/invalidation functions
4. Consumers import only from `nextsrc/core/queries/<domain>` (which resolves to `index.ts`)

## ESLint enforcement

Two rules protect these boundaries (defined in `eslint.config.mjs`):

1. **`@tanstack/react-query` is banned** outside `nextsrc/core/**` and `nextsrc/index.tsx`
2. **Internal query files are banned** - only `index.ts` from each `core/queries/<domain>/` folder can be imported by outside code
