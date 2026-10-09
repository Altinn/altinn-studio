## Health utility

Run health checks and commands across Kubernetes clusters from `src/tools/health`.
Requires Go 1.26.4, `kubectl`, and `az` logged into an account with cluster access.
Run `az graph query -h` once to install the Resource Graph extension if prompted.

### Usage

```sh
go run cmd/main.go init tt02
go run cmd/main.go status -s ttd tt02,prod ks runtime-pdf3/pdf3-app
go run cmd/main.go set-weight --dry-run tt02 pdf/pdf3-migration 50 50
go run cmd/main.go exec tt02 kubectl get pods -n default
```

Use comma-separated environments and `-s OWNER` to select clusters. Run
`go run cmd/main.go help` for all commands, or `make build` to build.
`exec` shows stdout and stderr in one row per cluster, with line breaks and tabs escaped;
select specific fields for compact output.

### Initialize and refresh contexts

`init` fetches missing credentials and reports contexts absent from Azure discovery.

- `--update`: also refresh existing credentials and connection details.
- `--prune`: offer to remove contexts absent from discovery.
- `--dry-run`: preview without changing files.
- `--exclude-service-owner a,b`: exclude owners from fetching and pruning.
- `--kubeconfig PATH`: use another file instead of `$HOME/.kube/config`; its parent must exist.

For `tt02`, scope discovery to the active account: dev for `ttd`, prod for other owners.
The examples below use the `aze` account wrapper:

```sh
aze dev -- go run cmd/main.go init --prune -s ttd tt02
aze prod -- go run cmd/main.go init --prune --exclude-service-owner ttd tt02
aze prod -- go run cmd/main.go init --update -s nsm tt02
```

Missing account access can look like deleted clusters: review removals before confirming.
Pruning requires `y` or `yes`, saves a `<kubeconfig>.backup-*`, removes only unreferenced
associated cluster/user entries, and clears `current-context` if removed.
