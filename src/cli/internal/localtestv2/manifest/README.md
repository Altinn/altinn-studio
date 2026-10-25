# The localtest-v2 manifest (v2)

`manifest.json` lists the stack's containers, the groups that select them and the public origin's defaults. studioctl's `localtest-v2` runtime
(`internal/cmd/env/localtestv2`) starts the stack from it; the file is embedded in the binary. There is no schema: the
package's test (`manifest_internal_test.go`) validates the file, and `Parse` refuses an invalid one.

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

`minimal` is the one group that **replaces** `default` (`env up --minimal`): the front door, Storage and the workflow
engine, and Postgres through `dependsOn`. It is a constant name for the runners like `default`, not an optional group:
`--with` and `everything` never name it, and it takes no optional group beside it. The emulated set is derived, not
listed: every HTTP container of `default` that `minimal` does not start (Register, Profile, Authentication,
Authorization, Access Management, Events, the Resource Registry, Notifications, pdf3), which the front door emulates.

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

| Key         | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry`  | The image repository, with the registry host                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tag`       | The image tag (a digest may follow: `7.2-alpine@sha256:…`). The research images all carry one `sha-<commit>` pin                                                                                                                                                                                                                                                                                                                                |
| `envs`      | Environment variables, literal strings but for the public origin's [placeholders](#the-placeholders) (`{{origin}}/`); the data stores by name and port (`Host=postgres;Port=5432`, `redis://redis:6379/2`), another service by its name (`http://authorization/authorization/api/v1/`, see [Service names](#service-names)), the certificate as `/certs/localtest-accesstoken.pfx`                                                              |
| `dependsOn` | Containers that start, and are healthy, before this one                                                                                                                                                                                                                                                                                                                                                                                         |
| `volumes`   | Volume id to path in the container. An id is lower-case letters and digits in hyphen-separated words (`storage-blobs`) and names one volume for the whole manifest: containers naming the same id share it (`policy-store`: the PDP, Access Management, the Resource Registry). Each runtime names the volume by its own prefix and the id: studioctl `localtest-v2-<id>`, Aspire `altinn-localtest-<id>`; each runtime's reset deletes its own |
| `port`      | The container's HTTP (or TCP) port; default 8080                                                                                                                                                                                                                                                                                                                                                                                                |
| `health`    | An HTTP path answering 200 when healthy (default `/health`), or `"tcp"` for a port that accepts connections (Postgres, Redis)                                                                                                                                                                                                                                                                                                                   |

Nothing else is allowed (an unknown key is an error): no descriptions, routes, host ports, commands, health-check
commands or build information. A container's notes belong in its component's README; a command belongs in its image
(`localtest/postgres/Dockerfile`, `localtest/redis/Dockerfile`); a dev build is `env up --dev-<container>=<path>`.

**Transitional (task 27a):** the component images still listen on their own ports (5010, 5020, …), so most containers
name their `port`; the default 8080 applies to the localtest app and Dialogporten's hosts. The per-component image
changes of task 25 move them to 8080 and drop the key. Redis runs this repository's image (`localtest/redis/`) at the
same pin since `sha-6d928ad`. The conventions behind these rules (and the table of today's ports):
[`localtest/CONVENTIONS.md`](../../../../../../CONVENTIONS.md).

## Service names

A call from one component to another names the service, not the public origin (task 40, [`localtest/CONVENTIONS.md`,
"Service discovery"](../../../../../../CONVENTIONS.md#service-discovery)). Most images bake theirs into their fakes'
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
  door answers "not running" for it.
- its name as network alias, the public host and its listed subdomains (`local.altinn.cloud`, `pdf.`,
  `workflow-engine.`, `app-frontend.`, `af.` by default) and `host.docker.internal` pointed at the host gateway;
- for the front door, `Localtest__PublicSubdomains`: the listed subdomains, comma-separated;
- the shared certificate directory read-only at `/certs`, and (until the Events, Notifications and Receipt images link
  it) the certificate file at `/accesstoken/accesstokencredentials.pfx`.
- each of its `volumes` as the named volume `localtest-v2-<id>` (`volumePrefix` in `containers.go`); `env reset`
  deletes those and no other.
- in minimal mode: `services__<name>__http__0=http://localtest:8080` for each emulated container, a tmpfs at the path of
  each of its `volumes` instead of the named volume (`mode=1777`, so the images' non-root users can write, and `size=1g` for Storage's blobs), and for the front door
  `Proxy__AppRoutesFile=` (routes kept in memory). Nothing persists, so `env reset` has nothing to delete.

Only the `localtest` container publishes a port: the public port (8000, or `--port`) onto its 8080. The app's environment is not
in the manifest: it is runner code (`internal/cmd/app/env.go`), held by `internal/cmd/app/testdata/app-environment.golden.json`.

## Changing it

- Regenerate the snapshot after any change and review the diff:
  `STUDIOCTL_UPDATE_GOLDEN=1 go test ./internal/cmd/env/localtestv2/` (under `src/cli`).
- Tags change only in a separate, tested step: the images workflow never writes the manifest; whoever proved a build
  runs `localtest/tools/bump-tag.sh sha-<commit>` and regenerates the snapshot.
- The Aspire package (`localtest/aspire/Altinn.App.Aspire`) embeds this file by relative path and compares what it
  builds with the snapshots above (`.github/workflows/manifest-parity.yml`).
