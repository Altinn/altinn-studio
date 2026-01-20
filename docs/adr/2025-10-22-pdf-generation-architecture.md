# Adopt two-tier Go-based PDF generation architecture

- Status: Accepted
- Deciders: Team
- Date: 20.01.2026 (largely implemented in 22.10.2025)

## Result

A1: Implement a two-tier Go-based PDF generation system with separate proxy and worker tiers, replacing the Browserless solution.

## Problem context

The previous PDF generation solution had critical architectural limitations that prevented updates and scalability:

1. **Tight coupling to browserless image**: Apps communicated directly with the Browserless container. The solution was locked to an old version of the Browserless Docker image due to API breaking changes. Upgrading would break all tenant apps using the PDF generation API, which we don't own and can't update.

2. **Inability to scale independently**: There was no separation between routing/gateway concerns and the resource-intensive PDF generation workload, preventing independent scaling.

3. **Resource inefficiency**: The Browserless-based implementation was very inefficient. This is critical when deploying to 100+ Kubernetes clusters across multiple environments (tt02, at22, at23, at24, prod, yt01).

The platform hosts PDF generation services in over 100 tenant clusters simultaneously, making resource consumption an important driver.

## Decision drivers

- D1: Resource efficiency for 100+ cluster deployments
  - Minimize memory footprint per instance
  - Reduce container image size for faster deployments
  - Lower baseline CPU usage
- D2: Independent scalability of API gateway vs PDF generation
  - Scale lightweight proxy independently from resource-intensive workers
  - Different autoscaling policies for each tier
- D3: Decoupling from browserless API to enable updates
  - Control the Chrome DevTools Protocol integration directly
  - No vendor lock-in to external API contracts
  - Enable continuous updates without breaking tenant apps
- D4: Fault isolation between tiers
  - Browser crashes isolated to worker pods
  - Proxy tier remains stable for retry logic
  - Session recycling without service disruption
- D5: Simplicity and maintainability
  - Straightforward architecture without unnecessary complexity
  - Clear separation of concerns
  - Direct Chrome DevTools Protocol integration without abstraction layers
- D7: Cost allocation and billing
  - Platform costs must be allocatable to specific tenants
  - Resource usage tracking per tenant cluster
  - Migration path from existing deployment model
- D8: Stability and predictability of PDF output
  - PDF format and rendering must remain stable across updates
  - Full control over Chrome DevTools Protocol usage
  - Minimize risk of unintended changes from library updates
  - Comprehensive testing to verify output stability
  - Service owners are very sensitive visual differences in PDF output
- D9: Security and isolation between requests
  - User cookies (Altinn login cookies) must not leak between PDF generation requests
  - Proper cleanup and isolation between requests
  - Verified through automated testing

## Alternatives considered

- A1: Two-tier Go-based solution in tenant clusters (chosen)
- A2: .NET solution with improvements
- A3: Upgrade existing browserless-based solution in-place
- A4: Centralized pool in platform cluster only

## Pros and cons

### A1: Two-tier Go-based solution in tenant clusters

- Good, because Go provides significant resource efficiency compared to .NET NativeAOT (D1)
  - Baseline comparison shows ~5x memory efficiency for simple HTTP services (see ADR 2025-10-17-using-go.md)
  - Actual memory efficiency for PDF proxy workload may differ from baseline
  - Image size: Go baseline shows ~5x smaller images (8MB vs 44MB for simple service)
  - Critical for 100+ deployments where resource savings compound
- Good, because proxy and worker tiers scale independently (D2)
- Good, because direct Chrome DevTools Protocol control eliminates browserless dependency (D3)
  - Custom CDP implementation in `internal/cdp/`
  - Full control over Page.printToPDF parameters and browser lifecycle
  - No API version lock-in or breaking changes from external vendors
  - Updates isolated to internal implementation
- Good, because fault isolation is comprehensive (D4)
  - Worker crashes don't affect proxy availability
  - Proxy implements retry logic (up to 40 retries over 10s) for worker 429 responses
- Good, because architecture is simple and well-bounded (D5)
  - Clear separation: proxy handles HTTP/retry logic, worker handles PDF generation
  - Queue-based backpressure via HTTP 429 responses
  - Simple HTTP communication and round robin load balancing
