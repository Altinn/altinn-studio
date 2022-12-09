# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for app frontend that is running locally.

## Getting Started

These instructions will get you run the integration tests on altinn-app-frontend.

### Install dependencies / prerequisites

```cmd
    yarn --immutable # only needed first time, or when dependencies are updated
```

If you are running locally you need a copy of [altinn-studio](https://github.com/altinn/altinn-studio).
    - Make sure you have followed instructions on [running apps locally](https://github.com/Altinn/altinn-studio/blob/5c05d4c32be1b24ddd5af9ddd661b2c78f65aad4/LOCALAPP.md).

### Test data prerequisite

1. For running the test against remote test environments like AT, TT02, test user has to be created. You won't need
   these if you intend to only run the tests against your local setup.

Create a new file name `cypress.env.json` in the root folder with a username and password:

```json
{
  "testUserName": "",
  "testUserPwd": ""
}
```

### Running tests against a remote environment

Be sure to supply credentials to `cypress.env.json` as described above.

1. Start your local development server for `app-frontend-react`:

```cmd
    yarn start
```

2. Run the tests against a remote environment:

```cmd
    yarn run cy:test:all -e environment=at21
```

Other remote environments could also be used (see `e2e/config/*.json`).

### Running tests locally

1. Clone the apps (
   [ttd/frontend-test](https://dev.altinn.studio/repos/ttd/frontend-test),
   [ttd/anonymous-stateless-app](https://dev.altinn.studio/repos/ttd/anonymous-stateless-app) and
   [ttd/stateless-app](https://dev.altinn.studio/repos/ttd/stateless-app)
   ) to be tested.

2. Create (or update) `.env` file with the correct paths (see `template.env`)

3. To start localtest, app frontend, and the app you configured above, run the command below.
   (Skip to step 4 if the solutions are already running). The command will not finish, but it
   will start the app-frontend server in development mode. This command may take some time,
   depending on if LocalTest has been setup earlier or not, and if the docker cache is hit or not.
   When the output of this command seems to have stopped, you can continue to the next step.

```cmd
    yarn run cy:before:appfrontend
```

4. Start the tests for a given app from a new terminal:

```cmd
    yarn run cy:test:frontend -e environment=local
```

or

```cmd
    yarn run cy:test:stateless -e environment=local
```

or

```cmd
    yarn run cy:test:stateless-anonymous -e environment=local
```

### Running a single test

To run a single test case open cypress runner using

```cmd
    yarn run cy:open -e environment=<environment>
```
