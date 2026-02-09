# k6 Load Tests

Load tests for the Workflow Engine using [k6](https://k6.io/).

## Prerequisites

Install k6 via Homebrew:

```bash
brew install k6
```

The workflow engine must be running locally on `http://localhost:8080` (or configure via environment variables).

## Running

From the repository root (`workflow-engine/`):

```bash
# Default: 5000 requests, 100 concurrent virtual users
k6 run .k6/stress-test.js

# Custom iteration count and concurrency
k6 run .k6/stress-test.js --env ITERATIONS=1000 --env VUS=25
```

### Environment variables

| Variable     | Default                                                         | Description                     |
|--------------|-----------------------------------------------------------------|---------------------------------|
| `ITERATIONS` | `5000`                                                          | Total number of requests        |
| `VUS`        | `100`                                                           | Concurrent virtual users        |
| `BASE_URL`   | `http://localhost:8080/api/v1/workflow/test-org/test-app/12345` | Workflow engine base URL        |
| `HEALTH_URL` | `http://localhost:8080/api/v1/health`                           | Health endpoint for queue drain |
| `API_KEY`    | `0544ba8b-2d8a-4ec9-b93a-47cdbd220293`                          | API key for authentication      |

## What it does

1. **Stress phase**: Fires `ITERATIONS` POST requests to `/next` with unique instance GUIDs, spread across `VUS` concurrent virtual users. Each request carries the standard `process-next-payload.json` from `.tools/`.
2. **Teardown**: Polls the health endpoint until the engine's queue is fully drained, reporting the drain time.
3. **Summary**: Prints latency percentiles (p50/p95/p99), throughput, and error rates.