- Good, because custom CDP implementation provides full control and stability (D8)
  - Direct WebSocket communication with Chrome debug port
  - Full control over Page.printToPDF parameters and defaults
  - No dependency on third-party CDP library APIs (chromedp, gorod) which can be cumbersome
  - Eliminates supply chain risks from external dependencies
  - Prevents unintended PDF format changes from library updates
  - Aligned goals: library flexibility vs our need for stability
  - Still leverages chromedp's headless-shell base image (browser binary only, not library)
- Good, because tenant-hosted deployment simplifies cost allocation and billing (D7)
  - Work performed in tenant cluster makes cost attribution straightforward
  - Simplified migration path from old solution (same deployment model)
- OK, some risk in reusing browser instances, but lots of mitigations in place (D9)
  - Comprehensive cleanup between requests (navigate to about:blank, clear storage/cookies/cache/history)
  - Single browser session/userdata per worker prevents cross-contamination
  - Verified through automated tests (cookie isolation tests in test/integration/simple/)
- Bad, because it introduces Go as a second language to the runtime stack
  - Cannot share domain models with .NET control plane (offset by limited domain logic in PDF generation), unclear if there is any potential for shared model for this use-case
  - Requires Go competence in the team (somewhat offset by Go's simplicity and stability, see ADR 2025-10-17-using-go.md)

### A2: .NET solution with improvements

- Good, because it maintains single-language stack
  - Could share domain models and libraries with control plane, though that seems unlikely for this use-case
  - Existing .NET competence
  - Single set of CI/CD tooling
- Bad, because resource consumption remains ~5x higher than Go (D1)
  - Baseline memory: ~11Mi (NativeAOT) vs 2Mi (Go) as an absolute lower bound/baseline,
  - It is doubtful NativeAOT would work in a more complicated app, as there is still varying degrees of support and API comatibility for Native AOT, some risks here
  - Over 100 deployments: differences in memory usage would compound
  - Higher cost and slower deployments
  - Larger images
- Good, with a similar architecture as A1 those benefits still apply

### A3: Upgrade existing solution in-place

- Good, because minimal code changes required initially
  - Update to newer browserless version
  - Adjust API contracts as needed
- Bad, because it breaks all existing tenant apps using the PDF API (D3)
  - API breaking changes propagate to 100+ deployments immediately
  - Requires coordinated update across all tenant apps that we don't own and can't update
  - High risk and coordination cost
- Bad, because architectural limitations persist (D1, D2, D4)
  - Still coupled architecture preventing independent scaling
  - Resource inefficiency continues
  - Limited fault isolation
- Bad, because browserless dependency continues (D3)
  - Still vulnerable to future breaking changes
  - No control over update cycles

### A4: Centralized pool in platform cluster only

- Good, because it simplifies infrastructure management
  - Single deployment to manage and monitor
  - Centralized scaling and resource allocation
  - Reduced operational complexity
- Good, because it could enable better resource utilization (D1)
  - Shared pool across all tenants
  - Better handling of bursty traffic patterns
- Bad, because cost allocation becomes complex (D7)
  - Difficult to attribute platform costs to specific tenants
  - Requires custom metering and billing infrastructure
  - Breaking change from existing deployment model
- Bad, because it increases migration complexity
  - Requires coordinating changes across all tenant deployments
  - Changes routing patterns from existing solution
  - Higher risk migration path
- Bad, because it creates a single point of failure
  - Platform cluster issues affect all tenants
  - Less fault isolation compared to distributed model

Note: A centralized fallback pool is being considered as a supplement (not replacement) for burst traffic handling in issue #2447.

## Technical architecture overview

The PDF3 solution implements a two-tier architecture with clear separation of concerns:

### Proxy Tier

Entry point: `cmd/proxy/main.go`

- Lightweight HTTP gateway on port 5030
- Validates incoming PDF requests
- Implements retry logic: up to 40 retries with 250ms delay on HTTP 429 (queue full) responses = 10 second total retry window
- Routes requests to worker tier via `http://pdf3-worker:80`
- Graceful shutdown: 5s readiness drain + 45s shutdown period + 3s hard shutdown

Deployment configuration (`infra/kustomize/base/proxy.yaml`):
- 3-12 replicas (HPA based on 50% CPU utilization)

### Worker Tier

Entry point: `cmd/worker/main.go`

- PDF generator on port 5031 with headless Chrome instance
- Each worker pod manages exactly 1 browser session (1:1 mapping), due to limited concurrency without blowing up latencies (CPU-intensive)
- Browser lifecycle: 30-minute session recycling via `PDF3_BROWSER_RESTART_INTERVAL`
  - Rationale: Chrome doesn't aggressively deallocate memory; 30min balances hot/ready sessions vs bounded memory increase over time
- Stateless request handling with comprehensive cleanup between requests (D9):
  - Navigate to `about:blank`
  - Clear storage, cookies, cache, navigation history
  - Batched CDP commands for efficiency
  - Critical security measure: prevents cookie leakage between requests
  - Handles user authentication cookies (Altinn login cookies) safely
- Returns HTTP 429 when queue is full (configurable via `PDF3_QUEUE_SIZE`, defaults to unbuffered)
- Request timeout: 30 seconds per PDF generation with 5s buffer = 35s total

Deployment configuration (`infra/kustomize/base/worker.yaml`):
- 3-50 replicas (HPA based on 40% CPU utilization, aggressively scaling due to limited ability to do concurrent generation))
- 500m CPU, 1Gi RAM requests - headless-shell will happily occupy ~1vcpu, but chose a midpoint here as we are not generating all the time
- 512Mi memory-backed tmpfs for Chrome temporary files (userdata)

