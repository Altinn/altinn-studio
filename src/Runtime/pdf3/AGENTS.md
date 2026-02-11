# AGENTS.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

**pdf3** is a PDF generation service for Altinn Studio apps. It uses Chrome DevTools Protocol (CDP) to control headless Chrome browsers for generating PDFs from web pages.

**Architecture**: Two-tier system (proxy + worker) running in Kubernetes. Local development uses a Kind cluster.

## Development Environment

### Prerequisites

- **OS**: Linux or macOS only
- **Go**: 1.25.2 or later
- **Container runtime**: Docker or Podman

### Common Commands

All orchestration commands use the Makefile, which internally calls `go run ./cmd/tester`:

```bash
# Setup and cluster management
make start                # Start Kind cluster with minimal deployment (default)
make start-minimal        # Start with minimal variant (same as make start)
make start-standard       # Start with standard variant (used for loadtests locally)
make stop                 # Stop and delete the cluster

# Development workflow
make build                # Build Go packages locally
make fmt                  # Format code with golangci-lint
make lint                 # Run linters with auto-fix
make tidy                 # Tidy go modules

# Testing
make test                 # Run all integration tests (simple + smoke)
make test-simple          # Run simple integration tests only
make test-smoke           # Run smoke tests only
make test-loop n=10       # Run tests 10 times (flakiness check)

# Load testing
make loadtest-local       # Run k6 load tests against local cluster
make loadtest-env         # Run k6 load tests against remote environment

# Monitoring
make logs                 # Stream logs from pdf3 components using stern

# Utilities
make clean                # Clean build/test cache
make check                # Complete CI check (tidy, fmt, lint, test)
```

## Architecture

### Binaries (cmd/)

1. **cmd/proxy/main.go** - Public HTTP API (port 5030)
   - Endpoint: `POST /pdf` - accepts PDF generation requests
   - Health: `/health/startup`, `/health/ready`, `/health/live`
   - Retries on worker queue-full (429) responses
   - Forwards requests to worker via HTTP

2. **cmd/worker/main.go** - PDF generator (port 5031)
   - Endpoint: `POST /generate` - generates PDFs
   - Health: `/health/startup`, `/health/ready`, `/health/live`
   - Manages 1 browser session with Chrome CDP
   - Returns 429 when queue is full

3. **cmd/tester/main.go** - Test orchestration CLI
   - Subcommands: `start`, `stop`, `test`, `loadtest-local`, `loadtest-env`
   - Handles cluster setup, Docker builds, image pushes, Flux deployments
   - Used by Makefile for all orchestration tasks

### Key Internal Packages

- **internal/generator** - Core PDF generation using CDP
  - Manages 1 browser session, 30-second timeout
  - States: Ready → Generating → CleaningUp → Ready
  - Returns 429 (ErrQueueFull) when at capacity

- **internal/browser** - Chrome process management
  - Starts/stops headless Chrome at `/headless-shell/headless-shell`

- **internal/cdp** - Chrome DevTools Protocol client
  - WebSocket connection to browser debug port
  - CDP command/response handling

- **internal/types** - Shared types
  - `PdfRequest`, `PdfResult`, `PDFError`
  - Error types: `ErrQueueFull`, `ErrTimeout`, `ErrClientDropped`, etc.

- **internal/runtime** - Graceful shutdown coordinator
  - Signal handling (SIGTERM/SIGINT)
  - Use `host.ServerContext()` for server contexts
  - Use `host.IsShuttingDown()` in readiness probes

- **internal/testing** - Test internals mode support
  - Headers: `X-Internals-Test-Input`, `X-Internals-Test-Output`
  - Tracks browser errors and console logs

- **internal/assert** - Runtime assertions for invariant checking. Asserts should be used to catch programmer errors (e.g. invalid/unchecked assumptions about program state)
- **internal/concurrent** - Thread-safe data structures (e.g., `Map`)
- **internal/log** - Logging configuration

### Request Flow

1. Client → Proxy (`POST /pdf`)
2. Proxy validates and forwards to Worker
3. Worker queues request (returns 429 if queue full)
4. Browser session:
   - Sets cookies
   - Navigates to URL
   - Waits for element/timeout (if `waitFor` specified)
   - Calls `Page.printToPDF` via CDP
   - Returns base64-encoded PDF
   - Cleans up (navigate to `about:blank`, clear storage)
5. Worker returns PDF to Proxy
6. Proxy retries on 429 (configurable)
7. Proxy returns PDF to client

### Test Infrastructure

**Integration tests** (`test/integration/`):

- **simple/** - Main integration tests
  - Tests: PDF generation, WaitFor, console/thrown errors, cookies, old generator comparison
  - Snapshot testing with `_snapshots/` directory
  - Test server: `http://testserver.default.svc.cluster.local`
  - Jumpbox proxy: `http://localhost:8020`
- **smoke/** - Smoke tests

**Load tests** (`test/load/`):

- **test-local.ts** - k6 script for local cluster
- **test-env.js** - k6 script for remote environments

**Test harness** (`test/harness/`):

- `harness.go` - Test utilities (Init, RequestPDF, Snapshot, etc.)
- `pdf.go` - PDF validation utilities
- `snapshot.go` - Snapshot testing helpers

**Test logs**: Output to `test/logs/proxy.log` and `test/logs/worker.log`

### Deployment

**Local**: KindContainerRuntime-based fixture

**Manifests**: `infra/kustomize/`

- `base/` - Base deployment configs
- `local-minimal/`, `local-standard/` - Local variants

## Testing Strategy

**Always run integration tests after changes** to PDF generation logic.

```bash
# Recommended workflow
make start             # Start cluster (if not running)
make test              # Run all tests

# Or run specific test suites
make test-simple       # Simple tests only
make test-smoke        # Smoke tests only
```

Test logs are saved to `test/logs/` for debugging failures.
