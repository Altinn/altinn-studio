# v9 apps get the configuration and secrets we own as files, and cannot override them

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 02.11.2026

## Result

A3: Every value a v9 app reads belongs to one of the kinds below, and each kind has one owner and one way into the
app. Team Altinn Studio owns the values that depend on where the app runs. The runtime cluster mounts them as files
in the app's runtime directory, and studioctl writes the same files for a local run. The app cannot override them,
and the app libraries have no defaults for them. A required value that is missing stops the app at startup, and the
error names the value and who supplies it.

### Kinds of values

| Kind                  | Examples                                                                                              | Owner              | Deployed app                                                                    | Local run                                              | App can override |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------- |
| Provisioned secrets   | The app's Maskinporten client, app codes, the Key Vault connection                                    | Team Altinn Studio | Files the runtime cluster mounts into the runtime directory                     | Files studioctl writes into the runtime directory      | No               |
| Runtime configuration | Altinn Platform endpoints, host names, cookie names, links to other Altinn services, telemetry export | Team Altinn Studio | JSON files from `infra/runtime/apps-config`, mounted into the runtime directory | JSON files studioctl writes into the runtime directory | No               |
| Startup values        | The environment name, where the runtime directory is and what its files are called, the app's version | Team Altinn Studio | Environment variables                                                           | Environment variables studioctl sets                   | No               |
| Contracts             | The validation message prefixes that app code writes and the app libraries parse                      | Team Altinn Studio | Constants in the app libraries                                                  | The same                                               | No               |
| App configuration     | Which validations run, PDF settings, the app's own integrations                                       | The app            | `appsettings*.json`, over defaults in the app libraries                         | The same, plus `appsettings.Local.json`                | Yes              |
| App secrets           | API keys for the app's own integrations                                                               | The service owner  | The service owner's Key Vault                                                   | User secrets or `appsettings.Local.json`               | Yes              |

The app's configuration is layered from lowest to highest:

1. Defaults in the app libraries
2. `appsettings*.json`
3. Key Vault
4. Runtime configuration

Provisioned secrets are not part of the app's configuration.

### Runtime configuration

- We define it once per environment in [`infra/runtime/apps-config`](../../infra/runtime/apps-config).
- The app libraries reload the files. Code that reads runtime configuration picks up a change without a restart,
  where a change should apply while the app runs.
- The app libraries have no defaults for it, and the app template has no keys for it.
- The app libraries check every required value at startup. Some values are required only when the feature that
  uses them is on, such as eFormidling. When an optional value is missing, its feature is not configured.
- Nothing the app controls overrides runtime configuration:
  - `appsettings*.json`
  - environment variables in the app's `deployment/values.yaml`
  - Key Vault
- A local run that needs a different value, such as a `tt02` endpoint, gets it from studioctl.
- Runtime configuration never arrives as an environment variable. Environment variables carry only startup values.
- The deploy pipeline adds no runtime configuration. The values it adds today move to the kinds above.
- v8 apps keep getting runtime configuration as environment variables.

### Local runs

- studioctl writes the same files into the runtime directory as the runtime cluster mounts, and sets the same
  startup values.
- A run from an IDE or `dotnet run` asks studioctl where the directory is.
- Without studioctl, the startup check stops the app and says how to start it.
- A shared contract lists the runtime configuration keys and the provisioned secret files, including the ones only
  a deployed app or only a local run has. Tests in studioctl, the app libraries and the config map check against
  it.

### Provisioned secrets

