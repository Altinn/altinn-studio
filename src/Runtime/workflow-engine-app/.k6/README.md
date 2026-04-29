# k6 Scripts — Workflow Engine App

Load tests for the Altinn app workflow engine host using [k6](https://k6.io/). These tests use **app** commands (ProcessTaskEnd, LockTaskData, etc.) matching a real process-next workflow.

For core engine load tests (webhook commands), see `workflow-engine/.k6/`.

## Prerequisites

```bash
brew install k6
```

The workflow-engine-app must be running locally on `http://localhost:8080` (Docker Compose: `docker compose --profile app up`).

## Scripts

All scripts share the same interface and environment variables as the core engine scripts — see [`workflow-engine/.k6/README.md`](../workflow-engine/.k6/README.md) for full documentation.

### stress-test.js

```bash
k6 run .k6/stress-test.js
k6 run .k6/stress-test.js -e ITERATIONS=1000 -e VUS=25
```

### continuous-process-next.js

```bash
k6 run .k6/continuous-process-next.js
k6 run .k6/continuous-process-next.js -e INTERVAL=5
```

### constant-rate.js

```bash
k6 run .k6/constant-rate.js
k6 run .k6/constant-rate.js -e RATE=50
```

## Payload

Scripts use `payloads/process-next.json` — an 11-step app command workflow matching the Altinn process-next flow. The `idempotencyKey` and `correlationId` headers are generated with unique values per request at runtime.

## Shared Library

Test scripts import shared utilities from `workflow-engine/.k6/lib/helpers.js` (payload building, health polling, summary formatting).
