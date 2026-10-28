# runner-org-sync

A Kubernetes CronJob in the Studio cluster that keeps the Gitea Actions runners in step with the
[service owner registry](https://altinncdn.no/orgs/altinn-orgs.json). Each run selects the service owners with at
least one environment, limited to a list in its configuration unless `RUNNER_ORG_SYNC_SYNC_ALL` is set. For each, it
creates a Secret with a runner registration token, and it lists them in a ConfigMap. The
[gitea-org-runner](../../../charts/gitea-org-runner) chart reads that ConfigMap through Flux `valuesFrom` and renders a
KEDA `ScaledJob` per service owner.

## Credentials

| Credential                                    | Where it lives                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Gitea admin token, which mints runner tokens  | Azure Key Vault only. The CronJob reads it through Workload Identity and never stores it in Kubernetes.              |
| Runner registration token per service owner   | A Secret per service owner, which the runner Pods read.                                                              |
| Read-only Gitea token for KEDA's Gitea scaler | Azure Key Vault. The CronJob copies it to the Secret that KEDA's `TriggerAuthentication` reads, when it has changed. |

## Design constraints

- The CronJob never mints a new token for a service owner that has a Secret, so registered runners keep working.
- When a service owner leaves the selection, the CronJob deletes its Secret. Its runner records in Gitea stay and go
  idle.
- When one service owner fails, the run goes on without it, and the next run tries again. The failure shows in the
  `runner_org_sync.org.reconcile_errors` metric, not in the CronJob's exit code. Alert on that metric when it stays
  above zero.
- A failed reconciliation also exits zero so a single failed tick does not leave a failed CronJob. The run still
  records `outcome=failure` in `runner_org_sync.reconcile.runs`, an error trace and an error log. The process ends
  the trace and attempts to flush telemetry before exiting. Startup errors still exit non-zero.
- Alert on repeated failure or partial outcomes, and on missing successful reconciliation telemetry. Kubernetes Job
  completion and the CronJob's `lastSuccessfulTime` no longer prove that reconciliation succeeded. Configure these
  alerts before rolling out this behavior. OTel collection alone does not provide alerting.
- The KEDA Secret's name and key in [cronjob.yaml](infra/kustomize/base/cronjob.yaml) and
  [triggerauthentication-bearer.yaml](infra/kustomize/base/triggerauthentication-bearer.yaml), and the
  `TriggerAuthentication` name in the [chart's values](../../../charts/gitea-org-runner/values.yaml), must agree.
  Rename them together, or the KEDA scalers fail with `auth ref not found`.
- The `pat.loaded` log line names where each token came from, so a token taken from an environment variable outside
  local development shows.

## Development

`make test` and `make lint` check a change. Unit tests use only the standard library and client-go's fake client.

To run it locally without Azure, set `RUNNER_ORG_SYNC_GITEA_PAT` and `RUNNER_ORG_SYNC_KEDA_PAT` to the tokens, and the
other variables that [config.go](internal/config/config.go) requires, then run `go run ./cmd/runner-org-sync`.

No automated test covers the CronJob against a real Gitea and KEDA, or Workload Identity. Check those in a cluster.
