# localtest-v2

`studioctl env up -r localtest-v2` runs the Altinn Platform's own services instead of localtest's emulation of them,
so an app can be tested against the real Register, Profile, Authentication, the PDP, Access Management, Storage,
Events, the Resource Registry and Notifications. The images are built in the
[localtest-research](https://github.com/ivarne-agent/localtest-research) repository, with small local stand-ins for
Azure. Beside them run a localtest app for the test-user login and the token helpers, a shared Postgres, and the same
pdf3 and workflow engine as the `localtest` runtime.

Apps run against it as they run against localtest. `studioctl run` gives them the same platform URLs.

## The front door

The localtest app's container is the front door. It is the only container with a published port, and serves
`http://local.altinn.cloud:8000`. It forwards each platform path prefix to the service behind it, and `/{org}/{app}`
to the app.

studioctl-server registers each app it discovers with the front door, whether `studioctl run` or an IDE started it.
The front door then deploys the app to the platform the way Altinn Studio does:

- the application metadata and texts to Storage
- the policy to the PDP
- the users in the app's `testData.json` to the Register

The Resource Registry and Access Management then pick up the app's resource, policy subjects and test users.

The front door reaches an app on the host as `host.docker.internal:<port>`, so apps listen on every interface while
localtest-v2 runs. `studioctl run` waits until the front door has registered the app. With `--dev-frontend`, it also
routes `http://app-frontend.local.altinn.cloud:8000` to the frontend dev server on the host's port 8080 for as long as
the run lasts.

## Which runtime runs

Only one runtime runs at a time, since both serve the same host names and port. `env up` refuses to start one while
the other runs. `env down`, `env status`, `env logs` and `env reset` act on the one that runs, unless `-r` names
another.

studioctl reads whether localtest-v2 runs from its containers. When they are gone without `env down`, such as after a
restart, studioctl treats it as down. When they run but the front door does not answer, `studioctl run` stops and
names `env up -r localtest-v2` and `env down -r localtest-v2`.

## Component groups

Optional groups of services are off by default. `--with <group>` starts a group with what it depends on, and
`--without <group>` leaves out a group's own containers. `env up --help` lists the groups. `--with arbeidsflate` serves
the Altinn inbox on `http://af.local.altinn.cloud:8000`, which needs `studioctl env hosts add`. A request to a service
whose group is off answers `503` with the `env up` command that starts it.

## Minimal mode

`--minimal` runs Postgres, Storage, the workflow engine and the front door, which then emulates the other services.
Use it for quick work and an app's own tests, not to test authorization:

- authorization permits every request
- each container keeps its data in memory, so nothing is kept between starts and `env reset` has nothing to delete
- it takes no `--with` or `--without`, and `--dev-<container>` only for the four containers it starts

`env status` says when the stack runs in minimal mode. `env up` stops a stack that runs in the other mode first.

### Telemetry files

Minimal mode also runs `otel-files`, an OpenTelemetry collector that writes what the stack sends to JSON Lines files on
the host. A failed test can then be debugged without starting anything else. The containers always send to it. An app
started with `studioctl run` sends to it when its environment has `OTEL_EXPORTER_OTLP_ENDPOINT` set to
`http://local.altinn.cloud:8000/otlp`, `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` and
`AppSettings__UseOpenTelemetry=true`.

The files are under `<studioctl home>/data/infra/localtest-v2/telemetry/`, with a folder per service name and a file
per signal. `env up` in minimal mode empties the folder, and `env down` deletes it. The files rotate, so metrics,
which every container sends every 5 seconds, keep about the last hour. The bundled
[app-development skill](../../../agents/_skills/app-development/SKILL.md#telemetry-files-in-minimal-mode) has the
`jq` commands that read them.

## Monitoring

`--with monitoring` starts an OpenTelemetry collector, VictoriaMetrics, VictoriaTraces, VictoriaLogs and Grafana at
`http://local.altinn.cloud:8000/grafana/`, with the Altinn Studio dashboards. Every other container then exports
OpenTelemetry under its container's name. An app on the host can send OTLP over HTTP to
`http://local.altinn.cloud:8000/otlp`. The data lives in the containers and goes with `env down`.

## Another address

`--host <name> --port <n>` serves the stack on `http://<name>:<n>`, and `--port 0` picks a free port. `env status`
prints the origin, and `studioctl run` and `app env` use it. The name and its subdomains must resolve to 127.0.0.1, and
`env up` prints the hosts-file line to add when they do not.

## Apps in containers

`studioctl run --mode container` builds the app's image from its `Dockerfile` and runs it on the stack's network,
`localtest-v2_network`, where the front door reaches it as `http://<org>-<app>:5005`. The public host names map to
the host inside the container, so the app calls the platform through `http://local.altinn.cloud:8000`, as a process
does. It gets the same settings as a process run, with the access-token certificate mounted at `/certs`. `env down`
removes an app container that still runs.

- Container mode works only at the default address, so `run --mode container` is refused after `env up --host` or
  `--port`.
- A monorepo test app that references projects under `src/App` does not build in container mode, because the
  generated `Dockerfile` does not copy `src/App/PackageVersioning.props`. The `localtest` runtime has the same
  limit. Run such an app as a process.

The apps share the stack's network rather than a network of their own, because a separate network does not work with
Podman 5.7 and netavark. With the front door on both networks, netavark forwards the published port to the front
door's address on one network only, and isolates the bridges from each other, so callers on the other network time
out. With the front door on the stack's network only, the same isolation keeps the app and the front door from
reaching each other through the host gateway, and the Docker API that studioctl uses cannot create a network without
it. A separate network would need the front door to listen on the public port on the apps' network, under an alias
for the public host names.

## Images

The embedded [manifest](../internal/localtestv2/manifest/README.md) pins every localtest-v2 image, so
`STUDIOCTL_IMAGE_*` does not apply. `--latest` runs the newest build from the research repository's main branch of
each image built there. `--dev-<container>[=<path>]` builds a container from a `Dockerfile`, or from the directory that holds one,
and runs it instead. The path defaults to the current directory:

```sh
cd localtest-research/localtest/components/storage
studioctl env up -r localtest-v2 --dev-storage
```

## Not supported yet

- pgAdmin. `env up -r localtest-v2` refuses `--monitoring` and `--pgadmin`, and its monitoring is `--with monitoring`.
- Apps in containers at another address than the default.
- `studioctl doctor` checks.

## How it is built

- The [manifest](../internal/localtestv2/manifest/README.md) describes the containers, and its README holds the
  conventions the runtime and the images share, such as tags, ports, health, the certificate, volumes and service
  names. Change a container in the manifest, not in Go code. The golden file in
  `internal/cmd/env/localtestv2/testdata/` shows the effect.
- The runtime in `internal/cmd/env/localtestv2` follows the [env runtime rules](../README.md#development). It starts
  the containers, gives them each other's addresses as service discovery variables, checks their health from a probe
  container, and builds the `--dev-<container>` images.
- studioctl carries no proxy, route table or provisioning for localtest-v2. Those are the localtest image's, and
  studioctl-server and `studioctl run` only register apps and routes with the front door.
- `internal/localtestv2` holds the state file, which records the configuration the stack was started with. Code
  outside the `env` commands asks `localtestv2.Current` whether the stack runs. It checks the containers as
  `Env.Active` does, and only then reads the state file, since a state file alone does not mean that the stack runs.
