# Coding standards

What the [Designer frontend](../README.md) adds to the repository's
[coding standards](../../../../docs/coding-standards.md).

## Calling the backend

A call to the backend goes through four layers in [packages/shared](../packages/shared/src):

1. [paths.js](../packages/shared/src/api/paths.js) builds the backend URLs.
2. [queries.ts](../packages/shared/src/api/queries.ts) and [mutations.ts](../packages/shared/src/api/mutations.ts)
   call those URLs with the HTTP wrappers in [networking.ts](../packages/shared/src/utils/networking.ts).
3. A hook, such as `useAppMetadataQuery`, gets the function from `useServicesContext()` and calls `useQuery` or
   `useMutation` with it.
4. Components use the hook. They do not call `useQuery` or `useMutation` themselves.

Hooks get the functions from the services context rather than importing them, so that tests can replace them.

- A query key is a tuple that starts with a [QueryKey](../packages/shared/src/types/QueryKey.ts), such as
  `[QueryKey.AppMetadata, org, app]`.
- Do not call `invalidateQueries()` without a key.

[ServicesContext.tsx](../packages/shared/src/contexts/ServicesContext.tsx) shows an error toast for every query and
mutation that fails. When the backend returns an error code, the toast shows the text `api_errors.<code>` from
`nb.json`. A query or mutation that handles its own errors sets `meta.hideDefaultError`.

## Unit tests

The unit tests run with Vitest and React Testing Library, and live in the same folder as the code they test.

- Import the test API from `vitest`.
- Seed data for hooks and components with `queryClient.setQueryData` on a client from `createQueryClientMock()`.
- Do not call `render` directly in a test. Add a `render<ComponentName>` helper at the bottom of the file that takes
  the props. For a component with required props, keep a `defaultProps` object with minimal valid values.
