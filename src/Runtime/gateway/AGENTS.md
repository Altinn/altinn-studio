# AGENTS.md

This file provides guidance to AI agents when working with code for this project.

## Overview

### Common Commands

All orchestration commands use the Makefile, which internally calls `go run ./cmd/tester` from the nested `test` module:

```bash
# Development workflow
make build                # Build Go packages and .NET solution
make lint                 # Run linters (Roslyn analyzers + golangci-lint)
make lint-fix             # Run Go linters with auto-fix
make fmt                  # Format code (CSharpier + golangci-lint)
make tidy                 # Tidy go modules

# Testing
make test                 # Run unit tests (none yet)
make test-e2e             # Run e2e tests (starts cluster if needed)

# Utilities
make clean                # Clean build artifacts and cache
```

### Go Module

- Gateway runtime code is .NET; Go is only used for local/test orchestration.
- Root `go.mod` is intentionally dependency-free.
- `test/go.mod` owns local orchestration dependencies such as `altinn.studio/devenv`, Kind, Flux, Helm and Docker SDKs.
- Keep local/dev/test-only Go code under `test/` unless runtime code actually needs the dependency.
