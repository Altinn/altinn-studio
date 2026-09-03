# Get started with Playwright

Team Studio employs Playwright for end-to-end (e2e) testing. This README.md is designed to guide you through the initial setup.
It's crucial to bear in mind that each team member is responsible for keeping this README.md up-to-date. Your contributions are
highly encouraged to enhance the document and facilitate an easier onboarding process for your fellow team members.

## Test Strategy

Team Studio has decided to test various user journeys. A user journey may, for example, involve adding a field to the data model.
In such cases, the testing process should not only encompass the data model page itself, but we must also ensure that the data model
and the field are accessible on all pages integrated with the data model. This ensures a comprehensive verification that our solution
operates seamlessly across different pages. In this way, we can better ensure that things are integrated as they should be cross pages.

More documentation and examples will be added after we have written our first scenario.

## App templates (v8 and v9)

A test app is created through `POST /designer/api/repos/create-app`, which accepts an `appTemplate` id
matching one of the scaffolds under `src/App/template` (`v8` or `v9`). When the id is omitted, the backend
falls back to `GeneralSettings.DefaultAppTemplate`, which is `v8`.

A suite is run against both templates by declaring two projects over the **same** `testDir`, differing
only in which app they create and which template they create it from:

```ts
{
  name: TestNames.UI_EDITOR,
  testDir: './tests/ui-editor/',
  use: { testAppName: AppNames.UI_EDITOR_APP, testAppTemplate: AppTemplate.V9 },
},
{
  name: TestNames.UI_EDITOR_V8,
  testDir: './tests/ui-editor/',
  use: { testAppName: AppNames.UI_EDITOR_V8_APP, testAppTemplate: AppTemplate.V8 },
}
```

The unsuffixed name is always the **latest** app version, and older versions carry the suffix — the same
convention the `ux-editor` packages follow, where `ux-editor` is current and `ux-editor-v4`/`-v3` are the
older ones. When v8 support is dropped, the `-v8` projects are deleted and nothing has to be renamed.

Every suite that creates an app through the API has such a pair, so v9 gets the same coverage as v8. The
exceptions are `tests/create-app-only/`, which creates its app through the dashboard form rather than the
API, and `tests/logout/` and `tests/invalid-login/`, which do not create an app at all.

`testAppTemplate` defaults to `AppTemplate.V9` to match the unsuffixed project names. Note that the
backend default is the opposite — `GeneralSettings.DefaultAppTemplate` is still `v8` — so a project that
wants a v8 app has to set the option explicitly rather than rely on either default. The specs read the
option in `beforeAll` and pass it on:

```ts
await designerApi.createApp(request, storageState as StorageState, {
  appTemplate: testAppTemplate,
});
```

The `appTemplates` feature flag only controls whether the template selector is shown in the dashboard, so
tests that create apps through the API do not need it. The same goes for the `nextV9` flag, which only
affects which app-frontend version the version dialog recommends.

### What differs between v8 and v9 apps

A v9 app has no `layout-sets.json`. The ui folder itself is the layout set and is named after the process
task, so the default set is `Task_1` where a v8 app has `form`. This shows up both in the ui-editor URL
(`/ui-editor/layoutSet/Task_1`) and in the repository file tree in Gitea (`App/ui/Task_1/layouts`).

A test must never hard-code either name. The `defaultLayoutSet` fixture resolves it from the project's
template, so the same test body works for both:

```ts
test('...', async ({ page, testAppName, defaultLayoutSet }) => {
  await uiEditorPage.verifyUiEditorPage(defaultLayoutSet, PAGE_1);
});
```

### Marking what v9 does not support yet

When a test cannot pass on v9, skip it where it stands rather than copying the suite. Give the reason, so
the skip can be removed by whoever fixes the underlying issue:

```ts
test.skip(
  ({ testAppTemplate }) => testAppTemplate === AppTemplate.V9,
  'Renaming a text key does not update the layout files of a v9 app',
);
```

Suites configured with `mode: 'serial'` share state between tests, so skipping a single test in the middle
of the chain usually breaks the ones after it. In that case skip at file level, as `tests/text-editor/`
does today.

## Setup

To initiate test execution and writing tests, start by running the setup.js script located at the file path `/development/setup.js`.
For more information, refer to the `README.md` located at the root of the monorepo. The reason this is needed is to ensure
you have setup you local environment. If you already have a local environment up and running, you can skip this part.

After executing the mentioned `setup.js` script, you are ready to set up Playwright. Simply run `yarn setup:playwright` to generate a `.env`
file for localhost. Then, execute the tests using the following command: `yarn test:all`.

## Change Environment

If you wish to run tests against an environment other than `studio.localhost`, you can do so by modifying your `.env` file. In the `.env` file,
locate a variable named `PLAYWRIGHT_TEST_BASE_URL`, which is set to `studio.localhost` by default. It is automatically configured for you when running `yarn setup:playwright`.

## .ENV file

`.env` that is generated by the setup script looks like following:

```
PLAYWRIGHT_TEST_BASE_URL=http://studio.localhost
PLAYWRIGHT_USER=<<your-test-user-username>>
PLAYWRIGHT_PASS=<<your-test-user-password>>
PLAYWRIGHT_DESIGNER_APP_NAME=<<name-of-the-designer-app>>
GITEA_ACCESS_TOKEN=<<generated-gitea-token-by-the-setup-script>>
```

## Short Step By Step Guide

This is a short step-by-step guide with minimum needed explanation to get started.

1. Install the dependencies within this package by running y`yarn install`.
2. Install browsers and set up Playwright with local `.env` by executing `yarn setup:playwright`.
3. You are now ready to execute tests using the command `yarn test:all`.
