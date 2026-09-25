# AGENTS.md — Test assets (`src/test`)

Repository-level test assets shared across suites. Two parts:

See the root [`/AGENTS.md`](../../AGENTS.md) for the wider picture. Note: most projects keep their _own_
unit/integration tests next to their code — this folder is for cross-cutting load tests and the sample
apps that E2E suites drive.

## `K6/`

[k6](https://k6.io/)-based API/load and performance tests for the platform and app APIs. Each `.js` file
under `src/` is an independent test script. Also includes Grafana dashboard/datasource definitions
(`grafana-dashboard.yaml`, `grafana-datasource.yaml`, `performance-test-dashboard.json`), a
`docker-compose.yml`, and use-case configs (`use-cases.yaml`, `use-cases-prod.yaml`). See
[`K6/README.md`](K6/README.md).

## `apps/`

A collection of **sample/fixture Altinn apps** used as targets by the E2E and frontend test suites. Each
is a full .NET app (with `App.sln` + Dockerfile), e.g. `frontend-test`, `component-library`,
`stateless-app`, `signing-test`, `payment-test`, `subform-test`, `multiple-datamodels-test`,
`service-task`, `navigation-test-subform`, and more. Shared MSBuild config lives in
`Directory.Build.props` / `global.json`.

## Working here

- Each app under `apps/` is a deliberate fixture for specific test scenarios — when adding or changing
  one, check which suite(s) depend on it before altering behavior.
- The `App/models/*.cs` files are what the suites exercise, so they are authoritative and the
  `.schema.json` beside each one describes it. Regenerating a model through the Designer changes only
  formatting, `using`s, nullable annotations, validation attributes and serialization helpers, with these
  exceptions: `frontend-test` `ServiceModel-test` and `nested-group` and `stateless-app` `stateless` are
  legacy Seres exports the current converter cannot parse, so those models are hand-maintained; and a few
  members use types the generator cannot emit (`Dates.String` and `Dates.DateOnly` in
  `component-library`, non-nullable `bool` in `datalist` and `moped`, initializers such as
  `GwTargetTask`). When a model changes, change its schema with it.
- k6 scripts target running environments; keep environment/use-case config in the `use-cases*.yaml`
  files rather than hard-coding it in scripts.
