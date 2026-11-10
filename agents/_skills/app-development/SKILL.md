---
name: altinn-studio-app-development
description: Build, change, run, and test Altinn Studio apps. Use for app configuration, data models, layouts, texts, process flows, authorization, backend logic, and local testing with studioctl and localtest.
---

# Develop Altinn Studio apps

Use `studioctl` as the entry point for local Altinn Studio app development. The installed command's help is authoritative;
inspect `studioctl --help` and the relevant `studioctl <command> --help` before relying on flags or behavior.

## App anatomy

An Altinn Studio app is a .NET ASP.NET Core application.
Since Altinn Studio is a low-code platform, lots of features/capabilities are built around configuration.
Most behavior lives in `App/`; the repository root holds the solution, container build, and deployment configuration:

```text
<app-root>/
|-- App/
|   |-- App.csproj                    Backend project and Altinn.App package versions
|   |-- Program.cs                    Service registration and app startup
|   |-- config/
|   |   |-- applicationmetadata.json App identity, data types, and allowed parties
|   |   |-- process/process.bpmn      Tasks, events, and transitions
|   |   |-- authorization/policy.xml  Authorization rules
|   |   `-- texts/resource.<lang>.json User-facing texts by language
|   |-- models/                       Data-model schemas and generated C# types
|   |-- ui/                           Layout sets, pages, components, and UI settings
|   |-- options/                      Static option lists, when present
|   |-- logic/, services/, Actions/   Custom backend behavior, when present
|   `-- wwwroot/                      App-specific static assets, when present
|-- deployment/                       Helm values and deployment configuration
|-- Dockerfile
`-- App.sln
```

The shape varies by app version and enabled features. Follow the identifiers that connect files:

- Task IDs in `config/process/process.bpmn` select the UI for each process task. Newer apps commonly use matching
  `ui/<task-id>/` directories; older apps map tasks through `ui/layout-sets.json`.
- Data-type IDs in `config/applicationmetadata.json` connect tasks, models, and UI settings. Layout components bind
  fields from the selected model.
- `ui/<layout-set>/Settings.json` defines page order and settings. Files in `layouts/` define pages and components.
- Text keys used by layouts, validation, or code resolve through `config/texts/resource.<lang>.json`. Keep supported
  languages aligned when changing user-facing text.
- `Program.cs` registers custom C# implementations. Apps usually group them under `logic/`, `services/`, or similar.

Read the closest `AGENTS.md`, then inspect the relevant slice of this graph.

## Get an app

You may be directed to an existing checkout, if not, use studioctl to checkout an app.
Relevant commands:

```sh
studioctl auth status --json
studioctl auth login
studioctl apps search --json "<query>"
studioctl app clone <org>/<repo> [destination]
```

Ask the user to log in if `auth status` reports no valid login. Search when no specific repository was given; select
from `apps[]` using `appId` or `cloneUrl`. `--env` accepts `prod`, `dev`, `staging`, or `local` and defaults to `prod`;
Altinn Studio platform developers may use `dev` or `staging`.

## Making changes

- Keep task IDs, data-type IDs, model bindings, page references, and text keys consistent across definitions and uses.
- Use the `$schema` declared by JSON files when present. Preserve the app's existing version and conventions instead
  of copying structures from a different template version.
- Treat generated models and schemas as one unit. Find the repository's generation path before editing output.
- Put backend behavior behind the Altinn.App extension points already used by the app and register implementations in
  `Program.cs`; follow the app's existing organization.

## Upgrading an app from v8 to v9

`studioctl app upgrade v9` migrates the app and reports what it will not change for you. Read its output before
changing anything yourself; it names every file and configuration path it found.

Maskinporten needs deliberate handling. A v9 app has **one** Maskinporten identity and never configures its own
credentials: it reads whatever the platform provisions for it. Deployed, that is the client Studio provisions. On a
local run studioctl is the platform, and it cannot yet hand over the credentials Studio issues - so to test against a
real external API you supply a client for studioctl to provision in their place, with
`studioctl app maskinporten set`. That is a gap in the local harness, not a second identity for the app.

The consequence that matters is about scopes. Maskinporten grants scopes per client registration, and the client a
local run uses is not the registration the deployed app uses. So a scope selected in Studio is not thereby available
locally, and a scope on your local client is not thereby available once deployed. The same scopes have to be in place
in both spots.

When the upgrade reports Maskinporten configuration:

1. **Record the scopes before deleting anything.** The upgrade prints a scope list with the evidence for each entry,
   including the `Scope` value read out of the sections it is telling you to delete. Once the section is gone, that
   record is gone.
2. **For the deployed app**, select those scopes in Studio under App settings, "Velg scopes fra Maskinporten". This
   requires an Ansattporten sign-in on behalf of the organization that owns the app, and takes effect the next time
   the app is built and deployed - so do it _before_ deploying, or the deployed app fails on its first token request.
3. **For local runs**, supply a client with `studioctl app maskinporten set` and make sure that client already has
   the same scopes in Maskinporten. `studioctl doctor` reports whether one is stored for the detected app.
4. **Do not reintroduce credentials into `appsettings.json`.** v9 does not read them from there in any environment.
   A section that configures the external `Altinn.ApiClients.Maskinporten` package is the exception and is still read
   by that package.

Do not add the `altinn:serviceowner` scopes anywhere on the app's behalf: Studio adds them to the provisioned
credentials automatically when a v9 app is built, and a local run does not need them.

## Run and test

From the app root:

```sh
studioctl env up
studioctl env status --json
studioctl run --detach --json
studioctl app ps --json
```

For investigating failures, use `studioctl app logs` and `studioctl env logs`. Under `env up -r localtest-v2 --minimal`,
also read the telemetry files ("Telemetry files in minimal mode" below).
`studioctl doctor` can be used if there are problems with `studioctl` (or there are missing capabilities).

If local hostnames do not resolve, inspect `studioctl env hosts status`. `studioctl env hosts add` changes the system
hosts file, so explain that effect before running it with the host's normal privilege mechanism.

Open the `url` from the `run` result; `logPath` identifies its log file. `app ps` reports status in `running` and
`apps[]`, but does not return the app URL. The `http://local.altinn.cloud:8000` root page contains the login form,
not the app.