### Communication Protocol

HTTP chosen for:
- Simplicity in protocol and tooling requirements
- Easier load balancing with standard Kubernetes services

Only proxy is reachable from outside the namespace (k8s network policy)

### Chrome Integration

Core implementation: `internal/generator/browser_session.go`

- Base image: `chromedp/headless-shell:stable` with Microsoft Core Fonts (for compatibility with previous container)
- Chrome DevTools Protocol via WebSocket to browser debug port
- Custom CDP client: `internal/cdp/transport.go`

PDF generation workflow:
1. Set cookies (if provided)
2. Navigate to URL
3. Wait for element/timeout (if WaitFor specified)
4. Call Page.printToPDF via CDP
  4.1. Return response
5. Cleanup: Batched CDP commands for efficiency

### Testing Strategy

The solution emphasizes comprehensive testing to ensure stability and predictability of PDF output (D8):

**End-to-end integration tests** (`test/integration/`):
- Simple tests: Core PDF generation, WaitFor conditions, error handling, cookies
- Cookie isolation tests: Verify cookies don't leak between requests (D9)
- Smoke tests: Basic health and functionality verification
- Tests run against Kind cluster with full deployment
- Test logs captured to `test/logs/` for debugging

**Snapshot testing**:
- Deterministic PDF output verification using `_snapshots/` directories
- Compares generated PDFs against known-good snapshots
- Detects unintended changes from Chrome/headless-shell version updates
- Test output JSON snapshots track browser errors and console logs
- Ensures stability of PDF format and rendering across updates

**Load testing** (`test/load/`):
- k6-based load tests for local and remote environments
- Validates autoscaling behavior and performance characteristics
- Tests backpressure mechanisms (429 responses) under load

**Test infrastructure**:
- Test harness (`test/harness/`) provides utilities for PDF validation and snapshot management
- Jumpbox proxy for accessing test services in Kind cluster
- Test server deployed in cluster for serving test HTML content

This testing approach directly addresses the need for stable, predictable PDF output even as the underlying browser version evolves.

### Request Flow

```
Client → Proxy:5030 (/pdf)
    ↓ Validation (URL, format, waitFor, cookies)
    ↓ HTTP forward to Worker:5031 (/generate)
    ↓ [Retry up to 40 times on 429 with 250ms backoff]
        ↓ Worker attempts enqueue to session queue
        ↓ [429 if queue full]
        ↓ Session processing (30s max timeout)
        ↓ Return PDF bytes or error
    ↓ [If 429: retry with backoff]
    ↓ Proxy returns PDF to Client or error
```

## Related

- Issue #16257: Original problem identification (old PDF solution architectural issues)
- PR #16290: Implementation merged on 22.10.2025
- Issue #2447: Future improvements
  - KEDA-based autoscaling with better metrics (queue depth vs CPU)
  - Centralized fallback pool in platform cluster for burst traffic
  - Batch generation API for multiple PDFs per instance
- ADR 2025-10-17-using-go.md: Rationale for adopting Go for cloud-native runtime services
