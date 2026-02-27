# Kubernetes Wrapper

Go service exposing Kubernetes Deployments and DaemonSets through a REST API.

## Endpoints

- `GET /api/v1/deployments`
- `GET /api/v1/daemonsets`

Optional query parameters for both endpoints:

- `labelSelector`
- `fieldSelector`

Supported field selector keys:

- `metadata.name`
- `metadata.namespace`

## Development

Run checks locally:

```shell
make check
```

`make test` uses `envtest` and runs in-process integration tests with snapshot assertions for both APIs.
