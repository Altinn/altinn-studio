# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for app frontend that is running locally.

## Getting Started

These instructions will get you run the integration tests on altinn-app-frontend.

### Install dependencies

```cmd
    yarn --immutable # only needed first time, or when dependencies are updated
```
### Test data prerequisite

1. For running the test against remote test environments like AT, TT02, test user has to be created. You won't need
these if you intend to only run the tests against your local setup.

Create a new file name `cypress.env.json` under `test\cypress` with a username and password:

```json
{
  "testUserName": "",
  "testUserPwd": ""
}
```

2. Create test files that are used by the tests as attachments in app instances. This is only needed the first time, or
when files are deleted from `e2e/fixtures`.

**Note:** Use cmd or git bash to run the scripts.

```cmd
    yarn run create:testfiles
```

### Running tests against a remote environment

Be sure to supply credentials to `cypress.env.json` as described above.

1. Start your local development server for `app-frontend-react`:
```cmd
    yarn run start:frontend
```

If you have the frontend dependencies installed from before, run the below command:

```cmd
    yarn run start:frontend-no-deps
```

2. Run the tests against a remote environment:
```cmd
    yarn run test:all -e environment=at21
```

Other remote environments could also be used (see `e2e/config/*.json`).

### Running tests locally

1. Clone the apps (
[ttd/frontend-test](https://dev.altinn.studio/repos/ttd/frontend-test) and
[ttd/stateless-app](https://dev.altinn.studio/repos/ttd/stateless-app)
) to be tested and update config in `package.json` with the paths.

2. To start localtest, app frontend, and the app you configured above, run the command below.
(Hop over to step 3 if the solutions are already running)

```cmd
    yarn run before:appfrontend
```

If you have the frontend dependencies installed from before, run the below command:

```cmd
    yarn run before:appfrontend-no-deps
```

3. Start the tests for a given app from a new terminal:

```cmd
    yarn run test:frontend -e environment=local
```

or

```cmd
    yarn run test:stateless -e environment=local
```

### Running a single test

To run a single test case open cypress runner using

```cmd
    yarn run cy:open -e environment=<environment>
```

### Format files with prettier

```cmd
    yarn run prettier:check # For checking the files deviating standards
    yarn run prettier:format # format and save the files based on config
```
