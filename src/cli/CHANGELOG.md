# Changelog

All notable changes to studioctl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries should describe only user-facing functionality in clear, user-friendly language; omit implementation details that do not affect how people use the product.
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- `studioctl app upgrade v9` warns about the eFormidling client changes it cannot rewrite: `Altinn.EFormidlingClient.Extensions`, which has no replacement namespace; the `IEFormidlingClient` endpoints v9 removed, and the models that went with them; the status types now nested inside `Statuses`; the arkivmelding properties that became lists; the renamed Standard Business Document `Arkivmelding`; and references the namespace rewrite cannot reach — an aliased `using X = Altinn.Common.EFormidlingClient;`, one written with `global::`, or a name written out in full — since it only rewrites plain `using` directives matched by name. Each is reported separately, with the fix to apply.
- Added option --allow-dirty to upgrade script. `studioctl app upgrade --allow-dirty` allows updating when the repository contains modified or untracked files.

### Changed

- End every `studioctl app upgrade` with the same closing advice, whichever migration you run. The v4 upgrade previously ended without any, and the v8 upgrade worded its own differently.
- Improve the output of `studioctl app upgrade` for v9 migrations. We print one line per result, naming the migration step it came from and labelling what it means: `OK` (migration applied), `SKIP` (not needed for this app), `INFO` (neutral information), `WARN` (worth a look), `TODO` (you have to do this manually) and `FAIL` (the step could not complete). Each label has its own color. The `TODO` and `FAIL` are the lines to act on.
- Rewrite legacy Datepicker `format` values (`DD.MM.YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`) to their supported equivalents (`dd.MM.yyyy`, `dd/MM/yyyy`, `yyyy-MM-dd`) in layout files when running `studioctl app upgrade v9`.
- `studioctl app upgrade v9` rewrites the eFormidling client namespaces, which moved into `Altinn.App.Core` in v9: `Altinn.Common.EFormidlingClient` becomes `Altinn.App.Core.EFormidling.Interface`, and its `.Configuration`, `.Models` and `.Models.SBD` namespaces become the matching ones under `Altinn.App.Core.EFormidling`. For most apps this is a single `using` in the file implementing `IEFormidlingReceivers`.
- `studioctl app upgrade v9` automatically adds `timeStamp: true` to `Datepicker` components that do not set the property. This preserves existing full timestamp values after the Datepicker default changes to date-only in v9.

### Fixed

- Relax rules for validating Altinn.App.Api and Altinn.App.Core nuget versions to allow missing Core reference and range versions `8.*`, `[8.11.3]` and `[8.0,9.0)`

## [0.1.0-preview.21] - 2026-08-11

### Added

