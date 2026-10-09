# pdf3

New PDF generation solution for Altinn Studio apps.

- OS support: Linux and macOS
- Required Go 1.26.4+
- Requires `docker` or `podman` on the host system

## Local browser headless-shell installation

Some dependencies might be needed to run the headless-shell instance installed through `make browser`.
You can run `ldd <binary> | grep not` to see any dependencies the binary expects to be installed.

### Arch

These may or may not already be present, depending on env. On WSL 2 arch this is necessary:

```sh
sudo pacman -Sy nss at-spi2-core libxcomposite libxdamage libxrandr libxkbcommon mesa alsa-lib
```


## Isolated rendering and public bundle cache

Every render consumes a pristine browser context. The worker disposes it, including
popups and state on every origin, before preparing a new blank page while idle.
Preparation reduces response latency but still counts toward worker busy time.

Each browser session owns a 64 MiB LRU of anonymous public frontend JavaScript and
compiled code. Only exact numeric version URLs on `https://altinncdn.no` qualify.
Different versions have separate entries; HTTP freshness and ETag revalidation
handle changed contents, and the script SHA-256 prevents compiled code from being
reused with different bytes. App-hosted bundles, aliases, credentialed requests,
and private or uncacheable responses use ordinary browser networking.

A separate anonymous context produces compilation data from public script bytes;
user pages never contribute compiled data. The cache is discarded on browser
restart. Chrome uses `--remote-debugging-pipe` to allow compilation-cache imports
and disables `ScriptStreaming` so these imports can be consumed. A cold bundle
starts one background compilation task, which can compete with the first render.

### Worker benchmark

`test/load/worker-benchmark.py` compares two running worker containers with the
same pinned browser, config and host resources. It serves synthetic pages from
port 9341, reachable by the containers through `host.containers.internal`, and
reports response latency, complete worker busy time, first renders, PDF validity,
compilation cache size and summed process RSS. The bundle fixture loads the real
JavaScript without an app root or backend; it does not measure a complete app.

Download the bundle and run against fresh baseline and optimized containers named
`pdf3-bench-base` and `pdf3-bench-optimized`, publishing worker port 5031 as 9361
and 9362 respectively:

```sh
curl -fsSL https://altinncdn.no/toolkits/altinn-app-frontend/4.21.4/altinn-app-frontend.js -o /tmp/frontend.js
python3 test/load/worker-benchmark.py --bundle /tmp/frontend.js --wait-prepared 15 --output /tmp/pdf3-benchmark.json
python3 test/load/worker-benchmark.py --bundle /tmp/frontend.js --load-only --output /tmp/pdf3-load.json
```

Use `PDF3_ENVIRONMENT=tt02`, `PDF3_BROWSER_RESTART_INTERVAL=0` and
`OTEL_SDK_DISABLED=true` on both containers. On a host with mediated TLS, mount
its CA bundle into each container and set `STUDIO_CA_BUNDLE` to that path.
The optional fixed-arrival runs use one worker and emulate the proxy's 250 ms
retry interval, up to 40 attempts. They do not include an actual proxy hop.
`test/load/proxy-benchmark.py` instead measures fixed arrivals through the actual
Go proxy in the Kind fixture, at 2, 3 and 3.5 rps by default. Deploy each worker
image separately with the same two-worker configuration and queue/retry policy;
the client does not retry. The script serves a 500 ms page without external
resources, and `--container-origin` must point to the host address reachable by
the worker pods:

```sh
python3 test/load/proxy-benchmark.py --label base --container-origin http://10.88.0.1:9342 --output /tmp/pdf3-base-load.json
python3 test/load/proxy-benchmark.py --label optimized --container-origin http://10.88.0.1:9342 --output /tmp/pdf3-optimized-load.json
```

Raw requests and worker logs are saved alongside the worker JSON summaries. Shared-host
and external-CDN results are indicative; production app HTTPS connections and
backend work require a separate environment benchmark.
