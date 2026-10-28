# App frontend

The app frontend is the React application that shows an Altinn 3 app in the browser. The
[app backend](../backend/README.md) serves the page. The frontend then reads the app's layouts, texts, data and
process state from the backend's API, and renders the forms for each step of the process.
[docs.altinn.studio](https://docs.altinn.studio) documents how app developers configure it.

## How it fits

- This is the frontend for v9 apps. [Altinn Apps](../README.md#how-the-parts-fit) describes how it ships with the
  backend, and where the v8 frontend lives.
- The layout components define their configuration in code. `yarn gen` writes the layout schemas, types and component
  documentation from it into [layout-contract](../../common/ts/layout-contract), which Designer uses as well. Run it
  after you change a component's `config.ts` or the generators in [src/codegen](src/codegen), and commit the result.
  CI runs `yarn gen:check`, which fails when the committed output is out of date.
- Rendering code is moving into the shared [form packages](../../common/ts/form-component/README.md), so Designer can
  render forms too.

## Development

`yarn start` starts the dev server on port 8080. To run an app against it, use `studioctl run --dev-frontend` as
[studioctl](../../cli/README.md#run-against-local-builds) describes. To serve a build instead,
run `yarn serve 8080 -c-1`. Without `-c-1` the browser caches the old bundle for an hour after you rebuild.

- Avoid `any` and type casts with `as`, and remove them where you can. CI counts the errors under the stricter
  [tsconfig-strict.json](tsconfig-strict.json) and fails when the count reaches the ceiling in
  [the workflow](../../../.github/workflows/app-frontend-unit-tests.yml).
- Share TanStack Query keys and query functions through `queryOptions` objects.
- Build UI from [Designsystemet](https://designsystemet.no) components where they exist, styled with CSS modules.

## Testing

Unit tests run in Vitest with React Testing Library. Most components need the app's contexts, which
[renderWithProviders](src/test/renderWithProviders.tsx) sets up.

Test a flow that spans providers, polling and mutations, such as a process transition, in Cypress against a real app,
as [process-transition-test](test/e2e/integration/process-transition-test) does. A unit test with a hand-built provider
tree follows the wiring, misses real regressions and gets in the way of refactoring. Keep unit tests for rules that
stand on their own. The [test README](test/README.md) says how to run the Cypress tests.
