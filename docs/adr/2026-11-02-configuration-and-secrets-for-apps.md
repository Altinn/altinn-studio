# The platform delivers the configuration and secrets it owns to v9 apps as files, and apps cannot override them

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 02.11.2026

## Result

A3: Every value a v9 app reads belongs to one of the kinds below, and each kind has one owner and one way into the
app. Team Altinn Studio owns the values that depend on where the app runs. The platform delivers them as files in
the app's runtime directory, in a cluster and in a local run alike, and the app cannot override them. The app
libraries have no defaults for them. A required value that is missing stops the app at startup, and the error names
the value and who supplies it.

### Kinds of values

| Kind                  | Examples                                                                                              | Owner              | Deployed app                                                                    | Local run                                              | App can override |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------- |
| Platform secrets      | The app's Maskinporten client, app codes, the Key Vault connection                                    | Team Altinn Studio | Files the platform mounts into the runtime directory                            | Files studioctl writes into the runtime directory      | No               |
| Runtime configuration | Platform endpoints, host names, cookie names, platform frontend links, telemetry export               | Team Altinn Studio | JSON files from `infra/runtime/apps-config`, mounted into the runtime directory | JSON files studioctl writes into the runtime directory | No               |
| Startup values        | The environment name, where the runtime directory is and what its files are called, the app's version | Team Altinn Studio | Environment variables                                                           | Environment variables studioctl sets                   | No               |
| Contracts             | The validation message prefixes that app code writes and the libraries parse                          | Team Altinn Studio | Constants in the app libraries                                                  | The same                                               | No               |
| App configuration     | Which validations run, PDF settings, the app's own integrations                                       | The app            | `appsettings*.json`, over defaults in the app libraries                         | The same, plus `appsettings.Local.json`                | Yes              |
| App secrets           | API keys for the app's own integrations                                                               | The service owner  | The service owner's Key Vault                                                   | User secrets or `appsettings.Local.json`               | Yes              |

The app's configuration is layered from lowest to highest: library defaults, `appsettings*.json`, Key Vault, then
runtime configuration. Platform secrets are not part of the app's configuration at all.

### Runtime configuration

- We define it once per environment in [`infra/runtime/apps-config`](../../infra/runtime/apps-config), and Flux
  delivers it. A change reaches running apps without a redeploy, because the platform mounts it as files and the
  app libraries reload them. Code that reads runtime configuration uses `IOptionsMonitor` where a change should
  apply while the app runs.
- The app libraries have no defaults for it, and the app template has no keys for it. A default hides a value
  nobody supplied, and is often wrong for the environment the app runs in.
- The app libraries check every required value at startup. Some values are required only when the feature that
  uses them is on, such as eFormidling. An optional value that is missing means its feature is not configured.
- Nothing the app controls overrides it: not `appsettings*.json`, not environment variables set in the app's
  `deployment/values.yaml`, and not Key Vault. A local run that needs a different value, such as a TT02 endpoint,
  gets it from studioctl.
- Environment variables carry only startup values: what the app needs before it can read the files, and facts
  about one deployment. An environment variable with the same key as a file would hide every later change to the
  file, so runtime configuration never also arrives as an environment variable.
- The deploy pipeline adds no runtime configuration. The values it injects today move to the kinds above.
- v8 apps keep getting runtime configuration as environment variables, since this decision does not change how v8
  apps read configuration.

### Local runs

studioctl is the platform of a local run. It writes the same files into the runtime directory that a cluster
mounts, and sets the same startup values. A run from an IDE or `dotnet run` asks studioctl where the directory is.
Without studioctl, the startup check stops the app and says how to start it, instead of the app running on
defaults.

A shared contract lists the runtime configuration keys and the platform secret files, including the ones only a
deployed app or only a local run has. Tests in studioctl, the app libraries and the config map check against it,
so the three cannot drift apart.

### Platform secrets