### Test changes to Altinn Studio itself

This is mostly for internal Altinn Studio/platform developers, not service owner app developers.
Mostly used within the `Altinn/altinn-studio` monorepo.
Useful when testing changes to e.g. localtest, pdf3, frontend, workflow-engine-app or other
Altinn Studio platform components.

- `STUDIOCTL_INTERNAL_DEV=true studioctl env up` builds supported LocalTest/runtime service images from the current
  monorepo checkout.
- `studioctl env up --dev-workflow-engine` routes the workflow-engine component to a host process, normally at
  `http://localhost:9090`. Under `-r localtest-v2`, the same flag builds the workflow-engine container instead (below).
- `studioctl run --dev-frontend` serves frontend assets from the current monorepo checkout while the app frontend
  development server is running.
- `studioctl env up -r localtest-v2` runs the production platform services (Register, Profile, Authentication, the PDP,
  Access Management, Storage, Events, Resource Registry, Notifications) instead of localtest's emulation. `studioctl run`
  works the same against it.
  - `--with dialogporten|receipt|correspondence|arbeidsflate|monitoring|everything` adds optional services with what
    they depend on. `arbeidsflate` is the inbox on `http://af.local.altinn.cloud:8000`, which needs a hosts entry
    (`studioctl env hosts add`). A path whose group is off answers `503` naming the `--with` that starts it.
  - Only one runtime runs at a time, and the other `env` commands act on the one that is running.
  - `--latest` runs the newest images, and `--dev-<container>[=<path>]` builds one from a Dockerfile or its directory,
    by default the current directory.
  - `studioctl run --mode container` (the app needs its `Dockerfile`) puts the app container on the stack's network,
    where the localtest container reaches it. The app calls the platform on `http://local.altinn.cloud:8000` like a
    process, and `env down` removes it.
  - `studioctl run --dev-frontend` expects the frontend dev server on the host's port 8080 in either mode.
- `studioctl env up -r localtest-v2 --minimal` starts only Postgres, Storage, the workflow engine and the localtest
  container, which emulates the other services in memory and permits every request. There are no 403s and no role
  checks, and every PDF is one static page. Nothing persists between starts. Use it for quick work and an app's own
  tests, not to test authorization. It takes no `--with`.
  It writes the stack's traces, logs and metrics to JSON Lines files for debugging a failed test:
  `<studioctl home>/data/infra/localtest-v2/telemetry/<service>/{traces,logs,metrics}.jsonl` (home: `$STUDIOCTL_HOME`,
  default `~/.config/altinn-studio` on Linux), emptied by `env up` and deleted by `env down`. The app sends to it when
  run with `OTEL_EXPORTER_OTLP_ENDPOINT=http://local.altinn.cloud:8000/otlp`,
  `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` and `AppSettings__UseOpenTelemetry=true` in the environment of
  `studioctl run`. See "Telemetry files in minimal mode" below.
