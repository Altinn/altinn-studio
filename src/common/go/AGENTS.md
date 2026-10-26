# AGENTS.md — Shared Go code (`src/common/go`)

The Go module `altinn.studio/common`, for code that Go services in several product areas share. See
[`src/common/AGENTS.md`](../AGENTS.md) for what belongs in `src/common`.

| Package          | What it contains                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `telemetry`      | OpenTelemetry setup per the observability standards ([#21073](https://github.com/Altinn/altinn-studio/issues/21073)): the resource, `service.instance.id` and `altinn.workload.start_time`, export settings, the WARN floor for exported logs, `SetError`. |
| `telemetry/attr` | The shared Altinn vocabulary: attribute names for concepts several services report, such as `altinn.service_owner` and `altinn.app`.                                                                                                                       |

## Consumers

pdf3 (`src/Runtime/pdf3`) and the operator (`src/Runtime/operator`) use it. Each consumer requires `altinn.studio/common v0.0.0` and replaces it
with this directory in its `go.mod`, and so does a test module that builds the consumer
(`replace altinn.studio/common => ../../../common/go` in `pdf3/test`). A consumer's images build with
`src/` as the context and a `<Dockerfile>.dockerignore` that sends only the modules they need; its
workflows list `src/common/go/**` in their path filters.

## Working here

- Keep it to what has to be the same in every service. A service's own metric names, views,
  attributes and log bridge stay in the service.
- Keep the OpenTelemetry versions in step with the consumers'. They resolve to the highest version
  any of them requires.
- Run `make fmt lint test` here, and `make build lint test` and an image build in every consumer.