- Warn in `studioctl app upgrade v9` about uses of the Altinn Events receive stack removed in v9: `IEventHandler` implementations, `IEventsSubscription` and `IEventSecretCodeProvider`, along with the built-in handlers, resolver and clients behind them. Apps no longer expose the `/api/v1/eventsreceiver` endpoint, so these are never invoked; the warning explains what to move to instead (a workflow-engine service task for self-addressed reminder events, or a purpose-built endpoint for genuine inbound events). Publishing app events through `IEventsClient` is unaffected and not reported.
- Auto-migrate the `PlatformHttpException` changes in `studioctl app upgrade v9`: rename `PlatformHttpException.CreateAsync(...)` to `Create(...)`, and rewrite constructor calls that built a throwaway `HttpResponseMessage` just to carry a status code into the v9 constructor that takes the status code directly. Every rewrite is listed for review, and any constructor call whose response argument cannot be identified is reported for you to finish by hand.
- Warn in `studioctl app upgrade v9` about uses of `PlatformHttpException.Response` that the v9 response snapshot cannot satisfy. Reading `Response.StatusCode` is unaffected and is not reported. This includes a warning for apps that read the property by reflection and cast it to `HttpResponseMessage`, which keeps compiling but silently stops finding the status code.
- Warn in `studioctl app upgrade v9` when an app supplies its own Maskinporten credentials in a configuration section named `MaskinportenSettings`. That section now belongs to the Maskinporten client every v9 app has, which Studio sets up automatically at deploy time — and because those provisioned settings are applied on top of `appsettings.json` and combined key by key, an app supplying its own `clientId`, `jwk` or `jwkBase64` there ends up with credentials belonging to neither client, which Maskinporten rejects. This applies whether the settings were meant for the external Maskinporten package or the built-in client. Nothing fails locally or at startup, so it is easy to miss without the warning. A section with only `authority` is fine, and `appsettings.Development.json` is reported without failing the upgrade, since deployed environments never load it.
- Warn in `studioctl app upgrade v9` about the obsolete Maskinporten types removed in v9 (`IMaskinportenTokenProvider`, `MaskinportenJwkTokenProvider`, `AddMaskinportenJwkTokenProvider`, `IX509CertificateProvider`), pointing at the built-in `IMaskinportenClient` that replaces them.
- Warn in `studioctl app upgrade v9` about the eFormidling status check handlers, both removed in v9 — `EformidlingStatusCheckEventHandler` and `EformidlingStatusCheckEventHandler2`. The warning explains that nothing takes their place, because the v9 eFormidling service task waits for the delivery confirmation itself, and points at `AddEFormidling().WithMetadata<T>()` for the registration.
- Report in `studioctl app upgrade v9` when an app uses the external `Altinn.ApiClients.Maskinporten` package, which v9 no longer supplies. Apps that declare the package themselves are told they can keep it and simply pointed at the built-in client; apps that relied on it arriving with `Altinn.App.Core` are told their build will break and given both ways out.
- Warn in `studioctl app upgrade v9` when an app calls `ConfigureMaskinportenClient` with its own configuration section or a custom lambda. In v9 that takes over a client the app no longer owns alone: Studio provisions its credentials at deploy time and the workflow engine mints the app's service owner tokens through it, so redirecting it means the provisioned credentials are never read, and process transitions fail once deployed. Binding to the standard `MaskinportenSettings` section remains unchanged and is not reported.

### Changed

- Rename `Header` layout components (and summary `componentType` refs) to `Heading` when running `studioctl app upgrade v9`.
- `studioctl app upgrade v9` rewrites the eFormidling registration in the app's C# code: `AddEFormidlingServices<TM>(config)` and `AddEFormidlingServices<TM, TR>(config)`, and the `AddEFormidlingServices2` forms of both, become `AddEFormidling().WithMetadata<TM>()`, with `.WithReceivers<TR>()` added only where the app supplies its own receivers. The `IConfiguration` argument is dropped, and the upgrade says so — eFormidling now reads its `EFormidlingClientSettings` section from the app's configuration directly. A registration written as a static call rather than `services.AddEFormidlingServices<..>(config)` is reported for you to change by hand.

## [0.1.0-preview.20] - 2026-08-07

### Added

- Accept Studio repository URLs, with or without `.git`, in `studioctl app clone` and select the environment from the URL.

### Changed

- Wait up to 30 seconds for an app to become reachable through Localtest when using `studioctl run`; use `--startup-timeout` to choose a different limit.
- `studioctl app upgrade v9` is firmer about a feedback task behind an **eFormidling** service task: it now says the task must be removed, rather than that it may be redundant. The v9 eFormidling service task waits for the delivery confirmation itself, and the Altinn Events reminder that used to move the process past the feedback task is gone — so leaving it in place strands instances there indefinitely. A feedback task behind any other service task still reports as a judgement call.

### Fixed

- Explain access errors during `studioctl app upgrade`
- Explain whether app endpoint discovery or Localtest Storage was still incomplete when `studioctl run` reaches its startup timeout.
- Detect apps started directly with `dotnet run` sooner by checking process endpoints every five seconds while retaining the ten-second container check interval.
- Discover apps launched by `studioctl run` from their registered process without relying on process-name or command-line matching.

## [0.1.0-preview.19] - 2026-08-06

### Added

- Auto-migrate the Correspondence APIs removed in v9 in `studioctl app upgrade v9`: drop the builder calls and properties v8 already discarded, rename `CustomRecipient` to the `CustomRecipients` list, rename the removed builder step interface, wrap a byte payload passed to `WithData` in a `MemoryStream`, and replace the two superseded payload constructors with `CorrespondenceAuthenticationMethod`. Every rewrite is listed for review.
- Warn in `studioctl app upgrade v9` about the Correspondence changes that have no mechanical fix — the recipient-override methods, the wrapper-based recipient list, and `IsReserved` — plus anything the auto-migration could not rewrite safely.

### Changed

