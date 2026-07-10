# AGENTS.md — Health utility (`src/tools/health`)

A Go CLI for running **health checks and operations across the Kubernetes clusters** the logged-in user
has access to. It wraps `az`, `kubectl`, `helm`, and `flux` to query and act on one or more environments
at once.

One of the standalone [tools](../AGENTS.md). Full docs: [`README.md`](README.md).

## Prerequisites

- `az` CLI, logged into an account with access to the relevant environments (uses `az graph query`).
- `kubectl` (the tool can fetch cluster creds for you).
- Go (version in `go.mod`).

## Commands

Run from `src/tools/health` (`go run cmd/main.go <command>` or `make build`):

- `init <envs>` — discover clusters and configure credentials (e.g. `init tt02`, `init at22,at24`).
- `status <envs> <kind> <ns/name>` — check resource status across clusters.
- `set-weight <envs> <route> <w1> <w2>` — update HTTPRoute traffic weights (supports `--dry-run`).
- `exec <envs> <kubectl|helm|flux ...>` — run a command across clusters.

`-s ttd` scopes to a service owner; multiple envs are comma-separated.

## Working here

- Commands act on real (including production) clusters — prefer `--dry-run` and explicit confirmation
  for mutating operations like `set-weight`.
