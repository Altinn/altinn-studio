# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Kubernetes operator for Altinn 3, built with Go and Kubebuilder. The primary focus is managing Maskinporten clients through custom resources.

## Development Commands

### Building and Testing
```bash
make                    # Build the project
make test              # Run unit tests (no k8s required)
make lint              # Run golangci-lint
make lint-fix          # Run linter with auto-fixes
```

### Snapshot Testing
The project uses go-snaps for snapshot tests. Update snapshots with:
```bash
UPDATE_SNAPS=true make test
```

### Development Dependencies
```bash
docker compose up -d --build  # Start local fake APIs (required for `make test` to work)
```

## Architecture

### Core Components
- **MaskinportenClient CRD**: Custom resource for managing Maskinporten OAuth clients
- **Controller**: Reconciles MaskinportenClient resources with actual Maskinporten API
- **Internal packages**:
  - `maskinporten/`: HTTP client for Maskinporten API integration
  - `config/`: Configuration management using koanf
  - `telemetry/`: OpenTelemetry instrumentation
  - `caching/`: Caching mechanisms
  - `crypto/`: Cryptographic operations
  - `operatorcontext/`: Operator context management

### Directory Structure
- `api/v1alpha1/`: Kubernetes API definitions and CRD types
- `internal/controller/`: Controller reconciliation logic
- `config/`: Kubernetes manifests and Kustomize configurations
- `test/e2e/`: End-to-end tests using Ginkgo/Gomega
- `cmd/main.go`: Operator entry point

### Key Technologies
- Kubebuilder framework for operator scaffolding
- Controller-runtime for Kubernetes controller patterns
- OpenTelemetry for observability
- Azure Key Vault integration for secrets management
- Ginkgo/Gomega for testing

## Testing Strategy

- Unit tests alongside source files (`*_test.go`)
- Snapshot testing with go-snaps for API responses
- E2e tests in `test/e2e/` using Ginkgo framework
- Fake services via Docker Compose for development
