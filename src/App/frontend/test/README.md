# Cypress tests

The Cypress tests in [e2e/integration](e2e/integration) drive the frontend in a real app. Each folder there tests one
of the apps in [src/test/apps](../../../test/apps), which have the same names. The apps reference the backend in this
checkout, so the tests cover the frontend and backend together.
[app-frontend-cypress.yml](../../../../.github/workflows/app-frontend-cypress.yml) runs them in CI against localtest.

## Run them locally

Run these from `src/App/frontend`, after `yarn --immutable`. On Linux, Cypress needs the
[system packages](https://docs.cypress.io/guides/getting-started/installing-cypress#Linux-Prerequisites) it lists.

1. Start localtest with `studioctl env up`, and run `studioctl env hosts add` once so that the frontend's host name
   resolves.
2. Start the frontend with `yarn start`.
3. Start the app that the tests use, for example
   `studioctl run --dev-frontend --detach --path ../../test/apps/frontend-test`.
4. Run its tests with `yarn cy:run:localtest --spec 'test/e2e/integration/frontend-test/*.ts'`, or pick them in the
   Cypress runner with `yarn cy:open:localtest`.

`yarn cy:run` and `yarn cy:open` run the tests against the apps deployed in tt02 instead.
