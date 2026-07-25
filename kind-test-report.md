# Kind test report

Date: 2026-07-25 UTC

## Result

One representative Ginkgo spec was selected from the kind-based end-to-end suite:

- `controller Operator should run successfully`: **failed** in its `BeforeAll` hook.
- Ginkgo reported `0 Passed | 1 Failed | 20 Skipped` and `Ran 1 of 21 Specs`.
- The failing request was `POST http://localhost:8020/fakes/test/reset`, which returned `EOF`. The selected pod-health assertion was therefore not reached.
- The documented minimal runtime setup and teardown both succeeded. Setup took 16m8.79s on a cold cache.

## Commands run

Tools were installed with the container's available `mise` mechanism:

```sh
mise install go@1.26.4
mise install kubectl@1.35.0
mise exec go@1.26.4 kubectl@1.35.0 -- sh -c 'go version; kubectl version --client; docker version --format "client={{.Client.Version}} server={{.Server.Version}}"'
```

The documented operator workflow was used to start and stop the minimal kind runtime, with one focused spec run between them:

```sh
cd src/Runtime/operator
mise exec go@1.26.4 kubectl@1.35.0 -- make start-minimal

cd test
mise exec go@1.26.4 kubectl@1.35.0 -- go test -tags=e2e ./e2e/ -v -ginkgo.v -ginkgo.focus='controller Operator should run successfully'

cd ..
mise exec go@1.26.4 kubectl@1.35.0 -- make stop
```

Relevant diagnostic commands were:

```sh
mise exec kubectl@1.35.0 -- kubectl get pods,svc,endpoints -A -o wide
mise exec kubectl@1.35.0 -- kubectl -n runtime-operator logs -l app=fakes --all-containers --tail=200
curl -sv --max-time 10 -X POST http://localhost:8020/fakes/test/reset
curl -sv --max-time 10 -X POST http://172.31.250.2:30002/fakes/test/reset
curl -sv --max-time 10 -X POST http://172.31.250.3:30002/fakes/test/reset
docker exec runtime-fixture-kind-minimal-control-plane curl -sv --max-time 5 http://10.244.1.6:8080/ping
docker exec runtime-fixture-kind-minimal-worker curl -sv --max-time 5 http://10.244.1.6:8080/ping
mise exec kubectl@1.35.0 -- kubectl -n kube-system logs kube-proxy-rftvj --tail=200
mise exec kubectl@1.35.0 -- kubectl -n kube-system logs kube-proxy-pjrxn --tail=80
mise exec kubectl@1.35.0 -- kubectl -n kube-system logs kindnet-wrxnf --tail=200
mise exec kubectl@1.35.0 -- kubectl -n kube-system logs kindnet-wj9p8 --tail=200
```

## Best-supported root cause

The failure is in cross-node networking between the kind control-plane node and workloads on the worker node, rather than in the fakes process:

- The fakes and Traefik pods were `Running` and ready on the worker, with populated service endpoints and no restarts.
- The host mapping `localhost:8020` targets control-plane NodePort `30002`. Requests through both `localhost:8020` and `172.31.250.2:30002` connected but received an empty response.
- The same reset request through worker NodePort `172.31.250.3:30002` returned HTTP 200.
- From the control-plane container, a request to the Traefik pod at `10.244.1.6:8080` connected but received an empty response; the identical request from the worker container returned HTTP 200 and body `OK`.
- Both nodes were reported ready and both kindnet pods were ready, so the evidence points to a lower-level control-plane-to-worker datapath problem in this nested Docker environment. Kube-proxy also repeatedly reported an IPv6 iptables restore error (`MARK revision 0 not supported` / unknown `--xor-mark`), although the observed failing traffic was IPv4, so this is supporting environmental evidence rather than a proven direct cause.

## Environment limitations and obstacles

- The agent itself runs under Docker (`systemd-detect-virt` returned `docker`) on kernel `6.6.137.mshv1-1.azl3`; kind therefore ran as nested containers against the agent-local Docker daemon.
- Go and kubectl were absent initially and were installed at repository-compatible versions. Kind is used through the repository's Go library and did not require a separate CLI.
- Cold Go module downloads and three uncached image builds made setup slow; the controller and fakes builds each took about 15 minutes, but completed without resource exhaustion.
- No networking workaround, rescheduling, port-forward, manifest change, or test retry was used to turn the failure into a pass. Requests to the worker NodePort were diagnostic comparisons only.
- While checking the long initial compile, a second `make start-minimal` was accidentally invoked and immediately terminated before it created or changed runtime resources; the original invocation continued and completed normally.
