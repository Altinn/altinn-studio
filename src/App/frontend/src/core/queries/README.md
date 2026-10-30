# App frontend queries

This folder isolates TanStack Query from the rest of the app frontend. Features use domain hooks and plain
application interfaces so changes to query keys, cache lifetimes, or TanStack itself do not spread into UI code.
Hooks, route loaders, prefetching, and invalidation share query definitions to keep their behavior consistent.

## Interfaces

Request functions stay separate from query policy. The flat [AppQueriesProvider](AppQueriesProvider.tsx),
`useAppQueries`, and `useAppMutations` interfaces provide request injection. Register request functions in
[queries.ts](queries.ts). Existing HTTP clients in [core/api-client](../api-client) remain React-free. Query
definitions, mutations, and cache operations belong here.

Features own workflow decisions: save preparation and form-store updates, process validation and navigation, and
button locking and client actions. Compose these around domain mutations. When preparation must run after earlier
mutations finish, pass a callback that the mutation invokes inside its serialized operation. Keep returned mutation
callbacks stable so effects do not save or navigate again after an unrelated render.

- Check inferred return types after moving a hook. Select plain application values and give callbacks explicit
  argument and return types so TanStack results and options stay private. Renaming or wrapping a generic TanStack
  hook still exposes its API.
- Accept only the application options a domain needs, and translate them to TanStack options here. Keep arbitrary
  query options and observer results out of public interfaces.
- Use domain helpers and the opaque [AppQueryClient](queryClient.ts) handle for imperative cache operations.
  Preserve the `window.queryClient` contract used by Studio preview and Cypress.

When moving queries, preserve cache keys, retries, polling, cancellation, mutation ordering, and callback identity
unless the task calls for a behavior change. These can affect form saving and process transitions.

## Naming

Name functions for their domain and their role. Use these patterns for new code, and preserve existing names when
moving code so the move stays easy to review.

| Role                                            | Pattern                                          | Examples                                                               |
| ----------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Read request function                           | `fetch<Resource>` or `get<Resource>`             | `fetchTextResources`, `getInstance`                                    |
| Write request function                          | `do<Action>`, `create<Domain>`, or `set<Domain>` | `doProcessNext`, `createWithPrefill`, `setSelectedParty`               |
| Read hook exposing request state                | `use<Resource>Query`                             | `useInstanceDataQuery`                                                 |
| Write hook exposing request state and execution | `use<Action>Mutation`                            | `useFormDataSaveMutation`                                              |
| Domain operation or derived-value hook          | `use<DomainActionOrValue>`                       | `usePersonLookup`, `useCreateInstance`, `usePostPlace`                 |
| Internal query or mutation definition           | `<resource>Query` or `<action>Mutation`          | `textResourcesQuery`, `selectedPartyMutation`                          |
| Internal key factory                            | `<domain>QueryKeys` or `<domain>MutationKeys`    | `instanceQueryKeys`, `attachmentMutationKeys`                          |
| Imperative cache operation                      | `<verb><Domain>`                                 | `prefetchInstanceData`, `ensureInstanceData`, `invalidateInstanceData` |

Request prefixes are required by [the request types](types.ts) and [the provider](AppQueriesProvider.tsx), which
classify functions by name. Tests override those same request names through the flat `queries` and `mutations`
interfaces. Choose a descriptive name within the matching prefix.

Reserve `use` for React hooks. Keep plain definition and key factories in `<domain>.queries.ts`, and expose public
hooks and domain operations through the domain's `index.ts`. A public name includes the domain. Generic names such
as `useQuery` and `useMutation` belong to the private implementation.

## Testing

Inject typed request fakes through `queries` and `mutations` in
[renderWithProviders](../../test/renderWithProviders.tsx), or use
[createQueryTestWrapper](../../test/queryTestUtils.tsx) for a focused hook test. These helpers supply an isolated
cache and flat typed request mocks for each render while keeping the hooks, providers, and cache running.

Mocking hooks would hide problems with query keys, enabled conditions, invalidation, cancellation, and loading or
error behavior. Keep tests that inspect TanStack behavior in this folder. Mock HTTP only in API client
implementation tests.
