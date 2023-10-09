# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for app frontend that is running locally.

## Getting Started

These instructions will get you run the integration tests on altinn-app-frontend.

### Install dependencies / prerequisites

```cmd
    yarn --immutable # only needed first time, or when dependencies are updated
```

If you are running locally you need a copy of [app-localtest](https://github.com/Altinn/app-localtest). - Make sure you have followed instructions on [running apps locally](https://github.com/Altinn/app-localtest/blob/main/README.md).

### Running tests against a remote environment

1. Start your local development server for `app-frontend-react`:

```cmd
    yarn start
```

2. Run the tests against a remote environment:

```cmd
    yarn run cy:test:all -e environment=tt02
```

Other remote environments could also be used (see `e2e/config/*.json`).

### Running tests locally

1. Clone the apps (
   [ttd/frontend-test](https://dev.altinn.studio/repos/ttd/frontend-test),
   [ttd/anonymous-stateless-app](https://dev.altinn.studio/repos/ttd/anonymous-stateless-app),
   [ttd/stateless-app](https://dev.altinn.studio/repos/ttd/stateless-app),
   [ttd/signing-test](https://dev.altinn.studio/repos/ttd/signing-test), and
   [ttd/expression-validation-test](https://dev.altinn.studio/repos/ttd/expression-validation-test)
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

or

```cmd
    yarn run cy:test:signing -e environment=local
```

### Running a single test

To run a single test case open cypress runner using

```cmd
    yarn run cy:open -e environment=<environment>
```
