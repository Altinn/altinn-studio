# Test assets

Tests and test apps that cover more than one component. Most components keep their own tests next to their code.

- [apps](apps) has the Altinn apps that the App frontend's tests run against. The
  [Cypress tests](../App/frontend/test/README.md) have a folder for each app, with the same name.
- [K6](K6/README.md) has k6 tests for app and platform APIs. The scripts take the environment and credentials as
  parameters. The Azure Pipelines definitions in [use-cases.yaml](K6/use-cases.yaml) and
  [use-cases-prod.yaml](K6/use-cases-prod.yaml) run some of them on a schedule and pass those in.

## Test apps

Each app covers particular test scenarios. Find the tests that use an app before you change how it behaves.

The apps build against the App backend in this checkout, as [Directory.Build.props](apps/Directory.Build.props) sets
up. It does not import the App backend's build settings, so warnings in the apps never fail a build.

The C# data models in each app's `App/models` folder are what the tests use, and the `.schema.json` beside each one
describes it. When you change a model, change its schema to match. Designer can regenerate most models, but the
`ServiceModel-test` and `nested-group` models in frontend-test and the `stateless` model in stateless-app are legacy
Seres exports that its converter cannot parse, so they are maintained by hand. A regenerated model also loses the
members whose types or initializers the generator cannot emit, so check the diff.
