# Test assets

This directory holds tests and test apps that cover more than one component. Most components keep their own tests
next to their code.

- [`apps`](apps) has the Altinn apps that App frontend's tests run against.
- [`K6`](K6/README.md) has k6 tests for app and platform APIs. The Azure Pipelines definitions in
  [`use-cases.yaml`](K6/use-cases.yaml) and [`use-cases-prod.yaml`](K6/use-cases-prod.yaml) run some of them on a
  schedule and pass in the environment and credentials.

## Test apps

Each app covers particular test scenarios. Find the tests that use an app before you change how it behaves.

The apps build against the App backend in this repository, as set up in
[`apps/Directory.Build.props`](apps/Directory.Build.props). Warnings in the apps never fail a build.

The C# data models in each app's `App/models` folder are what the tests use. When you change a model, change the
`.schema.json` beside it to match. Designer can regenerate most models. A comment marks each model or member that it
cannot generate.
