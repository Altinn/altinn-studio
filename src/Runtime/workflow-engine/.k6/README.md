# k6 Scripts — Workflow Engine (Core)

Load tests for the core workflow engine using [k6](https://k6.io/). These tests use **webhook** commands targeting WireMock.

For app-specific load tests (AppCommand), see `workflow-engine-app/.k6/`.

## Prerequisites

```bash
brew install k6
```

The workflow engine must be running locally on `http://localhost:8080` with WireMock on `http://localhost:6060` (Docker Compose provides both).

## Scripts

### stress-test.js

Fires a configurable number of requests with high concurrency, then waits for the queue to drain.

```bash
# Default: 5000 requests, 100 concurrent virtual users
k6 run .k6/stress-test.js

# Custom iteration count and concurrency
k6 run .k6/stress-test.js -e ITERATIONS=1000 -e VUS=25
```

| Variable     | Default                                              | Description                     |
| ------------ | ---------------------------------------------------- | ------------------------------- |
| `ITERATIONS` | `5000`                                               | Total number of requests        |
| `VUS`        | `100`                                                | Concurrent virtual users        |
| `NAMESPACE`  | `default`                                            | Namespace path segment          |
| `BASE_URL`   | `http://localhost:8080/api/v1/{NAMESPACE}/workflows` | Workflow engine enqueue URL     |
| `HEALTH_URL` | `http://localhost:8080/api/v1/health`                | Health endpoint for queue drain |

### constant-rate.js

Fixed request rate with a health-polling sidecar. Uses `constant-arrival-rate` so throughput stays steady regardless of response time. Runs until Ctrl+C.

```bash
k6 run .k6/constant-rate.js
k6 run .k6/constant-rate.js -e RATE=50
k6 run .k6/constant-rate.js -e RATE=500 -e MAX_VUS=1000 -e POLL_INTERVAL=5
```

| Variable        | Default                                              | Description                  |
| --------------- | ---------------------------------------------------- | ---------------------------- |
| `RATE`          | `100`                                                | Requests per second          |
| `MAX_VUS`       | `2000`                                               | Max virtual users            |
| `POLL_INTERVAL` | `2`                                                  | Seconds between health polls |
| `NAMESPACE`     | `default`                                            | Namespace path segment       |
| `BASE_URL`      | `http://localhost:8080/api/v1/{NAMESPACE}/workflows` | Workflow engine URL          |
| `HEALTH_URL`    | `http://localhost:8080/api/v1/health`                | Health endpoint              |

## Payload

Scripts use `payloads/webhook.json` — a single webhook step targeting WireMock at `http://localhost:6060/webhook-callback`. The `idempotencyKey` and `collectionKey` are replaced with unique values per request at runtime.

## Shared Library

`lib/helpers.js` contains reusable utilities (payload building, health polling, summary formatting) shared with `workflow-engine-app/.k6/` scripts.