- Update the workflow-engine image used by `studioctl env up` to a version with durable-yield support: service tasks can wait for external outcomes (for example a delivery confirmation) without occupying a worker or being treated as failures.
- Refuse to start `studioctl app upgrade` when the git repository has local changes, so the upgrade lands as one clean reviewable changeset.
- Rename `OrganisationLookup` components and their data model bindings to `OrganizationLookup` when running `studioctl app upgrade v9`.
- Stage every change from `studioctl app upgrade` in one `git add -A` pass once the upgrade is done. Previously, some migration steps staged their changes, while others did not.
- Point `studioctl app upgrade v9` removed-API warnings at the offending call rather than the start of the enclosing expression.
- Remove redundant `showBackButton: true` properties from `NavigationButtons` components during `studioctl app upgrade v9`, while preserving explicit `false` values.

### Fixed

- Keep subforms identifiable when running `studioctl app upgrade v9`.
- Prefer the latest stable v9 app packages in `studioctl app upgrade v9`, falling back to the latest preview until a stable version is available.

## [0.1.0-preview.18] - 2026-07-24

### Added

- Handle the v9 C# breaking changes in `studioctl app upgrade v9`: auto-fix package-version floors (NU1605), the `IServiceTask` namespace move, and the `IEFormidlingReceivers.GetEFormidlingReceivers` signature; warn (exit code `3`) about removed APIs that need manual porting — the legacy task event interfaces (`IProcessTaskStart`/`End`/`Abandon`, `ITaskEvents`), the reworked `ServiceTaskResult` factories, and legacy eFormidling code.
- Warn in `studioctl app upgrade v9` about `feedback` tasks placed directly after a service task in the BPMN process. In v9 the process waits on the service task itself, so such feedback tasks are usually a leftover v8 waiting pattern that should be reviewed and removed manually.

## [0.1.0-preview.17] - 2026-07-23

### Added

- Notify when a newer `studioctl` release is available. The check runs at most once every few hours, caches its result under the studioctl home directory, and prints a hint to run `studioctl self update`. It is skipped in CI, for non-interactive output, and can be disabled with `STUDIOCTL_NO_UPDATE_CHECK=1`.

### Changed

- Update workflow-engine image.

## [0.1.0-preview.16] - 2026-07-02

### Changed

- Show the resolved target version during `studioctl self update` and skip the update when already on the newest version, instead of reinstalling and restarting the local environment.

## [0.1.0-preview.15] - 2026-07-01

### Changed

- Color the `studioctl env` progress footer by status: the ready count is green when all resources are ready, yellow when some are, and red when none are; the failed count is dimmed when zero and red otherwise.

### Fixed

- Update `studioctl app upgrade v9` to rewrite the app `Dockerfile` .NET base images to match the upgraded target framework (`net10.0`).

## [0.1.0-preview.14] - 2026-06-08

### Changed

- Update localtest PDF worker image.

## [0.1.0-preview.13] - 2026-06-05

### Added

- Add `studioctl app env` for printing the local app harness environment, with `--json` output for app startup integration.

### Fixed

- Update `studioctl app upgrade v9` to target `net10.0` and resolve v9 app package versions from configured NuGet sources.
- Update `studioctl app upgrade v9` to replace legacy IIS Express launch settings with the standard `App` project launch profile.

## [0.1.0-preview.12] - 2026-06-04

### Added

- Show resolved container runtime client/server versions in `studioctl doctor`.

### Changed

- Update localtest and workflow-engine images.

### Fixed

- Ignore stale Podman container health status when no healthcheck command is configured.
- Warn in `studioctl doctor` when the Podman CLI client/server versions differ.
- Run localtest PDF and workflow-engine service containers with their image default user to avoid Podman `keep-id` group mapping failures on macOS.

## [0.1.0-preview.11] - 2026-05-29

### Added

- Add `apps search` for discovering app repositories in Altinn Studio.

### Fixed

- Support starting localtest with rootless Podman setups where the host user has a large domain UID/GID outside the default subordinate ID mapping.
- Relabel localtest bind mounts on SELinux-enabled Podman setups so containers can read generated resources.

## [0.1.0-preview.10] - 2026-05-22

### Changed

- Update localtest image.

### Fixed

