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

## Playwright pilot

[e2e/playwright](e2e/playwright) holds a Playwright port of five Cypress specs: the four in
`anonymous-stateless-app` and `frontend-test/validation.ts`. It is a pilot to compare the two tools, and the Cypress
specs stay as they are. The tests use the same page objects, fixtures and test users as the Cypress tests.
[app-frontend-playwright-pilot.yaml](../../../../.github/workflows/app-frontend-playwright-pilot.yaml) runs them in
CI on a schedule, and on pull requests that change the pilot.

To run them, start localtest, the frontend and the apps `anonymous-stateless-app` and `frontend-test` as for Cypress,
and run `yarn pw:run:localtest`, or `yarn pw:open:localtest` to follow the tests in Playwright's UI mode. Playwright
uses the Chrome in `CHROME_PATH`, or the installed Chrome when it is not set, so it needs no browser download.

The Cypress commands the specs use are ported to plain functions in [helpers](e2e/playwright/helpers), which take
the page as their first argument. [testExtend.ts](e2e/playwright/extenders/testExtend.ts) adds what Cypress does
for every test in `support/index.ts`: it fails a test when the app writes an unexpected console message, and checks
after the test that the app saved its data and shows no error.
