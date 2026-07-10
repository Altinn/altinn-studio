# AGENTS.md — Runtime fixture (`src/Runtime/devenv`)

A Go-based **container runtime fixture** for development and tests. Its purpose is to match the runtime
environment that Studio apps and the other runtime services (`pdf3`, `operator`, …) run in, so behavior
observed locally or in tests mirrors production.

Part of the [Runtime services](../AGENTS.md). Go module with `cmd/` (entry points) and `pkg/`.

## Build & run

Run from `src/Runtime/devenv` (`make help` lists all targets):

```bash
make build          # build all packages
make test           # run tests (also: test-e2e, test-race, test-coverage)
make check          # tidy + fmt + lint + test (pre-commit gate)
make run / make stop # start/stop the standard runtime-fixture container
```

## Working here

- Other services and tests depend on this for a consistent environment — a change here can alter how
  `pdf3`, `operator`, etc. behave under test. Keep it faithful to the real runtime.
