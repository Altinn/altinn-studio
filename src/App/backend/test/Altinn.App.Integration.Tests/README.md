# Integration Testing

This project contains scenario-based integration tests for Altinn apps. The tests run a generated app locally through `studioctl` and send requests through localtest, so the app is exercised close to normal local development.

## Prerequisites

- `studioctl` installed and available on `PATH`
- A local container runtime usable by `studioctl env up`

The harness starts localtest with `studioctl env up --detach` if no environment is running. It always sets `STUDIOCTL_INTERNAL_DEV=true` on its `studioctl` subprocesses so localtest uses images built from the current monorepo checkout when available. If localtest was already running, the harness reuses it and does not stop it during cleanup.

## Architecture

- `AppFixture` coordinates localtest, generated app folders, app startup, and snapshot scrubbers.
- Localtest and platform services are managed by `studioctl env`.
- The app under test runs in `studioctl run --mode process --detach --random-host-port`.
- Test apps are copied to `_testapps/generated/` with unique application ids, for example `ttd/basic-f0003`.
- Scenario config and services are copied into the generated app before startup.
- Class fixtures reuse the same running app process. Between test methods the fixture writes a new config file and calls `/test/fixture-configuration/reload` in the app instead of restarting it.

## Basic Usage

```csharp
public class MyIntegrationTests(ITestOutputHelper output) : IAsyncLifetime
{
    private AppFixture? _fixture;

    private AppFixture Fixture => _fixture ?? throw new InvalidOperationException("Fixture not initialized");

    public async Task InitializeAsync() => _fixture = await AppFixture.Create(output, TestApps.Basic);

    public async Task DisposeAsync() => await Fixture.DisposeAsync();

    [Fact]
    public async Task Instantiate()
    {
        var token = await Fixture.Auth.GetUserToken(userId: 1337);

        using var response = await Fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );

        using var readResponse = await response.Read<Instance>();
        await Fixture.ScopedVerifier.Verify(
            readResponse,
            snapshotName: "Instantiation",
            scrubbers: new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(readResponse))
        );
    }
}
```

Use `AppFixtureClassFixture` when multiple tests in the same class can share app/scenario setup:

```csharp
public class MyTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task UsesSharedApp()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
    }
}
```

Tests in a class fixture are serialized because they share one app process and fixture configuration.

## Operations

`AppFixture` exposes feature-specific operations through partial classes:

