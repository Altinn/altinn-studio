# AGENTS.md

This file provides guidance to AI agents when working with code for this project.

## Overview

### Common Commands

All orchestration commands use the Makefile, which internally calls `go run ./cmd/tester`:

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
