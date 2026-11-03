# Workflow Engine App load tests

These [k6](https://k6.io/) scripts enqueue the 11-step process-next workflow of app commands in
[`payloads/process-next.json`](payloads/process-next.json) against this host. Start the host with `make run`, then run
a script from `src/Runtime/workflow-engine-app`:

```bash
k6 run .k6/stress-test.js -e ITERATIONS=1000 -e VUS=25
```

The scripts use the engine's shared library and environment variables, which the
[engine's load tests](../../workflow-engine/.k6/README.md) describe.
