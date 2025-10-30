## Health utility

Utility for running health checks across clusters (that the logged in user has access to).

- Must have `az` CLI installed, logged into ai-dev account (that has access to relevant env)
- Must have `kubectl` CLI installed (this tool will fetch creds for you if you don't have them)
- Must have Go 1.25 installed

```sh
# Run this to trigger prompt for az cli extension installation
# We use graph query to more efficiently query available clusters
az graph query -h
```

### Usage

```sh
$ make help
Usage: make [target]

Available targets:
  help            Show this help message
  build           Build all packages

CLI usage:
usage: go run cmd/main.go <command> [arguments]

Available commands:
  help            Print CLI usage
  init            Discover clusters and configure credentials
  status          Check status of resources across clusters
  set-weight      Update HTTPRoute weights
  exec            Execute kubectl/helm/flux commands across clusters

Examples:
  # Discover clusters and fetch credentials (single or multiple environments)
  go run cmd/main.go init tt02
  go run cmd/main.go init at22,at24
  go run cmd/main.go init -s ttd tt02,prod

  # Check resource status
  go run cmd/main.go status tt02 hr traefik/altinn-traefik
  go run cmd/main.go status tt02 ks runtime-pdf3/pdf3-app
  go run cmd/main.go status at22,at24 dep runtime-pdf3/pdf3-proxy
  go run cmd/main.go status -s ttd tt02,prod ks runtime-pdf3/pdf3-app

  # Update HTTPRoute weights
  go run cmd/main.go set-weight tt02 pdf/pdf3-migration 50 50
  go run cmd/main.go set-weight at22,at24 pdf/pdf3-migration 0 100
  go run cmd/main.go set-weight --dry-run tt02,prod pdf/pdf3-migration 0 100

  # Execute commands across clusters
  go run cmd/main.go exec tt02 kubectl get pods -n default
  go run cmd/main.go exec at22,at24 flux get kustomizations -A
  go run cmd/main.go exec -s ttd prod,tt02 helm list -A

Run 'go run cmd/main.go <command> -h' for more information on a specific command.
```
