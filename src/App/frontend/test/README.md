# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for app frontend that is running locally.

## Getting Started

These instructions will get you run the integration tests on altinn-app-frontend.

### Install dependencies / prerequisites

This is only needed the first time, or when dependencies are updated:

```cmd
yarn --immutable
```

Please refer to [Linux Prerequisites](https://docs.cypress.io/guides/getting-started/installing-cypress#Linux-Prerequisites) to run Cypress on Linux/Wsl.

### Running tests against a remote environment

1. Start your local development server for `app-frontend-react`:

```cmd
yarn start
```

2. Run the tests against a remote environment:

```cmd
npx cypress run --env environment=tt02 -s 'test/e2e/integration/*/*.ts'
```

### Running tests locally

1. Clone [app-localtest](https://github.com/Altinn/app-localtest) and follow the [instructions in the README](https://github.com/Altinn/app-localtest/blob/main/README.md) to start the local environment.

1. Clone one or more of the apps we've made automatic tests for:

- [ttd/anonymous-stateless-app](https://dev.altinn.studio/repos/ttd/anonymous-stateless-app)
- [ttd/component-library](https://altinn.studio/repos/ttd/component-library.git)
- [ttd/expression-validation-test](https://dev.altinn.studio/repos/ttd/expression-validation-test)
- [ttd/frontend-test](https://dev.altinn.studio/repos/ttd/frontend-test)
- [ttd/multiple-datamodels-test](https://dev.altinn.studio/repos/ttd/multiple-datamodels-test)
- [ttd/navigation-test-subform](https://dev.altinn.studio/repos/ttd/navigation-test-subform)
- [ttd/payment-test](https://dev.altinn.studio/repos/ttd/payment-test)
- [ttd/service-task](https://altinn.studio/repos/ttd/service-task)
- [ttd/signering-brukerstyrt](https://altinn.studio/repos/ttd/signering-brukerstyrt)
- [ttd/signing-test](https://dev.altinn.studio/repos/ttd/signing-test)
- [ttd/stateless-app](https://dev.altinn.studio/repos/ttd/stateless-app)
- [ttd/subform-test](https://dev.altinn.studio/repos/ttd/subform-test)

3. Start the app you want to test:

```cmd
cd <app-folder>/App
dotnet run
```

4. Start the tests for a given app:

If you ran app-localtest with Docker:

```cmd
npx cypress run --env environment=docker -s 'test/e2e/integration/frontend-test/*.ts'
```

If you ran app-localtest with podman:

```cmd
npx cypress run --env environment=podman -s 'test/e2e/integration/frontend-test/*.ts'
```

5. Stop the running app (using `Ctrl+C` in the terminal where it's running) and
   repeat step 3 and 4 for the next app you want to test.

### Running a single test/opening the Cypress runner

To run a single test case, open the Cypress runner using:

```cmd
npx cypress open --env environment=<environment>
```

Then click on the test you want to run.

**Tip:** Most test files contain multiple test cases. You can run a single test case
by adding `.only` to the `it` function in the test file. Be sure not to commit
this change.

```diff
- it('should do something', () => {
+ it.only('should do something', () => {
```
