---
name: k6
description: Run k6 load tests against the workflow engine. Use when performance testing, stress testing, or benchmarking.
---

## Prerequisites

- k6 must be installed: `brew install k6`
- The workflow engine must be running (via Docker Compose or `dotnet run`)

## Available scripts

| Script | Purpose |
|---|---|
| `.k6/stress-test.js` | Ramp-up stress test with increasing VUs |
| `.k6/continuous-process-next.js` | Continuous processing throughput test |
| `.k6/constant-rate.js` | Fixed request rate test |

## Run a script

```bash
k6 run .k6/<script-name>.js
```

## Payload

Scripts use the payload template at `.k6/process-next-payload.json`. Modify this file to change the workflow shape used in load tests.

## Tips

- Start with `constant-rate.js` at low rates to establish a baseline.
- Use `stress-test.js` to find breaking points.
- Monitor results in Grafana at `http://localhost:7070` (requires `full` Docker profile).
- k6 outputs summary statistics on completion — review p95/p99 response times and error rates.
