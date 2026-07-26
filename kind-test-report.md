# Runtime operator kind test report

Date: 2026-07-26

Base commit: `ff8b91b76bc1da26099461740aac0cf70814e01f`

## Workflow scope

`.github/workflows/runtime-operator-build.yml` defines the kind-based `test-e2e`
job. From `src/Runtime/operator`, its repository commands are, in order:

```sh
make start
make test-e2e
```

Both commands were run sequentially. The full suite was rerun after installing a
missing runner prerequisite; no test was left unrun.

## Commands run

Tool and environment setup:

```sh
mise install go@1.26.4
nvt-as-root apt-get update -qq
nvt-as-root apt-get install -y -qq strace
curl -fsSLo /tmp/kubectl-1.35.0 https://dl.k8s.io/release/v1.35.0/bin/linux/amd64/kubectl
curl -fsSLo /tmp/kubectl-1.35.0.sha256 https://dl.k8s.io/release/v1.35.0/bin/linux/amd64/kubectl.sha256
printf '%s  %s\n' "$(cat /tmp/kubectl-1.35.0.sha256)" /tmp/kubectl-1.35.0 | sha256sum --check
nvt-as-root install -m 0755 /tmp/kubectl-1.35.0 /usr/local/bin/kubectl
```

Workflow commands (the Go `PATH` export supplies the module-pinned toolchain):

```sh
export PATH="/root/.local/share/mise/installs/go/1.26.4/bin:$PATH"
make start
make test-e2e
make test-e2e  # rerun after installing kubectl
```

Relevant diagnostics:

```sh
go version
kubectl version --client=true
strace --version
docker version
docker info
uname -a
free -h
df -h /workspace
docker ps -a
docker events --since 10m --until 0s --filter type=container
ps -o pid,ppid,stat,wchan:30,etime,args -p <build-process-pids>
timeout 5 strace -f -tt -e trace=poll,ppoll,select,pselect6,epoll_wait,futex -p <matched-process-pid>
docker exec runtime-fixture-kind-minimal-control-plane kubectl get nodes -o wide
docker exec runtime-fixture-kind-minimal-control-plane kubectl get pods -A
```

## Results

| Command / step | Result | Details |
| --- | --- | --- |
| `make start` | Passed | Created a two-node Kubernetes v1.35.0 kind cluster, built/published the three fixture images, and applied the runtime graph. Graph application took 16m08s. |
| First `make test-e2e` prerequisites | Passed | `manifests`, `generate`, formatting, and `go vet` completed. Runtime graph reconciliation took 35s. |
| First e2e run | Failed | 11 passed, 1 failed, and 9 skipped. All 11 CNPG specs passed. The first ordered Maskinporten spec failed before product assertions because `kubectl` was absent from `PATH`; the remaining 9 specs were skipped by Ginkgo's ordered-container behavior. |
| Second `make test-e2e` prerequisites | Passed | Same prerequisites passed; runtime graph reconciliation took 36s. |
| Second e2e run | Passed | All 21/21 specs passed in 18.123s; 0 failed, 0 skipped. |

The passing suite covered all 11 CNPG specs (namespace, storage class, Flux
resources, image catalog, cluster/database/secret reconciliation, and a
successful `SELECT 1` through the synced connection string) and all 10 ordered
Maskinporten specs (operator health, initial state, reconciliation, secret
preservation, token generation, scope removal, two JWK rotations, and both
deletion paths).

## Failure analysis and diagnostics

The initial failure was:

```text
exec: "kubectl": executable file not found in $PATH
```

This is a runner-image prerequisite failure, not a product-code or kind-network
failure. The GitHub-hosted Ubuntu runner supplies `kubectl`; this fresh NVT
container did not. Kubernetes `kubectl` v1.35.0 was checksum-verified and
installed to match the fixture's Kubernetes v1.35.0 nodes. Rerunning the exact
workflow command then passed all specs.

During the initially quiet fixture startup, the two remaining Docker BuildKit
clients were observed waiting on futexes while images compiled. A five-second
`strace` attachment succeeded but captured no useful event. No workaround was
applied to the builds, and they completed normally. Final node diagnostics
showed both `runtime-fixture-kind-minimal-control-plane` and
`runtime-fixture-kind-minimal-worker` in `Ready` state. The successful database
check and full second run provide direct evidence that the required in-cluster
paths worked. Application workloads were scheduled on the worker node, so this
run does not independently prove a workload-to-workload cross-node data path.

One non-fatal cleanup warning appeared on both e2e attempts when the suite
best-effort patched an initially absent/empty secret; the suite explicitly
ignored it and all specs passed on the complete rerun.

## Environment limits and obstacles

- Go was not preinstalled; `mise` installed module-required Go 1.26.4.
- `kubectl` was not preinstalled and caused the recorded first-run failure.
- Docker reported 2 CPUs, 8,346,697,728 bytes of memory, no swap, and the
  `overlay2` storage driver.
- Docker client 29.6.1-1 used daemon 27.5.1 on Linux
  `6.6.137.mshv1-1.azl3`.
- First-run dependency downloads and image compilation were slow: the initial
  fixture graph took 16m08s, whereas its cached reconciliations took about 35s.
- Raw logs, generated dependencies, build output, cluster secrets, and test
  artifacts are intentionally not included in this change.

No product-code changes or test-behavior workarounds were made.
