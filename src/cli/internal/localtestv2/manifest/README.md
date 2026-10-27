# The localtest-v2 manifest (v2)

`manifest.json` lists the stack's containers, the groups that select them and the public origin's defaults. studioctl's `localtest-v2` runtime
(`internal/cmd/env/localtestv2`) starts the stack from it; the file is embedded in the binary. There is no schema: the
package's test (`manifest_internal_test.go`) validates the file, and `Parse` refuses an invalid one. The folders beside
it hold the files its containers mount ([Files](#files)), which ship with it.

```json
{
    "groups": [
        { "name": "default", "containers": ["postgres", "register", "…"] },
        {
            "name": "dialogporten",
            "containers": ["dialogporten-graphql", "dialogporten-service", "dialogporten-adapter"]
        }
    ],
    "public": {
        "host": "local.altinn.cloud",
        "port": 8000,
        "subdomains": ["pdf", "workflow-engine", "app-frontend", "af"]
    },
    "containers": {
        "storage": {
            "registry": "ghcr.io/ivarne-agent/localtest-research/localtest-storage",
            "tag": "sha-6d928ad",
            "port": 5010,
            "envs": { "GeneralSettings__PlatformEndpoint": "{{origin}}/" },
            "dependsOn": ["postgres"],
            "volumes": { "storage-blobs": "/data/blobs" }
        }
    }
}
```

## `groups`

A list of `{name, containers}`. `containers` are the group's root containers; a group starts them and everything they
depend on (`dependsOn`, transitively). `default` is always on; the optional groups are what `env up --with <group>`
adds and `--without <group>` removes. `everything` is not in the file: it is a constant of the runner meaning every
optional group. A container no group reaches is an error.

`minimal` is the one group that **replaces** `default` (`env up --minimal`): the front door, Storage, the workflow
engine and `otel-files` (its [OTLP receiver](#otlp-receivers)), and Postgres through `dependsOn`. It is a constant name for the runners like `default`, not an optional group:
`--with` and `everything` never name it, and it takes no optional group beside it. The emulated set is derived, not
listed: every HTTP container of `default` that `minimal` does not start (Register, Profile, Authentication,
Authorization, Access Management, Events, the Resource Registry, Notifications, pdf3), which the front door emulates.

`monitoring` is the OpenTelemetry collector and Grafana (roots), with the VictoriaMetrics, VictoriaTraces and
VictoriaLogs stores they depend on, all on the stock upstream images pinned by tag and digest and configured by their
[files](#files) under `monitoring/` and Grafana's `GF_*` envs (served from `{{origin}}/grafana/`, the front door's
`/grafana` route). The collector's config is the router's in Altinn's environments, exporting to the stores by
container name; Grafana's datasources carry the shared Grafana's UIDs, so the dashboards work in both. The stores keep
their data inside the container. studioctl's `everything` includes the group; the Aspire package ignores it, since
its dashboard receives the telemetry; minimal mode takes no optional group, so not this one either, and has its own
receiver instead (`otel-files`). The workflow engine
exports exactly when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
([altinn-studio#21515](https://github.com/Altinn/altinn-studio/pull/21515)), so it needs no setting of its own.

One group implying another is a dependency, not a group rule: `--with correspondence` starts Dialogporten's WebApi and
Redis because Correspondence depends on them.

## `public`

The public origin's defaults and the dedicated subdomains of its host, which live here and nowhere else:

| Key          | Meaning                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `host`       | The default public host (`local.altinn.cloud`): lower-case letters, digits and hyphens in dot-separated labels, no IP   |
| `port`       | The default public port (8000), the front door's published port                                                         |
| `subdomains` | The dedicated subdomains, in order (`pdf`, `workflow-engine`, `app-frontend`, `af`): each is `<sub>.<host>` on the port |

`env up --host <name> --port <n>` (studioctl) and `PublicHost`/`PublicPort` (Aspire) replace the host and port. The
runtimes map the host and every listed subdomain to the host gateway inside the containers and check that a custom host's
names resolve to loopback; the front door gets the list (`Localtest__PublicSubdomains`) and routes each subdomain it
knows, refusing to start on one it does not. A known subdomain left out of the list turns its route off.

## The placeholders

`envs` values name the public origin only through these, resolved for the environment's host and port:

| Placeholder        | Value                        |
| ------------------ | ---------------------------- |
| `{{origin}}`       | `http://<host>:<port>`       |
| `{{host}}`         | `<host>`                     |
| `{{port}}`         | `<port>`                     |
| `{{origin:<sub>}}` | `http://<sub>.<host>:<port>` |
| `{{host:<sub>}}`   | `<sub>.<host>`               |

`<sub>` must be in `public.subdomains`. Any other `{{…}}` (an unknown name, an unlisted subdomain, `{{port:<sub>}}`, an
unclosed `{{`) is a manifest error naming the container and the key. Nothing else is substituted: single braces
(`{Org}`, `Password={0}`) are literal, and the `services__*` addresses are the runner's, never in `envs`. The Go reader
resolves with `Manifest.Envs(name, origin)` (`origin.go`); the Aspire package resolves into parts, so that with a port
Aspire allocates a value is a `ReferenceExpression` over the front door's endpoint.

## `containers`

A map from the container's name to:

| Key            | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry`     | The image repository, with the registry host                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `tag`          | The image tag (a digest may follow: `7.2-alpine@sha256:…`). The research images all carry one `sha-<commit>` pin                                                                                                                                                                                                                                                                                                                                               |
| `envs`         | Environment variables, literal strings but for the public origin's [placeholders](#the-placeholders) (`{{origin}}/`); the data stores by name and port (`Host=postgres;Port=5432`, `redis://redis:6379/2`), another service by its name (`http://authorization/authorization/api/v1/`, see [Service names](#service-names)), the certificate as `/certs/localtest-accesstoken.pfx`                                                                             |
| `dependsOn`    | Containers that start, and are healthy, before this one                                                                                                                                                                                                                                                                                                                                                                                                        |
| `volumes`      | Volume id to path in the container. An id is lower-case letters and digits in hyphen-separated words (`storage-blobs`) and names one volume for the whole manifest: containers naming the same id share it (`policy-store`: the PDP, Access Management, the Resource Registry). Each runtime names the volume by its own prefix and the id: studioctl `localtest-v2-<id>`, Aspire `altinn-localtest-<id>`; each runtime's reset deletes its own                |
| `otlpReceiver` | Marks the stack's OpenTelemetry receiver, see [OTLP receivers](#otlp-receivers): `{"grpcPort": 4317}`, the OTLP/gRPC port the containers send to (its `port` is the OTLP/HTTP one), and optionally `"output": "/telemetry"`, a path in the container where studioctl mounts a folder on the host read-write for the files it writes                                                                                                                            |
| `files`        | Path in the container to a file or folder that ships with the manifest, relative to the manifest's directory and inside a folder beside it (`"/etc/otelcol-contrib/config.yaml": "monitoring/otel-collector.yaml"`); mounted read-only, see [Files](#files). The container path is absolute and clean, named once and not a volume's path too; the source is a clean relative path without `..` that ships with the manifest (a file, or a folder holding one) |
| `caBundle`     | `true` for a container that trusts the host's CA bundle: when the host has one (`STUDIO_CA_BUNDLE`), the runner mounts a copy read-only at `/tmp/studio-ca-bundle.pem` and sets `STUDIO_CA_BUNDLE` to that path, see [What the runner adds](#what-the-runner-adds). For images that import the variable themselves (pdf3); the container's `envs` must not set it |
| `port`         | The container's HTTP (or TCP) port; default 8080                                                                                                                                                                                                                                                                                                                                                                                                               |
| `health`       | An HTTP path answering 200 when healthy (default `/health`), or `"tcp"` for a port that accepts connections (Postgres, Redis)                                                                                                                                                                                                                                                                                                                                  |

Nothing else is allowed (an unknown key is an error): no descriptions, routes, host ports, commands, health-check
commands or build information. A container's notes belong in its component's README; a command belongs in its image
(the [Postgres](https://github.com/ivarne-agent/localtest-research/blob/main/localtest/postgres/Dockerfile) and [Redis](https://github.com/ivarne-agent/localtest-research/blob/main/localtest/redis/Dockerfile) images); a dev build is `env up --dev-<container>=<path>`.

## Files

A container's `files` mount configuration that stock images read from a path, so they run as published, without a
build of their own. The files live in folders beside `manifest.json` (`monitoring/otel-collector.yaml`), never at its
top level, which holds the manifest, this README and the reader's code. Every file in those folders ships with the
manifest: studioctl embeds each folder (the `go:embed` directive of `bundle` in `manifest.go` names it, and
`TestEveryFolderBesideTheManifestShips` fails on a folder it does not name), and the Aspire package embeds every
folder beside the manifest. A source names one file, or a folder for every file under it (a folder of dashboards).

Before it starts the containers, each runtime writes every shipped file under its data directory at the same relative
path (studioctl `<data>/infra/localtest-v2/files/`, beside the certificate; Aspire `<DataDirectory>/files/`),
rewriting a changed file in place and removing what no longer ships, and bind-mounts each source from there read-only
at its container path. The files and their folders are readable by everyone (0644 and 0755), since the images run as
their own non-root users (the OpenTelemetry collector as UID 10001).

## OTLP receivers

A container with `otlpReceiver` is where the stack's telemetry goes while it runs. There are two, on the same stock
collector image, with different configs and defaults, so they have different names:

- `otel-collector` (the `monitoring` group) exports to the Victoria stores that Grafana reads;
- `otel-files` (the `minimal` group) writes OTLP JSON Lines files, one per service and signal, with only the
  collector's `file` exporter. Its `output` is `/telemetry`: studioctl mounts `<data>/infra/localtest-v2/telemetry/`
  there, the one host folder in minimal mode, which otherwise keeps nothing on the host. `env up` in minimal mode
  empties it (unless `otel-files` runs already), and `env down` of a minimal-mode stack deletes it; the default stack
  never touches it. studioctl runs the container as the developer (their uid:gid, and `keep-id` under Podman), so the
  files are theirs to read and delete. How to read them: "Telemetry files in minimal mode" in the bundled app-development
  skill (`resources/agent/skills/app-development/SKILL.md` under `src/cli`).

Both read the same processors (`monitoring/otel-processors.yaml`, through the collector's `${file:…}` provider; the
provider expands the file's text, comments included), so the attributes are the same in both modes. At most one
receiver runs at a time: `Parse` refuses a manifest in which the `minimal` group, or the other groups together, start
two. The Aspire package starts no receiver: its dashboard receives the telemetry.

## Tags

Every image built by the [research repository](https://github.com/ivarne-agent/localtest-research) carries the same `sha-<commit>` pin; pdf3 and
the workflow engine run the monorepo's `tt02` tag, pulled again on every start. A pin is a statement that the stack was
run with that build, so no workflow writes it: whoever proved a build moves every research tag at once with
[`bump-tag.sh`](https://github.com/ivarne-agent/localtest-research/blob/main/localtest/tools/bump-tag.sh) and regenerates the snapshot (see [Changing it](#changing-it)).
`env up --latest` runs each research image's `latest` tag instead.

## Port and health

The target is that every image built for the stack listens on 8080 and answers `GET /health` with 200, so the manifest
names neither. Today most component images still listen on their own ports (Storage 5010, the Register 5020, …) and
name their `port`; the localtest app and Dialogporten's hosts use the default 8080. Each image moves to 8080 in its own
change, and its `port` goes from the manifest then. The runtime checks health itself, from a probe container on the
stack's network, rather than relying on an image's `HEALTHCHECK`, which Podman's OCI images drop.

## The certificate

One test certificate signs and validates every platform access token, so the production token handlers run unchanged.
It is public test material, published with its [README](https://github.com/ivarne-agent/localtest-research/blob/main/localtest/certs/README.md); studioctl embeds a
byte-identical copy (`internal/cmd/env/localtestv2/assets/`), writes it under its data directory and mounts the
directory read-only at `/certs` in every container. The components read `/certs/localtest-accesstoken.pfx` through
their `envs`. The same file is also mounted at `/accesstoken/accesstokencredentials.pfx`, because Events,
Notifications and Receipt read the production resolver's default path; that mount goes once their images read
`/certs`. `studioctl run` points the app at the host copy.

## Service names

A call from one component to another names the service, not the public origin. Most images bake theirs into their fakes'
defaults (`http://register/register/api/v1/`), so the manifest only sets them where the image reads them from the
environment: the Register's PDP endpoint and Receipt's Storage, Register and Profile endpoints, as `http://<service>/<prefix>/`
without a port (service discovery takes it from `services__<service>__http__0`). The Arbeidsflate BFF is Node, without
a resolver: it reaches the platform through the front door by name and port, `http://localtest:8080` (one base for six
services, routed by path prefix). What a browser or a token sees stays `{{origin}}`: issuers, OpenID metadata, redirect
URIs, links, cookie domains, and each .NET component's `…PlatformEndpoint` from which its fakes derive those.

## What the runner adds

Every container gets, besides its `envs`:

- `services__<name>__http__0=http://<name>:<port>` for every running container with an HTTP health (not Postgres or
  Redis), itself included: service discovery as Aspire does it. A group that is off has no variables, so the front
  door answers "not running" for it. The running [OTLP receiver](#otlp-receivers) is announced as the service `otlp`,
  `services__otlp__http__0=http://<receiver>:<port>` (its OTLP/HTTP port, 4318), for the front door's `/otlp` route,
  which forwards to that role, not to a container name; its own name is not announced, its health being `tcp`. Minimal
  mode always runs its receiver, so `/otlp` has none only on the default stack without `monitoring`, and its 503 names
  that group.
- while an OTLP receiver runs (`otel-collector` with the `monitoring` group, `otel-files` in minimal mode), every
  container but the receiver, what it depends on and the monitoring group gets the standard OpenTelemetry variables,
  unless its own `envs` set them: `OTEL_EXPORTER_OTLP_ENDPOINT=http://<receiver>:<grpcPort>`,
  `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` (inside the network gRPC needs no front door, and some components send gRPC
  whatever the variable says), `OTEL_SERVICE_NAME=<name>` and `OTEL_METRIC_EXPORT_INTERVAL=5000` (metrics every 5 s
  instead of the SDKs' 60 s; Altinn's environments use 15 s). A component exports exactly when the endpoint is set;
  the receiver's side gets none, so it never exports to itself. Such a container also depends on the receiver,
  besides its `dependsOn`: it starts once the receiver is ready (a TCP connection to 4318; the collector opens its
  receivers last, gRPC before HTTP) and stops before it, so no start-up or shutdown telemetry is lost. A receiver
  depends only on its own stores (`otel-collector` on the Victoria stores, `otel-files` on nothing), so this makes no
  cycle. While Grafana runs too (the monitoring group only), the workflow engine also gets the links from its dashboard
  to a workflow's trace in Grafana:
  `EngineSettings__Dashboard__GrafanaUrl=<public origin>/grafana` and
  `EngineSettings__Dashboard__GrafanaTracesDatasourceUid=altinn-studio-traces` (the traces datasource in
  `monitoring/grafana-datasources.yaml`). They are not in the engine's `envs`, so the Aspire host, which ignores the
  group, does not get them and links its own dashboard instead. Without the group nothing is added.
- its name as network alias, the public host and its listed subdomains (`local.altinn.cloud`, `pdf.`,
  `workflow-engine.`, `app-frontend.`, `af.` by default) and `host.docker.internal` pointed at the host gateway;
- for the front door, `Localtest__PublicSubdomains`: the listed subdomains, comma-separated;
- the shared certificate directory read-only at `/certs`, and (until the Events, Notifications and Receipt images link
  it) the certificate file at `/accesstoken/accesstokencredentials.pfx`.
- each of its `files` read-only, from the runner's copy of the shipped files ([Files](#files)), after the certificate
  and sorted by container path;
- for a container with `caBundle` (pdf3), while the host's `STUDIO_CA_BUNDLE` names a PEM file with a usable
  certificate: a copy of its usable certificates read-only at `/tmp/studio-ca-bundle.pem`, after the files, and
  `STUDIO_CA_BUNDLE=/tmp/studio-ca-bundle.pem`, as the `localtest` runtime gives its pdf3 (studioctl's
  `internal/cmd/env/stack/cabundle.go` and devenv's `pkg/cabundle`). The image imports it where its own TLS client
  looks (pdf3's entrypoint into its Chromium's NSS store, which ignores the system's), so behind a TLS-intercepting
  proxy (a corporate network, a sandbox) pdf3 loads the app frontend from `altinncdn.no`. The copy is
  `<data>/infra/localtest-v2/ca-bundle/ca-bundle-<hash>.pem` (Aspire `<DataDirectory>/ca-bundle/`), readable by
  everyone and named by the first 16 hex digits of the SHA-256 of the certificates it holds: no host system file is
  mounted or relabelled, Docker Desktop shares it, and a changed bundle changes the mount, so `env up` recreates the
  containers (the state file records the digest; an unchanged one keeps a healthy environment running). A certificate
  that is malformed or that Go's X.509 parser rejects is left out, with one warning naming it by line. Unset: nothing
  is added and the copy is removed. Set but naming no readable file, or a file without a usable certificate: one
  warning, and the containers start without it. No other image reads the variable, so no other container is marked:
  the .NET components trust their image's system store and the Node ones (the Arbeidsflate BFF)
  `NODE_EXTRA_CA_CERTS`, which a container runtime configured for the proxy sets, and which this does not touch. The
  Aspire package reads the variable in the AppHost's environment and does the same.
- each of its `volumes` as the named volume `localtest-v2-<id>` (`volumePrefix` in `containers.go`); `env reset`
  deletes those and no other.
- in minimal mode: `services__<name>__http__0=http://localtest:8080` for each emulated container, a tmpfs at the path of
  each of its `volumes` instead of the named volume (`mode=1777`, so the images' non-root users can write, and `size=1g` for Storage's blobs), and for the front door
  `Proxy__AppRoutesFile=` (routes kept in memory). Nothing persists, so `env reset` has nothing to delete. The one bind
  mount of the host besides the certificate and the files is `otel-files`'s telemetry folder (its `output`, read-write,
  run as the developer), which `env down` deletes.

Only the `localtest` container publishes a port: the public port (8000, or `--port`) onto its 8080. The app's environment is not
in the manifest: it is runner code (`internal/cmd/app/env.go`), held by `internal/cmd/app/testdata/app-environment.golden.json`.

## Changing it

- A new folder of files beside the manifest goes into the `go:embed` directive of `bundle` in `manifest.go`; the Aspire
  package picks it up by itself.

- Regenerate the snapshot after any change and review the diff:
  `STUDIOCTL_UPDATE_GOLDEN=1 go test ./internal/cmd/env/localtestv2/` (under `src/cli`).
- Tags change only in a separate, tested step: the images workflow never writes the manifest; whoever proved a build
  runs [`bump-tag.sh sha-<commit>`](https://github.com/ivarne-agent/localtest-research/blob/main/localtest/tools/bump-tag.sh) and regenerates the snapshot.
- The research repository's [Aspire package](https://github.com/ivarne-agent/localtest-research/tree/main/localtest/aspire/Altinn.App.Aspire) embeds this file by relative path and
  compares what it builds with the snapshots above
  ([`manifest-parity.yml`](https://github.com/ivarne-agent/localtest-research/blob/main/.github/workflows/manifest-parity.yml)).