- Fix Windows PowerShell installer architecture detection.
- Make Windows installs fall back to the default location when no usable interactive prompt is available.
- Support `studioctl self update` and `studioctl self uninstall` on Windows by completing binary replacement/removal after the running process exits.
- Render plain output in Windows PowerShell ISE to avoid unreadable ANSI codes and spinner/status glyphs.
- Clean up stale `studioctl` update artifacts from the Windows install directory during uninstall.

## [0.1.0-preview.9] - 2026-05-22

### Added

- Add `studioctl auth login --with-token` for logging in with an existing Studio/Designer API key from standard input.

### Changed

- Update localtest image.

## [0.1.0-preview.8] - 2026-05-13

### Changed

- Breaking: make `--follow` default to `false` for log commands.
- Breaking: rename `studioctl servers` to `studioctl server`.
- Breaking: simplify install scripts by removing `--repo`, `--asset`, `--skip-resources`, `STUDIOCTL_REPO`, `STUDIOCTL_ASSET`, and `STUDIOCTL_SKIP_RESOURCES`.
- Rename `app-manager` to `studioctl-server`, including install/update migration cleanup of legacy runtime files, installed payload, and logs.
- Show progress while `app run --mode container` pulls/builds and starts the app container.
- `studioctl self uninstall` now asks for confirmation; use `-y` or `--yes` for non-interactive uninstall.
- `studioctl auth` uses login through web browser/auth code and Ansattporten session to create Studio API key.

### Fixed

- Redirect unauthenticated app URLs opened from `studioctl app run` through the localtest login page.
- Keep running apps visible in localtest after restarting the localtest environment.
- Improve localtest resource reconciliation so `env up` removes managed resources that are no longer requested, such as pgAdmin or monitoring, without restarting unchanged core containers.

## [0.1.0-preview.7] - 2026-04-29

### Added

- Add `env reset` for localtest to delete persisted localtest and workflow-engine database data, with interactive confirmation.
- Add `env hosts add`, `env hosts remove`, and `env hosts status` for localtest, including managed hosts-file blocks, backup creation, and `--json` output.

### Changed

- Make `--random-host-port` default to `true` for `run` and `app run`.
- Stop running apps, localtest, and app-manager before `self update`, `self uninstall`, and installer replacement.
- Make `self uninstall` remove studioctl home data and env runtime resources.

### Fixed

- Fix install and update flows when no interactive terminal prompt is available.
- Fix workflow-engine database persistence cross-platform support by using a named/managed volume instead of host bind mount.
- Fix app-manager shutdown waits incorrectly reporting that an exited process is still running on Linux systems.
- Reading password input when using `studioctl auth` now works on macOS with bracketed paste enabled.

### Removed

- Breaking: remove `--checks` from `studioctl doctor`; `studioctl doctor` now always runs localtest environment diagnostics and reports localtest, PDF, and workflow-engine health in text and JSON output.

## [0.1.0-preview.6] - 2026-04-20

### Added

- Add `--json` output for `app build`.
- Add `--json` output for `env up`, `env down`, `env status`, and `env logs`.
- Add `--json` output for `servers up`, `servers status`, and `servers down`.
- Add `--json` output for detached `run` and `app run`.
- Add `app ps` for listing running app processes and containers.
- Add `app stop` and top-level `stop` for stopping discovered app processes and containers.
- Add `app logs` for reading app process and container logs.
- Support for multiple instances of the same app and roundrobin loadbalancing similar to deployed environments.

### Changed

- Rename app run mode `native` to `process`.

## [0.1.0-preview.5] - 2026-04-16

### Added

- Windows support, including Podman Desktop
- Support for running apps as containers with `studioctl run --mode container`

### Changed

- Improve networking reliability across runtime configurations
- `studioctl run` now waits for the app to be ready before returning

## [0.1.0-preview.4] - 2026-03-12

### Added

- Colima support

### Changed

- Update localtest images
- Improve `env` output and progress visibility

### Fixed

- Improve `doctor` and `env localtest` container toolchain detection

## [0.1.0-preview.3] - 2026-02-27

### Fixed

- Update to latest PDF container image, to resolve connectivity issues (#17988)

## [0.1.0-preview.2] - 2026-02-27

### Added

- Support `self update` and `self uninstall` for Linux, macOS

### Fixed

- PDF connectivity when running `env localtest` (#17959)
- Handle partial "up" state in `env up` (#17959)

## [0.1.0-preview.1] - 2026-02-25

### Added

- Initial implementation of studioctl CLI tool (#17841)