The app libraries read provisioned secrets through a configuration root of their own, and never add them to the
app's configuration. The runtime cluster names the directory and every file in it for a deployed app, and studioctl
does for a local run. The app libraries assume neither. This records the design of
[#20433](https://github.com/Altinn/altinn-studio/pull/20433) and
[#20482](https://github.com/Altinn/altinn-studio/pull/20482), and extends it to every secret we provision for an
app.

### App secrets and Key Vault

- Every service owner has a Key Vault in each environment. A deployed v9 app always reads its configuration from
  it. The app no longer opts in from `Program.cs` or `deployment/values.yaml`.
- The vault's address and credential reach the app as a provisioned secret. Until the runtime clusters give apps a
  workload identity, they come from the service owner's existing `altinn-appsettings-secret`, which holds a service
  principal's client secret.
- A deployed app that cannot read its vault at startup stops.
- A local run does not connect to Azure. App secrets come from user secrets or `appsettings.Local.json`.

### Telemetry

OpenTelemetry is the only telemetry path in v9. Where an app exports telemetry is runtime configuration.
[Monitoring telemetry collection and distribution](2026-01-07-monitoring-telemetry-collection-distribution.md)
decides which backend the telemetry goes to.

## Problem context

An app depends on values it does not own, such as Altinn Platform addresses, host names and cookie names. They
differ per environment, and we need to change them without waiting for every service owner to change and redeploy
their apps. We have seen what happens otherwise:

- The app frontend hardcoded a logout URL, and we had to patch it by hand on the CDN.
- When a Maskinporten environment was deprecated, apps needed source changes.
- The deploy pipeline added the PDF generator's address. Apps that were not redeployed kept the old one, which
  complicated the PDF migration.

Before v9, these values reach an app in several ways at once, and nothing checks that they agree:

- The app libraries have defaults for most of them, and many are wrong for v9. `PlatformSettings` defaults to
  `localhost:5101`, while studioctl provides `local.altinn.cloud:8000`. When a value is missing, the app runs on the
  default and fails later, somewhere else.
- The app template repeats many of the same values in `appsettings.json`, so every app carries a copy.
- The config map, the deploy pipeline and studioctl all add them as environment variables. The config map also has
  the same values as JSON files, but nothing mounts them into the app. If it did, the environment variables would
  hide every change to the files.
- An app can override any of them in its own configuration, by accident or on purpose.
- To use Key Vault, an app mounts a cluster secret and calls a method in `Program.cs`. The app libraries then add
  the secret's service principal credentials to the app's configuration, where any app code can read them.

v9 has already moved provisioned secrets to their own channel
([#20433](https://github.com/Altinn/altinn-studio/pull/20433)). The other values need the same treatment, and v9 is
the major version where we can make the breaking changes.

## Decision drivers

- D1: Each value has one owner, and the owner changes it in one place.
- D2: We change the values we own without app source changes or redeploys.
- D3: A missing value is visible when the app starts, with an error that says who supplies it.
- D4: A local run gets its values the same way a deployed app does.
- D5: An app cannot change a value we own.
- D6: The solution fits our Kubernetes and GitOps operating model.
- D7: Nice to have: An app's `appsettings.json` holds only the app's own choices.

## Alternatives considered

- A1: Keep the current setup: library defaults, values in the app template, environment variables from the config
  map, the deploy pipeline and studioctl, and Key Vault as an opt-in.
- A2: Define the values we own in GitOps and deliver them as environment variables only. Keep the library defaults
  as a fallback.
- A3: Define the values we own in GitOps and deliver them as files, in a runtime cluster and in a local run. Remove
  the library defaults, check required values at startup, and let our values win. Add Key Vault by default.
- A4: As A3, but read runtime configuration through a configuration root of its own, as the app libraries do for
  provisioned secrets.

## Pros and cons

### A1: Keep the current setup

- Good, because it needs no migration.
- Bad, because a value has several owners and several sources that can disagree, against D1.
- Bad, because values in app source and in the deploy pipeline need app changes or redeploys, against D2.
- Bad, because a missing value falls back to a default, against D3.
- Bad, because apps can override any value, against D5.

### A2: Environment variables from GitOps, with library defaults

- Good, because it satisfies D1 and D6, and is a small change from today.
- Bad, because a change to an environment variable reaches an app only when its pods restart, which weakens D2.
- Bad, because the defaults still hide missing values, against D3.
- Bad, because an app can set the same environment variables in its `deployment/values.yaml`, against D5.

### A3: Files from GitOps and studioctl, no defaults, our values win

- Good, because each value has one owner and one source, which satisfies D1 and D6.
- Good, because the app libraries reload the files, so a change reaches running apps without a redeploy (D2).
- Good, because the startup check reports a missing value by name (D3).
- Good, because studioctl writes the same files a runtime cluster mounts, which satisfies D4.
- Good, because our values come last, so the app's own sources cannot override them (D5).
- Good, because the template and upgraded apps no longer carry copies of our values (D7).
- Bad, because a change reaches only the code written to pick it up without a restart.
- Bad, because it changes every part that handles app configuration: the app libraries, studioctl, the config map,
  the deploy pipeline, the template and the v9 upgrade.
- Bad, because every deployed app depends on its Key Vault when it starts.

### A4: As A3, with runtime configuration in a configuration root of its own

- Good, because no source the app controls can even see runtime configuration, which satisfies D5 most strictly.
- Bad, because apps read runtime configuration for good reasons, such as the app's external URL to build links, or
  Altinn Platform endpoints for their own clients. They would need a new API for each value.
- Bad, because the app libraries bind their own options from the app's configuration, and would need two roots.

## Decision rationale

We choose A3. The main reason is ownership. The values that depend on where an app runs are part of the runtime
contract around the app. We own that contract, so we deliver the values, we keep them correct, and an app cannot
change them.

- Files fit the GitOps model we already use, and they can change while the app runs. An environment variable with
  the same key would hide every later change to a file, so runtime configuration arrives only as files.
- studioctl can write the same files on a developer's machine, so a local run behaves like a deployed one.
- A default hides a value nobody supplied, and is often wrong for the environment the app runs in. Without
  defaults, a missing value is an error at startup instead of a wrong request later.
- A shared contract and tests keep studioctl, the app libraries and the config map from drifting apart.
- Key Vault as a provisioned secret keeps its credentials out of app code. A move to workload identity, or to a
  vault per app, then changes only the runtime cluster.
- v8 apps keep their environment variables, since this decision does not change how v8 apps read configuration.

A4 protects runtime configuration best, but apps have good reasons to read it. Putting our values last gives the
same result for overrides and keeps reading simple.

## Consequences

- These issues track the work:
  - [#20980](https://github.com/Altinn/altinn-studio/issues/20980): runtime configuration
  - [#19775](https://github.com/Altinn/altinn-studio/issues/19775): OpenTelemetry
  - [#19779](https://github.com/Altinn/altinn-studio/issues/19779): Key Vault
- The v9 app template and `studioctl app upgrade v9` remove the values we own from `appsettings*.json`, and the
  Key Vault opt-in from `Program.cs` and `deployment/values.yaml`. Where an app had set a value we now own, the
  upgrade tells the developer that it no longer applies.
- The deploy pipeline mounts the runtime configuration files into v9 apps, and stops adding the same values as
  environment variables.
- A change that adds runtime configuration adds it to `infra/runtime/apps-config` and studioctl together, and the
  contract test fails until both have it.
- We take on workload identity for apps, and a vault per app, when the platform team offers them in the runtime
  clusters.
- As the work lands, [`src/App/README.md`](../../src/App/README.md) describes how configuration reaches an app and
  links here.