- `fixture.Auth.GetUserToken(userId: 1337)`
- `fixture.Auth.GetServiceOwnerToken()`
- `fixture.Auth.GetSystemUserToken(...)`
- `fixture.Instances.PostSimplified(token, instance)`
- `fixture.Instances.PostMultipart(token, instanceTemplate, dataParts)`
- `fixture.Instances.Get(token, instanceResponse)`
- `fixture.Instances.Download(token, instanceResponse)`
- `fixture.Instances.PatchFormData(token, instanceResponse, patchRequest, language?)`
- `fixture.Instances.ValidateInstance(token, instanceResponse, ignoredValidators?, onlyIncrementalValidators?, language?)`
- `fixture.Instances.ProcessNext(token, instanceResponse, processNext?, elementId?, language?)`
- `fixture.ApplicationMetadata.Get()`
- `fixture.Generic.Get(endpoint, token)`
- `fixture.Generic.Post(endpoint, token, content)`
- `fixture.UpgradeTo(app)` - replaces the running app with another version of it under the same app id (see [Upgrade tests](#upgrade-tests))

`GetAppClient()` sends requests through localtest. `GetDirectAppClient()` sends requests directly to the app process and is intended for harness-only endpoints under `/test/...`.

## Scenarios

Test different app configurations without maintaining separate test apps.

### Folder Structure

```
_testapps/basic/_scenarios/
├── subunit-only/
│   ├── config/
│   │   └── applicationmetadata.json
│   └── services/
│       └── CustomService.cs
```

### Creating a Scenario

1. **Create scenario folder:**

```bash
mkdir -p _testapps/basic/_scenarios/my-scenario/{config,services}
```

2. **Override configuration:**

```bash
cp _testapps/basic/App/config/applicationmetadata.json _testapps/basic/_scenarios/my-scenario/config/
# Edit the file to change settings
```

3. **Add custom services (optional):**

```csharp
// In services/CustomService.cs
public interface IMyService
{
    Task<string> ProcessData(string input);
}

public class MyService : IMyService
{
    public async Task<string> ProcessData(string input) => $"Processed: {input}";
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddScoped<IMyService, MyService>();
    }
}
```

4. **Use in tests:**

```csharp
await using var fixture = await AppFixture.Create(output, TestApps.Basic, "my-scenario");
```

## Snapshot Testing

Use `fixture.ScopedVerifier` for snapshots. It provides stable numbering and test-case names.

```csharp
var verifier = fixture.ScopedVerifier;
verifier.UseTestCase(new { auth, scope = sanitizedScope });
await verifier.Verify(readResponse, snapshotName: "Instantiation");
await verifier.VerifyLogs();
```

Snapshots scrub generated app ids, dynamic ports, and volatile response values. Local diagnostic logs are written under `_snapshots/_local/` and ignored by git.

## Logs

`studioctl run --json` returns the app log path. The harness reads app logs directly from that file. Localtest logs are managed by `studioctl`; use:

```bash
studioctl env logs --follow=false
```

## Test App Structure

```
_testapps/{appname}/
├── App/
│   ├── App.csproj
│   ├── Program.cs
│   ├── config/
│   ├── models/
│   └── ui/
└── _scenarios/
    └── {scenario}/
        ├── config/
        └── services/
```

Generated apps are written to `_testapps/generated/`, which is ignored by git.

## How It Works

1. Pack the app libraries into `_testapps/_packages`.
2. Ensure localtest is running through `studioctl env up --detach`.
3. Copy the requested test app to `_testapps/generated/{app}-fNNNN`.
4. Patch `applicationmetadata.json` to use a unique app id.
5. Copy scenario `config` into `App/config`, scenario `services` into `App/scenario-overrides/services`, and the shared harness code. The app reads its config files once at startup, so overrides must be in place before the process starts.
6. Start the app with `studioctl run --mode process --detach --random-host-port --json`.
7. Run requests through localtest at `http://local.altinn.cloud:8000`.
8. Stop the app process and delete the generated app folder on fixture disposal.

## Available Test Apps

- `TestApps.Basic` - Basic app used by the current integration tests.
- `TestApps.UpgradeV8` and `TestApps.UpgradeV9` - the same data + confirmation app before and after the v8 -> v9 upgrade, for the [upgrade tests](#upgrade-tests).
- `TestApps.ServiceTaskV8` and `TestApps.ServiceTaskV9` - `ttd/service-task` from altinn.studio before and after the v8 -> v9 upgrade: PDF, app-implemented and eFormidling service tasks.
- `TestApps.SigneringBrukerstyrtV8` and `TestApps.SigneringBrukerstyrtV9` - `ttd/signering-brukerstyrt` from altinn.studio before and after the v8 -> v9 upgrade: signing tasks with signees from the form and an app-implemented gateway.

## Upgrade tests

The tests in `Upgrade/` check that instances an app leaves behind on one major version keep working after the app is upgraded and deployed. A test creates the fixture with the old version, leaves instances at different points in the process, and calls `fixture.UpgradeTo(...)`. That stops the app process, regenerates the app folder from the new version under the same app id, and starts it again, the way a deploy replaces the app. Localtest and the workflow engine keep their state, so the instances are still there and the test continues them on the new version.

- `_testapps/upgrade-v8` runs a released v8 version of the app libraries from nuget.org, pinned in `App.csproj`. Its `NuGet.config` has no mapping to the locally packed libraries. `_shared/Tracing.cs` implements v9 interfaces, so the app compiles `_testapps/_shared-v8/Tracing.cs` instead.
- `_testapps/upgrade-v9` is `upgrade-v8` after `studioctl app upgrade v9`. It is committed rather than generated during the test, so a change in what the upgrade tool produces shows up as a diff in review. Only these changes were made by hand on top of the tool's output:
    - Harness: `Altinn.App.*` are referenced with `*-*` versions, `NuGet.config` is the one from `basic`, and `App.csproj` compiles all of `_shared`.
    - The follow-up the tool reported: the app owner is granted `confirm` in `policy.xml`, since the workflow engine advances confirmation tasks as the service owner in v9.

To regenerate `upgrade-v9` after changing `upgrade-v8` or the upgrade tool:

1. Copy `_testapps/upgrade-v8`, `_testapps/_shared` and `_testapps/_shared-v8` to a folder outside this repository, and commit the app folder to a new git repository. Inside this repository the tool replaces the package references with project references and stages files in this repository's index.
2. Build studioctl from this commit (`make dev-install` in `src/cli`) and run `studioctl app upgrade v9 -p <app folder> --json` with `STUDIOCTL_HOME` set to `src/cli/build/dev-home`. On macOS, pass `--socket-dir` with a short path if the server fails to start: Unix socket paths are limited to 104 characters. Afterwards, stop the server it started with `studioctl server down` (same `STUDIOCTL_HOME` and `--socket-dir`). While it runs, it competes with your regular studioctl for localtest's host bridge, and requests to apps fail at random with 502.
3. Replace `_testapps/upgrade-v9` with the result, and redo the changes listed above.

`service-task-*` and `signering-brukerstyrt-*` are real apps: copies of the `ttd/service-task` (commit `18d14c3`) and `ttd/signering-brukerstyrt` (commit `8c6a71c`) repositories on altinn.studio. The v8 copies differ from the repositories in these ways:

- Harness: the libraries are pinned to 8.12.11 from nuget.org and the target framework is `net10.0`. `App.csproj` compiles `_shared` and `_shared-v8` the way `upgrade-v8` does. The app id in `applicationmetadata.json` is the folder name. `Program.cs` calls the harness with full type names, since `service-task` has its own `EFormidlingMetadata`.
- Left out: `Dockerfile`, `deployment/`, `.config/`, `App.sln`, the events secret in `service-task`'s `secrets.json`, and `signering-brukerstyrt`'s `wwwroot/testData.json`. When every running app has its own test data, localtest only serves those users and caches them for up to 30 seconds, which breaks tests that run in parallel. The signing tests use localtest's built-in users instead.

The v9 copies are the v8 copies after `studioctl app upgrade v9`, generated the same way as `upgrade-v9` and with the same harness changes. Each has the follow-ups the tool reported done by hand:

- `service-task-v9`: `ExampleServiceTask` returns `FailedPermanent`. `FailServiceTask` returns `Success("reject")`: in v9 a failed service task can only be retried, so it sends the instance back to `Task_Utfylling2` the way the user's reject did on v8. `EFormidlingMetadata` reads data through `IInstanceDataAccessor` and fills the arkivmelding properties that are now lists. The events subscription and the Maskinporten settings v9 no longer reads are removed. The app owner is granted `fail` and `reject` in `policy.xml`.
- `signering-brukerstyrt-v9`: the `ConfigureMaskinportenClient` call and its settings are removed. The app owner is granted `reject` in `policy.xml`.
