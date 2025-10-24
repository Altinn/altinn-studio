# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **pdf3**, a new PDF generation solution for Altinn Studio apps. It replaces the previous Browserless/Puppeteer-based implementation with a custom Chrome DevTools Protocol (CDP) implementation that directly controls headless Chrome browsers for generating PDFs from web pages.

**Key architecture**: Two-tier system with a proxy and worker components, running in Kubernetes (local development uses Kind cluster).

## Development Environment

### Prerequisites

- **OS**: Linux or macOS only
- **Container runtime**: Docker or Podman required
- **Nix**: Use `nix develop` for reproducible dev environment

### Common Commands

#### Building and Running

```bash
make build-local    # Build using local Go toolchain (fast, no Docker)
make build          # Build Docker images and load into Kind cluster (cached)
make run            # Deploy to cluster and restart services (cached)
make test           # Run integration tests (builds/deploys first)
```

#### Development Workflow

```bash
make cluster        # Create Kind cluster with all dependencies (one-time setup)
make cluster stop=1 # Delete the cluster
make format         # Format code with golangci-lint
make lint           # Run linters
make logs           # Stream logs from pdf3 components using stern
make loadtest       # Run k6 load tests
```

#### Running Single Tests

```bash
# Run all tests
go test -count=1 -v ./...

# Run specific test
go test -count=1 -v ./test/integration -run TestPDFGeneration_Simple
```

Note: `-count=1` circumvents Go's test cache, ensuring fresh test runs.

## Architecture

### Component Structure

**Two main binaries:**

1. **Proxy** (`cmd/proxy/main.go`) - Public-facing HTTP API on port 5030
   - Accepts PDF generation requests at `POST /pdf`
   - Health endpoints: `/health/startup`, `/health/ready`, `/health/live`
   - Implements retry logic for queue-full scenarios (429 responses)
   - Forwards requests to worker via HTTP

2. **Worker** (`cmd/worker/main.go`) - PDF generator on port 5031
   - Generates PDFs using Chrome DevTools Protocol
   - Health endpoints: `/health/startup`, `/health/ready`, `/health/live`
   - Handles PDF generation at `POST /generate`
   - Runs 2 browser sessions for concurrent request handling

### Key Internal Packages

- **`internal/generator`**: Core PDF generation logic using CDP
  - Manages 2 browser sessions (double-buffered for low latency)
  - Session states: Ready → Generating → CleaningUp → Ready
  - Queue capacity: 1 request per session (2 total, returns 429 when full)
  - Tracks console errors and browser errors during PDF generation

- **`internal/browser`**: Chrome browser process management
  - Starts/stops headless Chrome instances using `/headless-shell/headless-shell` binary
  - Configures browser arguments (headless mode, security flags, etc.)

- **`internal/runtime`**: Graceful shutdown coordinator
  - Handles SIGTERM/SIGINT with configurable drain periods
  - Provides contexts for server shutdown coordination
  - Use `host.ServerContext()` for server base contexts
  - Use `host.IsShuttingDown()` in readiness probes

- **`internal/cdp`**: Chrome DevTools Protocol client utilities
  - WebSocket connection management
  - CDP command/response handling
  - Connects to browser debug port for communication

- **`internal/types`**: Shared types including `PdfRequest`, `PdfResult`, `PDFError`
  - `PdfRequest.WaitFor` can be string (CSS selector), timeout (ms), or options object
  - Test internals mode support for tracking browser errors and console logs
  - Error types: `ErrQueueFull`, `ErrTimeout`, `ErrClientDropped`, `ErrSetCookieFail`, `ErrElementNotReady`, `ErrGenerationFail`, `ErrUnhandledBrowserError`

- **`internal/concurrent`**: Thread-safe data structures (e.g., `Map`)

- **`internal/assert`**: Runtime assertions for invariant checking. Asserts should be used to catch programmer errors (e.g. invalid assumptions about program state)

- **`internal/log`**: Logging setup and configuration

### Request Flow

1. Client → Proxy (`POST /pdf` with JSON body)
2. Proxy validates request and forwards to Worker via HTTP
3. Worker picks available browser session (or returns 429 if queue full)
4. Browser session:
   - Sets cookies
   - Navigates to URL
   - Waits for element/timeout (if `waitFor` specified)
   - Calls `Page.printToPDF` via CDP
   - Returns base64-encoded PDF
   - Cleans up (navigate to `about:blank`, clear storage)
5. Worker returns PDF bytes to Proxy
6. Proxy retries on 429 (up to 50 attempts with 100ms backoff)
7. Proxy returns PDF to client

### Test Infrastructure

- **Integration tests**: `test/integration/integration_test.go`
  - Requires running cluster (`make run` first, or use `make test`)
  - Uses a "jumpbox" proxy at `localhost:8020` to route requests (simulates ingress)
  - Tests include: simple generation, queue retry logic, error tracking, comparison with old generator, network isolation
  - Snapshot testing available via `test/harness` package

- **Test server**: Deployed as `testserver.default.svc.cluster.local`
  - Serves test pages with configurable behavior via query params:
    - `render=light` - renders a light version of the test page
    - `logerrors=N` - logs N console errors during rendering
    - `throwerrors=N` - throws N JavaScript errors during rendering

- **Test internals mode**: Special testing mode for tracking errors
  - Enabled via environment variable `TEST_INTERNALS_MODE`
  - Uses headers `X-Internals-Test-Input` and `X-Internals-Test-Output` for passing test data
  - Tracks console error logs and browser errors during PDF generation
  - Allows for general failure injection so that failure conditions can be tested (and their outputs)

### Deployment

- **Local**: Kind cluster with Linkerd service mesh, Traefik ingress, metrics-server
- **Kustomize**: `infra/kustomize/local/` contains deployment manifests
- **Build caching**: Makefile uses hash-based caching (`.last-build-hash`, `.last-deploy-hash`)

## Testing Strategy

**Always run integration tests after changes** to PDF generation logic, as they validate end-to-end behavior

Use `make test` which handles build/deploy automatically, or run manually:

```bash
make run  # Deploy changes
make test
```

The tests output logs from the PDF3 containers into `test/logs/proxy.log` and `test/logs/worker.log`.
These can be inspected upon test failures.
