# Kind cross-node test report

Date: 2026-07-25 UTC
Revision: `ff8b91b76bc1da26099461740aac0cf70814e01f`

## Result

PASS. The focused `cnpgsync` ordered Ginkgo test completed in 124.284 seconds: 11 passed, 0 failed, and the 10 specs outside the focus were skipped. Its final database check returned `DbCheck succeeded, result: 1`.

This demonstrates working cross-node traffic in this NVT environment. The test application was `10.244.3.3` on `runtime-fixture-kind-standard-worker`, while PostgreSQL was `10.244.2.7` on `runtime-fixture-kind-standard-worker3`. The request entered through port 8020/Traefik, reached the application, and the application connected through the CNPG service to PostgreSQL on another worker.

## Test selected

The repository documents `make test-e2e` and the tester's `start standard` workflow in `CONTRIBUTING.md` and `Makefile`. Running `make test-e2e` would run the full suite and create the minimal fixture, so the standard fixture was started through the same repository tester and `go test` was focused on the single ordered `cnpgsync` test container.

`cnpgsync` is representative because it exercises the operator, Flux/Helm, secrets, Kubernetes services, ingress, and a real PostgreSQL query. The ordered container has 11 dependent specs; focusing more narrowly on only the last `It` would skip its required provisioning steps.

## Exact commands run

Run from the repository root unless a `cd` is shown:

```sh
git fetch upstream main
git switch -c test/19624-kind-cross-node upstream/main
mise install go@1.26.4 kubectl@1.35.0

cd src/Runtime/operator/test
mise exec go@1.26.4 kubectl@1.35.0 -- go run ./cmd/tester start standard

cd ..
mise exec kubectl@1.35.0 -- kubectl config current-context
mise exec kubectl@1.35.0 -- kubectl get nodes -o wide
mise exec kubectl@1.35.0 -- kubectl get pods -A -o wide

cd test
mise exec go@1.26.4 kubectl@1.35.0 -- go test -tags=e2e ./e2e/ -v -ginkgo.v -ginkgo.focus='cnpgsync'

cd ..
mise exec kubectl@1.35.0 -- kubectl get pods -A -o wide
mise exec kubectl@1.35.0 -- kubectl get events -A --field-selector type=Warning --sort-by=.lastTimestamp
mise exec kubectl@1.35.0 -- kubectl get cluster -A
mise exec kubectl@1.35.0 -- kubectl get database -A
docker ps --filter 'name=runtime-fixture-kind-standard' --format 'table {{.Names}}\t{{.Status}}\t{{.Networks}}'
cat /root/.nvt-agent/egress.json
for pod in $(mise exec kubectl@1.35.0 -- kubectl -n kube-system get pods -l k8s-app=kindnet -o name); do mise exec kubectl@1.35.0 -- kubectl -n kube-system logs "$pod" --tail=20 --prefix; done
mise exec kubectl@1.35.0 -- kubectl -n runtime-cnpg logs pg-apps-cluster-1 --tail=30 --prefix
mise exec kubectl@1.35.0 -- kubectl -n runtime-operator logs deploy/operator-controller-manager -c manager --tail=30 --prefix
uname -a
systemd-detect-virt
rg -m 8 '^(vendor_id|model name|flags|Hypervisor vendor)' /proc/cpuinfo
mise exec go@1.26.4 -- go version
mise exec kubectl@1.35.0 -- kubectl version --client
docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
```

The fixture was then removed with:

```sh
cd test
mise exec go@1.26.4 kubectl@1.35.0 -- go run ./cmd/tester stop
```

## Steps and diagnostics

- Tool setup passed: Go 1.26.4 and kubectl 1.35.0 were installed with `mise`. Docker client/server versions were 29.6.1-1/27.5.1.
- Standard fixture setup passed in 16m55.79s. All four kind containers (one control plane and three workers) were running, and Kubernetes reported all nodes `Ready` at v1.35.0.
- The focused test passed all 11 dependent `cnpgsync` specs. The CNPG cluster reported one ready instance and `Cluster in healthy state`; `db-localtestapp` reported `APPLIED=true`.
- The final query passed across node and pod CIDR boundaries: application `10.244.3.3` (`10.244.3.0/24`, worker) to PostgreSQL `10.244.2.7` (`10.244.2.0/24`, worker3).
- Kindnet logs on all four nodes continuously listed the other node IPs and pod CIDRs (`10.244.0.0/24` through `10.244.3.0/24`). No kindnet error was present in the inspected tails.
- PostgreSQL logs showed the database becoming ready and the application database being reconciled. Operator logs showed the database creation and connection secret update.
- Warning events included transient scheduling, mount, and readiness/liveness probe failures during startup. Every inspected pod was `Running` with zero restarts after the test. Operator telemetry export logged zero-address/time-out errors because no local telemetry collector was configured; controller reconciliation and the test were unaffected.
- NVT egress configuration reported `mode: mediated` and `transport: transparent`. Required Go modules and container images from Docker Hub, GCR, GHCR, and Kubernetes registries were downloaded successfully. No NVT denial or captured egress failure was observed.

## Root cause / hypothesis

There was no cross-node failure to diagnose. The evidence supports that kindnet routing and Kubernetes service forwarding work between distinct kind worker containers in the current NVT environment. The relatively slow first setup was attributable to cold downloads, image extraction, and image compilation; it completed without retrying the workflow or changing network settings.

## Limitations and workarounds

- This verifies one application-to-database path in one standard kind cluster, not every protocol or long-duration network behavior.
- `systemd-detect-virt` reported `docker`; the host kernel was `6.6.137.mshv1-1.azl3`, and CPU flags included `hypervisor`. These indicate nested container execution on a virtualized host but do not independently prove the outer Kubernetes RuntimeClass. Kata/RuntimeClass must be verified from the external orchestrator.
- No product code was changed. No test/network workaround was attempted. The full suite was intentionally not run.