- `studioctl env up -r localtest-v2 --host <name> --port <n>` runs the stack on `http://<name>:<n>` instead of
  `http://local.altinn.cloud:8000`, and `--port 0` picks a free port. `env status` prints the `Origin:`, and `run`,
  `app env` and the other `env` commands use it. `run --mode container` is refused there, since it works only at the
  default origin. The name and its `pdf.`, `workflow-engine.`, `app-frontend.` and `af.` subdomains must be in
  `/etc/hosts` (127.0.0.1), and `env up` prints the line to add when they are not.

### Telemetry files in minimal mode

In minimal mode the stack's OpenTelemetry collector (`otel-files`) writes JSON Lines files, one folder per
`service.name` (`localtest` is the front door, then `storage`, `workflow-engine` and the app's name, such as
`testapp`), each with `traces.jsonl`, `logs.jsonl` and `metrics.jsonl`, and rotated copies
`<signal>-<time>-size.jsonl`: two are kept, rotated at 10 MB, metrics at 25 MB. A line is one OTLP/JSON export batch.
IDs are hex, and times are Unix nanoseconds as strings. A request shows up within about 10 s. Metrics keep about the last hour. The
app starts a trace of its own for each incoming request, so use the app's trace ID (from the errors listing or a log
record's `traceId`), not the one a client sent.

From that folder (the globs include the rotated files):

```sh
cd ~/.config/altinn-studio/data/infra/localtest-v2/telemetry

# Everything about trace $TRACE: spans and log records of every service, in time order.
jq -r --arg t "$TRACE" '
  def svc: .resource.attributes[] | select(.key == "service.name").value.stringValue;
  def at: tonumber / 1e6 | floor | (./1000 | floor | strflocaltime("%H:%M:%S")) + "." + ("00\(. % 1000)" | .[-3:]);
  (.resourceSpans[]? | svc as $s | .scopeSpans[].spans[] | select(.traceId == $t)
    | [.startTimeUnixNano, (.startTimeUnixNano | at), $s, "span",
       "\((.endTimeUnixNano | tonumber) - (.startTimeUnixNano | tonumber) | ./1e6 | floor) ms", .name,
       (if .status.code == 2 then "ERROR \(.status.message // "")" else "" end)]),
  (.resourceLogs[]? | svc as $s | .scopeLogs[].logRecords[] | select(.traceId == $t)
    | [.timeUnixNano, (.timeUnixNano | at), $s, "log", .severityText, .body.stringValue])
  | @tsv' */traces*.jsonl */logs*.jsonl | sort | cut -f2-

# Errors in the last $N minutes: spans with an error status and log records at Error or above, with their trace ID.
jq -r --argjson since "$(( $(date +%s) - N * 60 ))" '
  def svc: .resource.attributes[] | select(.key == "service.name").value.stringValue;
  def at: tonumber / 1e6 | floor | (./1000 | floor | strflocaltime("%H:%M:%S")) + "." + ("00\(. % 1000)" | .[-3:]);
  (.resourceSpans[]? | svc as $s | .scopeSpans[].spans[]
    | select(.status.code == 2 and (.startTimeUnixNano | tonumber) / 1e9 >= $since)
    | [.startTimeUnixNano, (.startTimeUnixNano | at), $s, "span", .name, .status.message // "", .traceId]),
  (.resourceLogs[]? | svc as $s | .scopeLogs[].logRecords[]
    | select((.severityNumber // 0) >= 17 and (.timeUnixNano | tonumber) / 1e9 >= $since)
    | [.timeUnixNano, (.timeUnixNano | at), $s, "log", .severityText, .body.stringValue, .traceId // ""])
  | @tsv' */traces*.jsonl */logs*.jsonl | sort | cut -f2-

# The slowest spans of trace $TRACE, in milliseconds.
jq -r --arg t "$TRACE" '
  def svc: .resource.attributes[] | select(.key == "service.name").value.stringValue;
  .resourceSpans[]? | svc as $s | .scopeSpans[].spans[] | select(.traceId == $t)
  | [(((.endTimeUnixNano | tonumber) - (.startTimeUnixNano | tonumber)) / 1e6 | floor), $s, .name] | @tsv' \
  */traces*.jsonl | sort -rn | head -15
```

The app's incoming requests with their trace IDs, newest last (without studioctl's polls of the app's metadata):

```sh
jq -r '.resourceSpans[]?.scopeSpans[].spans[] | select(.kind == 2 and (.name | endswith("applicationmetadata") | not))
  | [.startTimeUnixNano, .traceId, .name] | @tsv' testapp/traces*.jsonl | sort | tail
```

## Stop

```sh
studioctl app stop
studioctl env down
```

Do not reset state, remove credentials, delete files, or broadly terminate processes unless requested and precisely
targeted.
