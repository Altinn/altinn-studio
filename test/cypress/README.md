# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for app frontend that is running locally.

## Getting Started

These instructions will get you run the integration tests on altinn-app-frontend.

### Install dependencies

```cmd
    yarn --immutable # only needed first time, or when dependencies are updated
```
### Test data prerequisite

For running the test against test environments like AT, TT02, test user has to be created.

Create a new file name `cypress.env.json` under `test\cypress` with the data created above.

```json
{
  "testUserName": "",
  "testUserPwd": ""
}
```
### Run App Frontend tests

Follow the steps below to start localtest, app frontend, app and the tests.

**Note:** Use cmd or git bash to run the scripts.

1. Create testfiles that are used by the tests as attachments in app instances.

```cmd
    yarn run create:testfiles # only needed first time, or when files are deleted from e2e/fixtures
```

2. Clone the app (frontend-test, stateless-app) to be tested and update config in `package.json` with the paths.

3. Start localtest, app frontend, app. (Hop over to step 4 if the solutions are already running)

```cmd
    yarn run before:appfrontend
```

If one has the frontend dependencies installed from before, run the below command.

```cmd
    yarn run before:appfrontend-no-deps
```

4. Start the app frontend tests from a new git bash terminal.

```cmd
    yarn run test:appfrontend -e environment=local
```

To run the tests towards AT21, an altinn user credential has to be supplied [here](../cypress#test-data-prerequisite).

```cmd
    yarn run test:appfrontend -e environment=at21
```

5. To run a single test case open cypress runner using

```cmd
    yarn run cy:open -e environment=local
```

### Format files with prettier

```cmd
    yarn run prettier:check # For checking the files deviating standards
    yarn run prettier:format # format and save the files based on config
```
