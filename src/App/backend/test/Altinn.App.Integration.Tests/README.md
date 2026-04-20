# Integration Testing

This project contains scenario-based integration tests for Altinn apps. The tests run a generated app locally through `studioctl` and send requests through localtest, so the app is exercised close to normal local development.

## Prerequisites

- `studioctl` installed and available on `PATH`
- A local container runtime usable by `studioctl env up`

The harness starts localtest with `studioctl env up --detach` if no environment is running. If localtest was already running, the harness reuses it and does not stop it during cleanup.

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
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
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
5. Copy scenario overrides and shared harness code.
6. Start the app with `studioctl run --mode process --detach --random-host-port --json`.
7. Run requests through localtest at `http://local.altinn.cloud:8000`.
8. Stop the app process and delete the generated app folder on fixture disposal.

## Available Test Apps

- `TestApps.Basic` - Basic app used by the current integration tests.
