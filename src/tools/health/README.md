# Health

Health runs checks and commands across many Kubernetes clusters at once, such as all runtime clusters in tt02 and
production. It finds the clusters through Azure Resource Graph, keeps a kubeconfig context for each, and calls
`kubectl`, `helm` and `flux` against them.

It needs Go, `kubectl`, and `az` logged in to an account with access to the clusters. Run `az graph query -h` once to
install the Resource Graph extension if `az` asks for it.

## Usage

Run `go run cmd/main.go help` from `src/tools/health` for the commands and examples, and `<command> -h` for a
command's flags. Start with `init <environments>` to fetch credentials for the clusters.

- `exec` asks before it runs a command on the clusters, and `--dry-run` only shows what it would run. It prints each
  cluster's output in one row, with line breaks and tabs escaped, so select specific fields for compact output.
- For an HTTPRoute, `status` shows each backend's weight. Git sets the weights, such as for
  [pdf3's route](../../Runtime/pdf3/README.md#dis-core).

## Refresh and prune contexts

For tt02, scope discovery to the account that is logged in: the dev account for `ttd`, and the prod account for other
owners. With the `aze` account wrapper:

```sh
aze dev -- go run cmd/main.go init --prune -s ttd tt02
aze prod -- go run cmd/main.go init --prune --exclude-service-owner ttd tt02
```

Clusters that your account cannot see look the same as deleted clusters, so review the removals before you confirm
`--prune`. It saves a `<kubeconfig>.backup-*` first, and removes only cluster and user entries that no other context
uses.
