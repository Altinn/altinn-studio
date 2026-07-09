# AGENTS.md — Runtime fixture (`src/Runtime/devenv`)

A Go-based **container runtime fixture** for development and tests. Its purpose is to match the runtime
environment that Studio apps and the other runtime services (`pdf3`, `operator`, …) run in, so behavior
observed locally or in tests mirrors production.

Part of the [Runtime services](../AGENTS.md). See [`README.md`](README.md).

## Working here

- Treat this as infrastructure that other services and tests depend on for a consistent environment —
  changes here can affect how those services behave under test.
- Go project: follow standard Go tooling (`go build`/`go test`) and the repo's Go conventions (handle
  errors, keep the linter bar high).