The app libraries read platform secrets through a configuration root of their own, and never add them to the app's
configuration. Nothing the app supplies can reach or replace them. The platform names the directory and every file
in it, and the libraries assume neither. This records the design of
[#20433](https://github.com/Altinn/altinn-studio/pull/20433) and
[#20482](https://github.com/Altinn/altinn-studio/pull/20482), and extends it to every secret the platform holds for
an app.

### App secrets and Key Vault

- Every service owner has a Key Vault in each environment. A deployed v9 app always has it as a configuration
  source. The app no longer opts in from `Program.cs` or `deployment/values.yaml`.
- The platform supplies the connection, the vault's address and a credential, as a platform secret. It never
  appears in the app's configuration. Until the runtime clusters give apps a workload identity, the connection is
  the service owner's existing `altinn-appsettings-secret`, with a service principal's client secret. A move to
  workload identity, or to a vault per app, then changes only the platform.
- A deployed app that cannot read its vault at startup stops.
- A local run does not connect to Azure. App secrets come from user secrets or `appsettings.Local.json`.

### Telemetry

OpenTelemetry is the only telemetry path in v9. Where apps export telemetry is runtime configuration. Which backend
it goes to is decided in [Monitoring telemetry collection and distribution](2026-01-07-monitoring-telemetry-collection-distribution.md).

## Problem context

An app depends on values it does not own, such as platform addresses, host names and cookie names. They differ per
environment, and we need to change them without waiting for every service owner to change and redeploy their apps.
We have seen what happens otherwise:

- A logout URL was hardcoded in the app frontend and had to be patched by hand on the CDN.
- A deprecated Maskinporten environment required source changes in apps.
- The deploy pipeline injected the PDF generator's address. Apps that were not redeployed kept the old one, which
  complicated the PDF migration.

Before v9, these values reach an app in several ways at once, and nothing checks that they agree:

- The app libraries have defaults for most of them. Many are wrong for v9. `PlatformSettings` defaults to
  `localhost:5101`, while studioctl provides `local.altinn.cloud:8000`. When a value is missing, the app runs on the
  default and the failure shows up later, somewhere else.
- The app template repeats many of the same values in `appsettings.json`, so every app carries a copy.
- The config map, the deploy pipeline and studioctl all inject them as environment variables. The config map also
  holds the same values as JSON files that could be reloaded, but the environment variables would hide every change
  to them, and nothing mounts them into the app.
- An app can override any of them in its own configuration, by accident or on purpose.
- To use Key Vault, an app mounts a cluster secret and calls a method in `Program.cs`. The secret holds a service
  principal's client secret, which then sits in the app's configuration where any app code can read it.

v9 has already moved platform secrets to their own channel
([#20433](https://github.com/Altinn/altinn-studio/pull/20433)). The other values need the same treatment, and v9 is
the major version where we can make the breaking changes.

## Decision drivers

- D1: Each value has one owner, and the owner changes it in one place.
- D2: We change the values we own without app source changes or redeploys.
- D3: A missing value is visible when the app starts, with an error that says who supplies it.
- D4: A local run gets its values the same way a deployed app does.
- D5: An app cannot change a value the platform owns.
- D6: The solution fits our Kubernetes and GitOps operating model.
- D7: Nice to have: An app's `appsettings.json` holds only the app's own choices.

## Alternatives considered

- A1: Keep the current setup: library defaults, values in the app template, environment variables from the config
  map, the deploy pipeline and studioctl, and Key Vault as an opt-in.
- A2: Centralize the values we own in GitOps and deliver them as environment variables only. Keep the library
  defaults as a fallback.
- A3: Centralize the values we own in GitOps and deliver them as files, in a cluster and in a local run. Remove the
  library defaults, check required values at startup, and let the platform's value win. Add Key Vault by default.
- A4: As A3, but read runtime configuration through a private configuration root, as the app libraries do for
  platform secrets.

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

### A3: Files from GitOps and studioctl, no defaults, the platform wins

- Good, because each value has one owner and one source, which satisfies D1 and D6.
- Good, because the app libraries reload mounted files, so a change reaches running apps without a redeploy (D2).
- Good, because the startup check reports a missing value by name (D3).
- Good, because studioctl delivers the same files a cluster mounts, which satisfies D4.
- Good, because the platform's values come last, so the app's own sources cannot override them (D5).
- Good, because the template and upgraded apps no longer carry copies of our values (D7).
- Bad, because only code that reads values through `IOptionsMonitor` sees a change without a restart.
- Bad, because the app libraries, studioctl, the config map, the deploy pipeline, the template and the v9 upgrade
  all change.
- Bad, because every deployed app depends on its Key Vault when it starts.

### A4: As A3, with runtime configuration in a private configuration root

- Good, because no source the app controls can even see runtime configuration, which satisfies D5 most strictly.
- Bad, because apps read runtime configuration for good reasons, such as the app's external URL to build links, or
  platform endpoints for their own clients. They would need a new API for each value.
- Bad, because the libraries' own code binds options from the app's configuration, and would need two roots.

## Decision rationale

We choose A3. The main reason is ownership. The values that depend on where an app runs are part of the runtime
contract around the app. We own that contract, so we deliver the values, we keep them correct, and an app cannot
change them. Files fit the GitOps model we already use, they can change while the app runs, and studioctl can write
the same files on a developer's machine. Removing the defaults turns a missing value into an error at startup
instead of a wrong request later.

A4 protects runtime configuration best, but apps have good reasons to read it. Putting the platform's values last
gives the same result for overrides and keeps reading simple.

## Consequences

- The work is tracked in [#20980](https://github.com/Altinn/altinn-studio/issues/20980) for runtime configuration,
  [#19775](https://github.com/Altinn/altinn-studio/issues/19775) for OpenTelemetry, and
  [#19779](https://github.com/Altinn/altinn-studio/issues/19779) for Key Vault.
- The v9 app template and `studioctl app upgrade v9` remove from `appsettings*.json` the values the platform owns,
  and the Key Vault opt-in from `Program.cs` and `deployment/values.yaml`. Where an app had set a value we now own,
  the upgrade tells the developer that it no longer applies.
- The deploy pipeline mounts the runtime configuration files into v9 apps and stops passing the same values as
  environment variables.
- New runtime configuration goes into `infra/runtime/apps-config` and studioctl in the same change, and the contract
  test fails until both have it.
- Workload identity for apps in the runtime clusters, and a vault per app, are platform changes we take on when the
  platform team offers them.
- As the work lands, [`src/App/README.md`](../../src/App/README.md) describes how configuration reaches an app and
  links here.
