# Designer end-to-end tests

Playwright tests of user journeys through [Designer](../../README.md). A journey crosses pages. A test that adds a
field to a data model also checks the field on the pages that use the data model.

## Run the tests

1. Start the local stack, as [Running Designer locally](../../../development/README.md) describes.
2. From this folder, run `yarn setup:playwright`. It installs the browsers and writes `.env` with the test user and a
   Gitea access token.
3. Run `yarn test:all`, or `yarn test:ui` to follow the tests in a browser.

To test another environment, change `PLAYWRIGHT_TEST_BASE_URL` in `.env`. To run only the projects for one app
template, set `PLAYWRIGHT_APP_TEMPLATES` to `v8` or `v9`. CI runs one job for each.

## v8 and v9 apps

Each suite that creates its app through the API runs for both app templates.
[playwright.config.ts](playwright.config.ts) declares two projects over the same `testDir`. The project without a
suffix creates a v9 app, and the `-v8` project sets `testAppTemplate` to v8. When we drop v8, we delete the `-v8`
projects and rename nothing. The `appTemplates` feature flag only shows the template selector in the dashboard, so a
test that creates its app through the API needs no flag.

- Do not hard-code the default layout set, which is `form` in a v8 app and the UI folder `Task_1` in a v9 app. Use
  the `defaultLayoutSet` fixture.
- When a test cannot pass on v9 yet, skip it for v9 with `test.skip` and a reason, rather than copying the suite. In a
  suite with `mode: 'serial'`, the later tests depend on the earlier ones, so skip the whole file.
