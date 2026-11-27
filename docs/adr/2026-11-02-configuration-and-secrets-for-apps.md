# v9 apps get the values we own as files, and declare what they need in `deployment/app.yaml`

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 02.11.2026

## Result

This ADR is the contract between a v9 app and the runtime it runs in. It has two halves:

- what the runtime gives the app: files in the app's runtime directory, and a few environment variables
- what the app tells the runtime: `deployment/app.yaml`

The decisions:

1. Runtime configuration (A1.3): we deliver the values we own as files, the app libraries have no defaults for them,
   a missing value stops the app at startup, and our values win over the app's.
2. App secrets (A2.1): the runtime operator reads the service owner's vault and writes the app's secrets as a file
   into the runtime directory. The app libraries never connect to Key Vault.
3. Reading secrets (A3.1): app code reads secrets through configuration. v9 removes `ISecretsClient`.
4. Telemetry (A4.1): v9 apps export only OTLP, to the collectors in the runtime cluster, which export to the service
   owner's Application Insights.
5. The runtime directory (A5.1): each kind of value has its own subdirectory, so provisioned secrets never reach the
   app's configuration.
6. `deployment/app.yaml` is part of this contract. How the runtime turns it into a running app, the `App` resource
   in [#21792](https://github.com/Altinn/altinn-studio/issues/21792), gets its own ADR, decided together with this
   one.
7. The runtime contract has a version of its own, starting at 9. It is independent of the app libraries' version and
   of the schema version of `deployment/app.yaml`. A form app gets it from its app libraries, and any app can set it
   in `deployment/app.yaml`.

### Kinds of values

Every value a v9 app reads belongs to one of these kinds, and each kind has one owner and one way into the app.

| Kind                  | Examples                                                                                            | Owner              | Deployed app                                                                                   | Local run                                                                                            | App can override                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Provisioned secrets   | The app's Maskinporten client, app codes, the APIM subscription key                                 | Team Altinn Studio | Files the runtime operator writes into `provisioned-secrets/`                                  | Files studioctl writes into `provisioned-secrets/`                                                   | No                                                        |
| Runtime configuration | Altinn Platform endpoints, host names, cookie names, links to other Altinn services                 | Team Altinn Studio | JSON files in `runtime-config/`, from `infra/runtime/apps-config` and from the runtime cluster | JSON files studioctl writes into `runtime-config/`                                                   | No                                                        |
| Startup values        | The environment's name, where the runtime directory is, the app's version, the OTLP export settings | Team Altinn Studio | Environment variables the runtime cluster sets                                                 | Environment variables studioctl sets                                                                 | Only the metric export interval, in `deployment/app.yaml` |
| Contracts             | The validation message prefixes that app code writes and the app libraries parse                    | Team Altinn Studio | Constants in the app libraries                                                                 | The same                                                                                             | No                                                        |
| App configuration     | Which validations run, PDF settings, the app's own integrations                                     | The app            | `appsettings*.json`, over defaults in the app libraries                                        | The same, plus user secrets and `appsettings.Local.json`                                             | Yes                                                       |
| App secrets           | API keys for the app's own integrations                                                             | The service owner  | The service owner's vault, which the runtime operator writes into `app-secrets/`               | Values studioctl stores and writes into `app-secrets/`, or user secrets and `appsettings.Local.json` | Yes                                                       |
| Deployment settings   | Replicas, resources, which shared secrets the app reads                                             | The app            | `deployment/app.yaml`                                                                          | studioctl reads the same file                                                                        | -                                                         |

### The runtime version

- The runtime contract has a version of its own, the runtime version. The runtime gives each deploy the shape of
  its runtime version.
- The runtime version starts at 9, the major version of the app libraries that first implement it. An app without
  `deployment/app.yaml` gets the shape v8 apps have today.
- The build decides an app's runtime version once per release:
  - from `runtimeVersion` in `deployment/app.yaml`, when the app sets it
  - otherwise, from the runtime version the app's libraries implement. The contract file maps each range of
    Altinn.App versions to the runtime version it implements, so the v9 libraries give runtime version 9.
- A form app normally leaves `runtimeVersion` out, and moves to a new runtime version when it upgrades its
  libraries. The template and the upgrade do not write it. An app whose libraries implement no runtime version, or
  more than one, sets it, and the build stops when it does not.
- The runtime version is independent of the app libraries' major version, and of the schema version of
  `deployment/app.yaml` in its `apiVersion` and `kind`. The libraries can change their public API, and the file can
  gain fields, without a new runtime version.
- A new kind of app, such as one from an empty template with only a Dockerfile and `deployment/app.yaml`, sets
  `runtimeVersion`, and gets the same contract as a form app.
- An addition keeps the runtime version, such as a new key, a new file or a new optional field. Only a change that
  breaks apps on a runtime version gives a new one. The runtime keeps serving every runtime version that a deployed
  release declares.
- The build reads the app with the app model in [`src/common`](../../src/common/README.md). It records the runtime
  version and the Altinn.App version on the release and the image, so the deploy and the runtime never infer them
  again. It stops when the app sets a runtime version that its libraries do not implement.

### The pod around the app

- We decide how an app runs, with defaults that suit most apps, so most apps configure nothing. The contract names
  the defaults:
  - the port the app listens on
  - the path the app is served under, `/<org>/<app>/`
  - the path each of the startup, readiness and liveness probes calls. In runtime version 9, all three call
    `/health`. The v9 libraries serve it, and an app of another kind serves it itself.
  - the probes' timings and thresholds
- An app that needs something else can change a few of them in `deployment/app.yaml`, such as listening on more
  ports or giving the probes more time. Each such field:
  - says what the app needs, not how Kubernetes provides it, so the field still means the same if the runtime runs
    on something other than Kubernetes
  - is optional, and an app without it keeps the default
  - comes when apps need it, as an addition to the runtime version
  - stays for as long as its runtime version does, since removing it breaks the apps that use it
- `deployment/app.yaml` exposes no Kubernetes objects and no part of the pod spec, such as volumes, service
  accounts, security settings or where the pod runs. They would tie every app that sets them to Kubernetes, and some
  would let an app weaken its isolation from other apps.

### The runtime directory

The runtime directory holds one subdirectory per kind of value that arrives as a file:

```text
<runtime directory>/
  runtime-config/        runtime configuration: every JSON file, in ordinal order of the file names
  app-secrets/           app secrets: every JSON file, in ordinal order of the file names
  provisioned-secrets/   provisioned secrets: read by file name, never part of the app's configuration
```

- The runtime cluster mounts the directory into a deployed app. studioctl writes it for a local run.
- One startup value, `ALTINN_RUNTIME_DIRECTORY`, says where the directory is. It replaces `RUNTIME_APP_SECRETS_DIR`.
  The names of the subdirectories and of the provisioned secret files are fixed in the contract file, so the
  `RUNTIME_APP_SECRETS_*_FILENAME` variables go too.
- The app libraries load every JSON file in `runtime-config/` and `app-secrets/`, not a fixed list. A new source is
  a new file, and needs no library release. The libraries list the files when the app starts, so a new file reaches
  an app when its pods restart. A change to an existing file reaches it while it runs.
- Writers replace a file in one step. Kubernetes does this for mounted volumes, and studioctl writes to a temporary
  file and renames it.

### The order of the app's configuration

The app's configuration is layered from lowest to highest:

1. Defaults in the app libraries, for app configuration only
2. `appsettings.json`, then `appsettings.<ASP.NET Core environment>.json`
3. In Development only: user secrets, then `appsettings.Local.json`
4. Environment variables, then the command line
5. App secrets: the files in `app-secrets/`, in name order
6. Runtime configuration: the files in `runtime-config/`, in name order

- The order is compiled into the app libraries. App secrets always come below runtime configuration, so no secret in
  the service owner's vault can change a value we own.
- Within `runtime-config/`, the runtime cluster names the files so that a more specific source sorts later: the file
  that is the same in every environment, then the file for the environment, then the file for the service owner. The
  contract file lists the names. This replaces today's rule that files with "override" in the name load last.
- The libraries' sources are the last ones in the app's configuration. The startup check fails if app code adds a
  source after them, and names it.
- How the libraries set this up does not depend on the order of calls in the app's `Program.cs`, since that file is
  the app's and v9 writes it once.
- User secrets and `appsettings.Local.json` stay, for local runs only. ASP.NET Core loads user secrets in
  Development. The app libraries load `appsettings.Local.json` right after them, and only in Development, where
  today they load it last in every environment. Both hold the developer's local values for the app's own
  configuration and secrets, and neither can override a value we own.

### Runtime configuration

- Runtime configuration comes from three files, which the runtime cluster mounts into `runtime-config/`:
  - values that are the same in every environment, from [`infra/runtime/apps-config`](../../infra/runtime/apps-config)
  - values for the environment, from the same place
  - values for the service owner, which the runtime cluster provides, such as a value we roll out to one service
    owner first
- The app libraries reload the files. Code that reads runtime configuration through `IOptionsMonitor` picks up a
  change without a restart, where a change should apply while the app runs. The contract file says which values
  apply only at startup, and the runtime operator restarts the apps to apply a change to them.
- A reload that does not parse, or that leaves out a required value, does not apply. The libraries keep the last
  valid configuration and log an error.
- The app libraries have no defaults for runtime configuration, and the app template has no keys for it.
- Runtime configuration never arrives as an environment variable. Environment variables carry only startup values.
- The deploy pipeline adds no runtime configuration and looks up no values for an app. The values it adds today
  move:
  - the subscription key to provisioned secrets
  - the app's version to startup values
  - the Application Insights values out of v9 apps, since the collectors export for them

### Required values

- The app libraries check every required value at startup. The error names the value and who supplies it: the
  runtime cluster for a deployed app, studioctl for a local run.
- A value is required always, or required when a feature is on. The contract file names each feature and what in
  the app's own files turns it on, such as an eFormidling service task in the app's process. The libraries check the
  feature's values only when the app uses the feature.
- The suppliers provide every feature's values in every environment, so whether an app can use a feature does not
  depend on where it runs. Where a supplier cannot, the contract file says so, and the startup check names the
  feature and the environment instead of a value.
- When an optional value is missing, its feature is off, such as a link the app frontend then hides.

### The contract file

- The contract file is the specification of everything above, in a machine-readable form. It lives in
  `src/common/app-contract/`, since the app libraries, studioctl, the runtime operator and the deploy pipeline all
  use it.
- It lists:
  - the startup values
  - the runtime directory's subdirectories, the runtime configuration files' names and order, and the provisioned
    secret files with the section each holds
  - the runtime versions, the range of Altinn.App versions that implements each, and the port, the path and the
    probe paths for the pod around the app
  - every runtime configuration key, whether it is required always or for a feature, whether a change applies while
    the app runs, and who supplies it, including the keys that only a deployed app or only a local run has
  - which keys every app gets, such as the host name, and which only the Altinn.App libraries
    read, such as Altinn Platform endpoints, cookie names and the app frontend's links. The runtime gives every app
    the same files, and an app of another kind reads only what it needs.
  - the features, and where a supplier cannot provide one
  - the schema of `deployment/app.yaml`
- Each part is tested against it:
  - The app libraries build their startup check from it, so the check and the list cannot drift apart.
  - studioctl's tests check the files and environment it gives an app.
  - A test renders `infra/runtime/apps-config` for every environment and checks that it has every key it supplies.
  - `deploy-app.yaml` and studioctl validate `deployment/app.yaml` against the schema.
  - The runtime operator's tests check the files and startup values it writes, and that the `App` resource's schema
    matches.
- A change that adds a value adds it to the contract file and to its suppliers together. The tests fail until all of
  them have it.

### Local runs

- studioctl writes the same files into the runtime directory as the runtime cluster mounts, and sets the same
  startup values. Some values differ per run, such as the port, so studioctl writes the files before each run.
- A run from an IDE or `dotnet run` asks studioctl where the directory is.
- Without studioctl, the startup check stops the app and says how to start it.
- A local run that needs a different value, such as a `tt02` endpoint, gets it from studioctl. An environment
  variable in the developer's shell, user secrets and `appsettings.Local.json` do not override runtime
  configuration.
- A developer can keep local app secrets in user secrets or `appsettings.Local.json`, as today, or store them with
  studioctl, which writes them into `app-secrets/` as the runtime operator does for a deployed app. studioctl's
  values win.

### Provisioned secrets

The app libraries read provisioned secrets through a configuration root of their own, and never add them to the
app's configuration. This records the design of [#20433](https://github.com/Altinn/altinn-studio/pull/20433) and
[#20482](https://github.com/Altinn/altinn-studio/pull/20482), and extends it to every secret we provision for an
app. Since they have their own subdirectory, a provisioned secret that a later runtime adds never reaches the app's
configuration in a library that does not know it.

### App secrets

- The service owner keeps the app's secrets in the vault the service owner has in each environment, Key Vault
  today.
- The runtime operator reads the vault and writes the secrets the app may read into a Kubernetes Secret in the app's
  namespace. The runtime cluster mounts it into `app-secrets/` as one JSON file, in the same shape as
  `appsettings.json`.
- The operator reads the vault with the service owner's existing service principal, from
  `altinn-appsettings-secret`, until the runtime clusters offer workload identity. App pods no longer mount that
  secret.
- The app reads these secrets:
  - every secret whose name starts with `<app>--`, without the prefix
  - the shared secrets that `deployment/app.yaml` lists in `secrets.names`
  - with `secrets.all: true`, every secret in the vault under its own name, as the Key Vault configuration provider
    reads them today. The v9 upgrade sets it for apps that read the whole vault today. New apps do not get it.
- Where two secrets give the same key, the one with the app's prefix wins.
- A secret's name gives its key: `Section--Key` becomes `Section:Key`. This is our rule, not Key Vault's, and holds
  for any store behind the operator.
- What `secrets.all` includes can narrow later, such as leaving out other apps' prefixed secrets. That is a change
  in the operator, not in apps.
- When the operator cannot read the vault, it leaves the Secret as it is. The app keeps its last values, also when
  its pods restart. A new app's pods start only after the operator has written its secrets.
- The app libraries load the file as the app secrets layer and reload it when it changes. They have no Key Vault
  code. `ISecretsClient`, `KeyVaultSettings`, `AddAzureKeyVaultAsConfigProvider`, `Azure.Identity`,
  `Azure.Extensions.AspNetCore.Configuration.Secrets` and the retired `Microsoft.Azure.KeyVault` package go.
- App code reads a secret like any other setting, through `IConfiguration` or the Options pattern.
- For a local run, studioctl stores the developer's values for the app, as it stores a Maskinporten client today, and
  writes the same file. A local run needs no Azure login. User secrets and `appsettings.Local.json` also work, below
  studioctl's values.

### Altinn Platform endpoints and the subscription key

- Altinn Platform endpoints, such as `PlatformSettings:ApiStorageEndpoint` and `EFormidlingClientSettings:BaseUrl`,
  are runtime configuration, and the app libraries read them through `IOptionsMonitor`. Pointing apps at the egress
  proxy ([#21747](https://github.com/Altinn/altinn-studio/issues/21747)) is then a change to `apps-config`, which
  reaches running v9 apps without a restart. The `Altinn.Common.PEP` package reads the same values.
- The APIM subscription key is a provisioned secret. The app libraries read it themselves and send it on their calls
  to Altinn Platform, including the PEP package's calls. No public member exposes it, so
  `PlatformSettings.SubscriptionKey` and `General.SubscriptionKeyHeaderName` leave the public API. 13 apps in
  production use them in their own code, and the upgrade reports them.
- When the file is missing, the libraries send no header. Removing the key
  ([#21765](https://github.com/Altinn/altinn-studio/issues/21765)) then means the runtime operator stops writing the
  file, and needs no library release.
- Until #21765 removes it, the deploy carries the key, and the runtime operator writes it into
  `provisioned-secrets/`.

### Telemetry

- OTLP is the only way a v9 app exports telemetry. The app libraries drop the classic Application Insights SDK, the
  Azure Monitor exporter and the settings that chose between them.
- The exporter's settings are startup values, in the standard `OTEL_*` environment variables, as
  [observability.md](../observability.md#setting-up-a-service) asks of every service: the endpoint, the protocol, the
  metric export interval and the pod's UID in `OTEL_RESOURCE_ATTRIBUTES`. The runtime cluster sets them for a
  deployed app, from `infra/runtime/apps-config`, and studioctl for a local run. Without an endpoint, the app exports
  nothing, as in a local run without a collector.
- The libraries set no `OTEL_*` values in code, not even for Development.
- In a runtime cluster, the endpoint is the collectors' router in `runtime-obs`,
  `http://otel-router.runtime-obs.svc.cluster.local:4317`, over gRPC, the OTLP exporter's default protocol. The
  collectors are shared with our own services, with a pipeline of their own for apps:
  - The router tells apps' telemetry from ours by the namespace of the pod that sent it, which it finds by the pod's
    UID, and sends it to the apps pipeline.
  - The apps pipeline exports to the service owner's Application Insights, with the connection string the runtime
    cluster provides ([altinn-platform#4392](https://github.com/Altinn/altinn-platform/issues/4392)). It never falls
    back to our own backends.
  - It has its own exporters and queues, and a memory limiter, so a slow Application Insights does not hold up our
    own telemetry.
- Moving app telemetry to another backend changes the apps pipeline's exporter, not apps.
- We decide what reaches the service owner, with defaults that every app gets: traces sampled as ours are, logs from
  WARN, and metrics every 60 s rather than our services' 15 s, so Application Insights gets as many points as it does
  from v8 apps. We change a default in the collectors, and apps follow without a redeploy. Traces
  are for following a unit of work, and logs for what someone needs to act on, as
  [observability.md](../observability.md#which-signal-for-what) says.
- An app that needs more chooses other levels in [`deployment/app.yaml`](#deploymentappyaml). Code can keep a single
  trace, or a single log record below the app's level, by setting `altinn.studio.sampling` to `always` on it.

### `deployment/app.yaml`

- `deployment/app.yaml` is the one file in which a v9 app tells the runtime what it needs. `studioctl app upgrade v9`
  writes it into every app once, from `deployment/values*.yaml`, and removes `values*.yaml`, `Chart.yaml` and
  `deployment/templates`.
- It holds only what the service owner controls. The schema in the contract file validates it in studioctl and in
  the deploy, which reject an unknown field or a field we own.
- Its `apiVersion` and `kind` give the version of the file's schema. The optional `spec.runtimeVersion` sets the
  [runtime version](#the-runtime-version). The upgrade and the template leave it out.
- The fields the upgrade writes have to be right when v9 is stable. They carry over what apps set in
  `deployment/values*.yaml` today:
  - `scaling`: either a fixed number of replicas, or autoscaling with a minimum, a maximum and the CPU use it aims
    for. The schema accepts one or the other, never both.
  - `resources`: requests and limits
  - `environments`: the same fields for one environment, in place of `values.<environment>.yaml`
  - `secrets`: `names` and `all`, as [App secrets](#app-secrets) describes
- A field that an environment sets replaces the same field for all environments as a whole. An environment can then
  switch between a fixed number and autoscaling, and does not inherit half of a `resources` block.

  ```yaml
  spec:
    scaling:
      autoscaling: { min: 2, max: 10, cpuUtilization: 75 }
    environments:
      tt02:
        scaling:
          replicas: 1
  ```

- In production on 25.11.2026, 161 apps set `autoscaling`, 139 set `replicaCount` and 15 set `resources`. The app
  chart uses `replicaCount` only when autoscaling is off:
  - 32 apps turn autoscaling off and run a fixed number of replicas, 31 of them one. The upgrade writes a fixed
    `scaling.replicas` for them.
  - 107 apps set `replicaCount` while autoscaling is on, so it has no effect. The upgrade drops it and says so.
- No app in production has a `values.<environment>.yaml` yet. In `tt02`, 83 apps from 2 service owners have one,
  which sets autoscaling and resources for `tt02` or production.
- A field the upgrade does not write can come later, since an app without it gets our default. `telemetry` is one. It
  sets the app's telemetry levels, each from a fixed set, and an environment can set its own:

  ```yaml
  spec:
    telemetry:
      traces: sampled # sampled | all | errors
      logs: warning # warning | information
      metricInterval: 60s # 60s | 15s
    environments:
      tt02:
        telemetry:
          logs: information
  ```

  - The levels name outcomes, not percentages or collector settings, so we can change what a level keeps, and the
    collectors need no configuration per app. `sampled` keeps traces with an error, slow traces and a share of the
    rest. `all` keeps every trace, so request counts in Application Insights are exact. `errors` keeps only traces
    with an error and slow traces. `information` keeps logs from INFO.
  - The runtime writes the trace and log levels as labels on the app's Deployment, not on its pods, so a change
    restarts nothing. The collectors read them from there, and ignore any value the app's telemetry carries, so app
    code cannot change its own level.
  - The metric interval is a setting of the app's SDK, so the runtime sets `OTEL_METRIC_EXPORT_INTERVAL` from it. It
    is the one startup value an app can choose.
  - A local run keeps every signal and level, whatever the app sets.

- The upgrade drops what we own, such as the probes, the `datakeys`, `accesstoken` and `altinn-appsettings-secret`
  volumes, `image`, `service`, `ingressRoute` and `linkerd`. It reports anything else it cannot carry over. In
  production, 776 apps turn the probes on, as the template does, and 5 set probe timings of their own, which the
  upgrade reports.

### v8 apps

- v8 apps do not change. They keep getting runtime configuration as environment variables, read Key Vault as they do
  today, and export telemetry as they do today. The runtime cluster provides their Application Insights connection
  string and instrumentation key as environment variables, so the deploy pipeline no longer looks them up.
- v8 and v9 apps run side by side in the same runtime clusters. The runtime chooses the shape for each deploy from
  its runtime version, not for each app, so a rolling update and a redeploy of an older v8 release both work. A v9
  app without `deployment/app.yaml` would get the v8 shape, and stops at the startup check.
- The environment variables for v8 apps and the files for v9 apps come from one source, so the two cannot disagree.
  v9 apps never get the v8 environment variables, which would hide a value missing from the files.
- The v8 libraries from 8.11 read every JSON file at the top of `/mnt/app-secrets`. v9's subdirectories stay out of
  their way.
- A user keeps their session when an app moves to v9. v9 apps read the same data protection keys as v8 apps, and the
  cookie names in runtime configuration keep v8's values.

## Problem context

An app depends on values it does not own, such as Altinn Platform addresses, host names and cookie names. They
differ per environment, some also per service owner, and we need to change them without waiting for every service
owner to change and redeploy their apps. We have seen what happens otherwise:

- The app frontend hardcoded a logout URL, and we had to patch it by hand on the CDN.
- When a Maskinporten environment was deprecated, apps needed source changes.
- The deploy pipeline added the PDF generator's address. Apps that were not redeployed kept the old one, which
  complicated the PDF migration.

Before v9, these values reach an app in several ways at once, and nothing checks that they agree:

- The app libraries have defaults for most of them, and many are wrong for v9. `PlatformSettings` defaults to
  `localhost:5101`, while studioctl provides `local.altinn.cloud:8000`. When a value is missing, the app runs on the
  default and fails later, somewhere else.
- The app template repeats many of the same values in `appsettings.json`, so every app carries a copy.
- The config map, the deploy pipeline and studioctl all add them as environment variables, which the app libraries
  load above the runtime files and so hide every change to them.
- An app can override any of them in its own configuration, by accident or on purpose.

Secrets and telemetry put a cloud provider inside every app:

- To use Key Vault, an app mounts a cluster secret with a service principal's client secret, and calls a method in
  `Program.cs`. The app libraries then connect to the vault with the Azure SDK and read all of it. In production on
  25.11.2026, 268 of the 792 apps, from 33 service owners, mount that secret. 216 read the whole vault through a
  configuration provider, 77 call `ISecretsClient`, and 23 build an Azure credential of their own.
- The app libraries carry the classic Application Insights SDK and the Azure Monitor exporter, and the deploy
  pipeline looks up each app's connection string in the service owner's subscription.

v9 is the major version where we can make the breaking changes, and it has a deadline of its own. Service owners run
`studioctl app upgrade v9` until v9 is stable, and not after. What v9 writes into an app's files, what it puts in the
libraries' public API and what it builds into the libraries has to be right at stable. Once the contract is in every
app, later changes on our side reach v9 apps without a redeploy:

- the egress proxy to Altinn Platform ([#21747](https://github.com/Altinn/altinn-studio/issues/21747),
  [#21527](https://github.com/Altinn/altinn-studio/pull/21527))
- removing the APIM subscription key ([#21765](https://github.com/Altinn/altinn-studio/issues/21765))
- collectors for app telemetry ([#19775](https://github.com/Altinn/altinn-studio/issues/19775))
- the `App` resource that the runtime operator turns into the app's deployment
  ([#21792](https://github.com/Altinn/altinn-studio/issues/21792))
- moving off Azure

## Decision drivers

We weigh the alternatives against the [architecture principles](../architecture.md).

- D1: Each value has one owner, who changes it in one place.
- D2: We change the values we own, and how apps reach Altinn Platform and export telemetry, without app source
  changes or redeploys.
- D3: A missing value is visible when the app starts, with an error that says who supplies it.
- D4: A local run gets its values the same way a deployed app does.
- D5: An app cannot change a value we own.
- D6: The solution fits our Kubernetes and GitOps operating model.
- D7: What v9 writes into an app's files, its public API and the mechanisms inside the app libraries are right when
  v9 is stable, since after that they change only when a service owner upgrades the app.
- D8: Apps and the app libraries depend on open standards, not on a cloud provider's SDK or services
  ([open standards](../architecture.md#open-standards-and-protocols),
  [minimal dependencies](../architecture.md#minimal-dependencies),
  [digital sovereignty](../architecture.md#digital-sovereignty)).
- D9: An app holds no static credential it does not need, and each service owner's secrets and telemetry stay with
  that service owner ([security in depth](../architecture.md#security-in-depth),
  [isolation](../architecture.md#isolation), [privacy](../architecture.md#privacy)).
- D10: Nice to have: An app's `appsettings.json` holds only the app's own choices.
- D11: Nice to have: The v9 upgrade changes as little of an app's own code as it can.

## Alternatives considered

**How runtime configuration reaches the app**

- A1.1: Keep the current setup: library defaults, values in the app template, environment variables from the config
  map, the deploy pipeline and studioctl.
- A1.2: Define the values we own in GitOps and deliver them as environment variables only. Keep the library defaults
  as a fallback.
- A1.3: Define the values we own in GitOps and deliver them as files, in a runtime cluster and in a local run. Remove
  the library defaults, check required values at startup, and let our values win.
- A1.4: As A1.3, but read runtime configuration through a configuration root of its own, as the app libraries do
  for provisioned secrets.

**How app secrets reach the app**

- A2.1: The runtime operator reads the service owner's vault and writes the app's secrets as a file into the
  runtime directory.
- A2.2: The app libraries read the service owner's Key Vault as a configuration provider, on by default, with the
  vault's address and credential as a provisioned secret.

**How app code reads a secret**

- A3.1: Through configuration. v9 removes `ISecretsClient`, and the upgrade rewrites calls to it.
- A3.2: A neutral `ISecretsClient` with only `GetSecret`, which reads the app's configuration.

**Where v9 apps export telemetry**

- A4.1: OTLP to the collectors in `runtime-obs`, which export to the service owner's Application Insights.
- A4.2: The Azure Monitor exporter, directly to the service owner's Application Insights, until there are
  collectors for apps.
- A4.3: OTLP to DIS's `otel-collector`, which has a variant for apps.
- A4.4: OTLP to a separate collector for apps in each runtime cluster.

**How the runtime directory keeps provisioned secrets out of the app's configuration**

- A5.1: A subdirectory per kind of value.
- A5.2: One directory, where the app libraries leave out the provisioned secret files by name, as v9 does today.

## Pros and cons

### A1.1: Keep the current setup

- Good, because it needs no migration.
- Bad, because a value has several owners and several sources that can disagree, against D1.
- Bad, because values in app source and in the deploy pipeline need app changes or redeploys, against D2.
- Bad, because a missing value falls back to a default, against D3.
- Bad, because apps can override any value, against D5.

### A1.2: Environment variables from GitOps, with library defaults

- Good, because it satisfies D1 and D6, and is close to today.
- Bad, because a change to an environment variable reaches an app only when its pods restart, which weakens D2.
- Bad, because the defaults still hide missing values, against D3.
- Bad, because an app can set the same environment variables in its deployment, against D5.

### A1.3: Files from GitOps and studioctl, no defaults, our values win

- Good, because each value has one owner and one source, which satisfies D1 and D6.
- Good, because the app libraries reload the files, so a change reaches running apps without a redeploy (D2).
- Good, because the startup check reports a missing value by name (D3).
- Good, because studioctl writes the same files a runtime cluster mounts, which satisfies D4.
- Good, because our values come last, so the app's own sources cannot override them (D5).
- Good, because the template and upgraded apps no longer carry copies of our values (D10).
- Bad, because a change reaches only the code written to pick it up without a restart.
- Bad, because it changes every part that handles app configuration: the app libraries, studioctl, the config map,
  the deploy pipeline, the template and the v9 upgrade.

### A1.4: As A1.3, with runtime configuration in a configuration root of its own

- Good, because no source the app controls can even see runtime configuration, which satisfies D5 most strictly.
- Bad, because apps read runtime configuration for good reasons, such as the app's external URL to build links, or
  Altinn Platform endpoints for their own clients. They would need a new API for each value.
- Bad, because the app libraries bind their own options from the app's configuration, and would need two roots.

### A2.1: The runtime operator writes the app's secrets into a file

- Good, because the app libraries carry no Azure SDK and no vault client for the life of v9 (D7, D8).
- Good, because no app pod holds the service owner's service principal secret, which gives access to the whole
  vault. Moving to workload identity changes only the runtime operator (D9).
- Good, because an app does not need Azure to start. When the vault is unreachable, the app keeps its last values,
  also across restarts.
- Good, because an app reads only its own secrets and the ones it lists, apart from apps with `secrets.all`.
- Good, because a local run reads the same file, without an Azure login (D4).
- Good, because the runtime operator already reads Key Vault for other secrets, so the dependency moves from every
  app to one component that we deploy by ring.
- Good, because moving to another store, or to secrets that service owners manage in Studio, changes the runtime
  operator and not apps (D2, D8).
- Bad, because the secrets are also stored in a Kubernetes Secret in the app's namespace. Today the same namespace
  holds the service principal secret that reads the whole vault, so what can be read there does not grow.
- Bad, because a fault in the runtime operator stops changed secrets from reaching apps, although apps keep running.
- Bad, because a Kubernetes Secret holds at most 1 MiB, which limits how much of a large vault an app with
  `secrets.all` can read.
- Bad, because Key Vault's keys and certificate objects are not available to app code. No app in production calls
  `GetKey`, and the one that implements `GetCertificate` does so in a test fake.
- Bad, because `secrets` in `deployment/app.yaml` has to be settled before v9 is stable (D7).

### A2.2: The app libraries read Key Vault

- Good, because it adds no component. It is what 216 apps set up in `Program.cs` today, and a change reaches the app
  within 5 minutes without the runtime operator.
- Good, because secrets stay only in Key Vault, with no copy in the cluster.
- Good, because app code can still use Key Vault's own features through the SDK.
- Bad, because the Azure SDK is in the app libraries for the life of v9, and leaving Azure needs a library release
  and every app upgraded, against D7 and D8.
- Bad, because every app pod holds a static credential that reads the whole vault, against D9.
- Bad, because every app needs Azure to start. An app that cannot read its vault stops, also when it restarts during
  an outage.
- Bad, because every app reads every secret in its service owner's vault.
- Bad, because a local run cannot read secrets the way a deployed app does, and has to use another source, such as
  user secrets or `appsettings.Local.json`, against D4.

### A3.1: Secrets through configuration only

- Good, because app code reads every value one way.
- Good, because nothing in the public API is shaped by Key Vault, such as its `--` naming (D7, D8).
- Bad, because the upgrade rewrites the calls in the 77 apps that use `ISecretsClient`, and injects `IConfiguration`
  where a class does not have it. Most calls pass a variable rather than a literal name. A call it cannot rewrite
  becomes a task for the developer (D11).

### A3.2: A neutral `ISecretsClient` over configuration

- Good, because the apps that call `GetSecret` compile without changes (D11).
- Bad, because it is a second way to read a configuration value, in the public API for the life of v9.
- Bad, because the Key Vault naming rule, `--` for `:`, becomes part of the public API.
- Bad, because `GetSecret` throws for a missing secret while configuration returns null, so the same value behaves
  differently depending on how app code reads it.

### A4.1: OTLP to the `runtime-obs` collectors

- Good, because OTLP is the open standard we already use (D8), and the app libraries drop two Azure packages (D7).
- Good, because the router and the gateway already run in every runtime cluster. The router accepts every namespace,
  and finds an app's pod by the `k8s.pod.uid` that the app chart sets.
- Good, because moving app telemetry to another backend, or adding our own dashboards on app metrics, changes the
  collectors and not apps (D2).
- Good, because we decide sampling and which logs to keep, and roll changes out by ring.
- Good, because each runtime cluster serves one service owner, so the apps pipeline carries only that service
  owner's telemetry, and sends it only to that service owner's Application Insights (D9).
- Bad, because the collectors are sized for our own services, and need more replicas or autoscaling for apps.
- Bad, because app telemetry and ours share each collector's memory, so a flood from apps can make the collector
  refuse our own telemetry.
- Bad, because v9 apps in an environment lose their telemetry until the apps pipeline runs in its runtime clusters.
- Bad, because apps that use the Application Insights SDK in their own code have to move to OpenTelemetry. 9 apps in
  production do, and 2 of them use it to keep national identity numbers out of their telemetry.

### A4.2: The Azure Monitor exporter, until there are collectors

- Good, because it works without new infrastructure, and service owners see what they see today.
- Bad, because the Azure Monitor exporter stays in the app libraries for the life of v9, against D7 and D8.
- Bad, because the connection string becomes runtime configuration in every app, and moving to collectors depends on
  every app reading the new settings correctly.

### A4.3: DIS's `otel-collector`

- Good, because another team runs it.
- Bad, because its defaults would cut what service owners see today: 0.1% of traces, and no logs below WARN. Every
  DIS team shares the defaults, and an app can only choose between the default and all traces.

### A4.4: A separate collector for apps

- Good, because app volume cannot affect our own telemetry.
- Bad, because it adds pods to every runtime cluster, and a second configuration to keep in step with the first.

### A5.1: A subdirectory per kind of value

- Good, because the app libraries tell the kinds apart by where a file is, not by a list of names compiled into
  them. A provisioned secret that a later runtime adds never reaches the app's configuration (D5, D7).
- Good, because the order between app secrets and runtime configuration does not depend on file names.
- Bad, because the runtime cluster, the runtime operator and studioctl change where they write the files, before
  v9 is stable.

### A5.2: One directory, provisioned secret files left out by name

- Good, because it is how v9 works today.
- Bad, because a library only leaves out the files it knows. A provisioned secret that a later runtime adds lands in
  the app's configuration of every older library, above the other runtime configuration (D5, D7).

## Decision rationale

The main reason is ownership. The values that depend on where an app runs are part of the contract around the app.
We own that contract, so we deliver the values, we keep them correct, and an app cannot change them. v9 is the last
chance to put the contract into every app, so it holds only what we can keep stable, and leaves everything else on
our side, where we can change it later.

Runtime configuration (A1.3):

- Files fit the GitOps model we already use, and they can change while the app runs. An environment variable with
  the same key would hide every later change to a file, so runtime configuration arrives only as files, above every
  source the app controls.
- studioctl writes the same files on a developer's machine, so a local run behaves like a deployed one.
- A default hides a value nobody supplied, and is often wrong for the environment the app runs in. Without defaults,
  a missing value is an error at startup instead of a wrong request later.
- The app libraries load every file in the directory, so we can add a source, such as a file for one service owner,
  with no library release. Only the order between kinds is compiled in, because that order is what keeps the service
  owner's vault from changing our values.
- A contract file that drives the startup check, and tests against it in every supplier, keep the check and the
  suppliers from drifting apart.
- User secrets and `appsettings.Local.json` stay for local runs, below every value we own. Developers keep the
  tools they use today, and a local run works before studioctl stores app secrets. The cost is that a local value
  can exist where the deployed app has none, which the startup check does not see, since it checks only the values
  we own.
- A1.4 protects runtime configuration best, but apps have good reasons to read it. Putting our values last gives the
  same result for overrides and keeps reading simple.

App secrets (A2.1):

- A2.2 puts a cloud provider's SDK, a static credential and Azure's availability into every app for the life of v9.
  A2.1 keeps all three in the runtime operator, which already reads Key Vault, and which we can change at any time.
- The cost is a copy of the secrets in the cluster, in a namespace that already holds a credential to the whole
  vault, and a new duty for the runtime operator.
- The app's contract does not say where secrets are stored. The field in `deployment/app.yaml` is `secrets`, not
  `keyVault`, so moving service owners off the Azure portal, or off Key Vault, changes nothing in apps.

Reading secrets (A3.1):

- Secrets are configuration once they reach the app. One way to read them keeps the public API small, and leaves no
  Key Vault naming in it. A3.2 would save the upgrade from rewriting calls, at the cost of keeping a second way to
  read configuration in the public API for the life of v9.

Telemetry (A4.1):

- OTLP is our standard, and the `runtime-obs` collectors already run where the apps run. App telemetry carries
  service owners' data, so the apps pipeline sends it only to the service owner's Application Insights, never to
  ours.
- A4.2 would keep the Azure Monitor exporter in every v9 app, only to remove it in the next major version.

The runtime directory (A5.1):

- A list of provisioned secret files compiled into the libraries goes stale the day we add one. Subdirectories make
  the kind of a file part of where it is, which no later change on our side can get wrong for an older library.
- `RUNTIME_APP_SECRETS_DIR` names a directory that holds much more than secrets, and "app secrets" is the name of
  another kind. The name cannot change after v9 is stable without a library upgrade in every app.

The runtime version:

- The runtime contract lasts longer than a major version of the app libraries, and covers apps that have no
  Altinn.App libraries at all. A version of its own lets a new kind of app use the contract as it is.
- A form app's libraries implement one runtime version, so the version follows from them, and the app's files do not
  repeat it. The build decides it once and records it, so the runtime never infers it from a package.
- Starting at 9 places the first runtime version next to the libraries that implement it.
- The OTLP exporter's settings are environment variables, because that is how OpenTelemetry SDKs in every language
  read them, and how our own services get them. They apply only at startup, so a file would not let them change
  while the app runs.
- We set how an app runs, so most apps configure nothing, and we can change how the runtime runs apps without app
  changes. The probe paths are in the contract because the app serves them.
- An app that needs more gets a field in its own terms rather than a part of Kubernetes. The contract then survives
  a move off Kubernetes, and we keep each field we add, since apps depend on it.

`deployment/app.yaml` here, the deploy model in its own ADR:

- `deployment/app.yaml` is the other half of the contract. The upgrade writes it into every app once, and its
  `secrets` field is part of the app secrets decision, so it belongs here.
- How the runtime turns the file into a running app, through the `App` resource, the runtime operator and the app
  chart, stays on our side. It can change after v9 is stable without app changes, and has alternatives of its own,
  such as how existing apps move. It gets its own ADR, decided together with this one.

### What leaving Azure takes

These are the Azure services left in the contract, and what leaving each takes. None of them needs an app change.

- Key Vault, where service owners keep app secrets: the runtime operator reads another store, and service owners
  move their secrets there. Once Studio has a page for secrets, it writes to whatever store we run.
- The credential the runtime operator reads a vault with, a service principal and later workload identity: the
  operator authenticates to the new store instead.
- Application Insights, where app telemetry ends up: the apps pipeline exports to another backend. Service owners
  rebuild the queries and alerts they have in Application Insights.
- The connection string the runtime cluster provides for it: goes with Application Insights.
- The APIM subscription key: goes with APIM, through #21765.

v8 apps keep Key Vault in their own code, so leaving Key Vault for them needs the service owner to upgrade them.
Their telemetry can move without an upgrade from 8.11, where `AppSettings:UseOpenTelemetry` and
`AppSettings:UseOpenTelemetryCollector` in the config map send it to the collectors. That changes the shape of the
service owner's data in Application Insights, so we do it with the service owners rather than for them.

## Consequences

- These issues track the work:
  - [#20980](https://github.com/Altinn/altinn-studio/issues/20980): runtime configuration
  - [#19779](https://github.com/Altinn/altinn-studio/issues/19779): app secrets
  - [#19777](https://github.com/Altinn/altinn-studio/issues/19777): the Azure packages the app libraries drop
  - [#19775](https://github.com/Altinn/altinn-studio/issues/19775): OpenTelemetry
  - [#21792](https://github.com/Altinn/altinn-studio/issues/21792): `deployment/app.yaml` and the `App` resource
- The ADR for the `App` resource is written and decided together with this one.
- `studioctl app upgrade v9`:
  - removes the values we own from `appsettings*.json`, and tells the developer where the app had set one
  - removes the Key Vault opt-in from `Program.cs` and the `altinn-appsettings-secret` volume
  - writes `deployment/app.yaml`, with `secrets.all` for apps that read the whole vault today, and the names apps
    pass to `GetSecret` as literals in `secrets.names`
  - rewrites `GetSecret` calls into configuration lookups, and reports the calls it cannot rewrite, `GetKey`, and
    apps with Azure credential code or Application Insights SDK code of their own
- The runtime operator writes the runtime directory's files, syncs app secrets and sets the startup values for v9
  apps. The deploy pipeline stops adding environment variables to them.
- The app libraries still use `Altinn.Common.AccessTokenClient`, which brings in the retired Key Vault package. v9
  replaces it, either by signing platform access tokens in the libraries or by leaving it to the egress proxy
  ([#21767](https://github.com/Altinn/altinn-studio/pull/21767)).
- The runtime clusters provide the service owner's Application Insights connection string
  ([altinn-platform#4392](https://github.com/Altinn/altinn-platform/issues/4392)) to the collectors and to v8 apps,
  before the deploy pipeline stops looking it up.
- The `runtime-obs` collectors get the apps pipeline, in every runtime cluster, before v9 apps run in that
  environment.
- We take on workload identity for the runtime operator when the platform team offers it in the runtime clusters.
- As the work lands, [`src/App/README.md`](../../src/App/README.md) describes how configuration reaches an app and
  links here, and [observability.md](../observability.md) says how v9 apps report telemetry.
