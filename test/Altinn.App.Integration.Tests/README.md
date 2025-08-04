# Integration Testing

This document describes the scenario-based configuration harness for integration tests.
For the frontend of apps we have Cypress based integration tests that test through
a Studio app as if a real user is clicking through an app.
For these integration tests we want to test apps as though the requests originate from SBS and service owner flows as well.

The test harness creates isolated environments with a **localtest container** (simulating Altinn Platform services) and an **Altinn app container** for end-to-end testing.

## Architecture Overview

The integration test system uses:

- **AppFixture** - Central orchestrator managing Docker containers and test lifecycle
- **Three containers** - Localtest (platform services), App (under test), PDF service (shared)
- **Network isolation** - Each test gets its own Docker network and dynamic ports
- **Scenario-based config** - Override app configuration and inject custom services without rebuilding
- **Snapshot testing** - Verify HTTP responses, response bodies, and application logs

## Quick Start

### Basic Test Structure

```csharp
public class MyIntegrationTests(ITestOutputHelper output) : IAsyncLifetime
{
    private readonly ITestOutputHelper _output = output;
    private AppFixture? _fixture;
    
    public AppFixture Fixture
    {
        get
        {
            Assert.NotNull(_fixture);
            return _fixture;
        }
    }

    public async Task InitializeAsync() => _fixture = await AppFixture.Create(_output, TestApps.Basic);

    public async Task DisposeAsync() => await Fixture.DisposeAsync();

    [Fact]
    public async Task Instantiate()
    {
        var fixture = Fixture;
        var verifier = new ScopedVerifier();

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );

        var readResponse = await response.Read<Instance>();
        await verifier.Verify(
            readResponse,
            snapshotName: "Instantiation",
            scrubber: AppFixture.InstanceScrubber(readResponse)
        );
        await verifier.Verify(await Fixture.GetAppLogs(), snapshotName: "Logs");
    }
}
```

### Available Operations

**AppFixture provides feature-specific operations through partial classes:**

**Authentication:**
- `fixture.Auth.GetUserToken(userId: 1337)` - Get authentication tokens

**Instance Management:**
- `fixture.Instances.PostSimplified(token, instantiationInstance)` - Create instances
- `fixture.Instances.Get(token, instanceResponse)` - Get a specific instance
- `fixture.Instances.Download(token, instanceResponse)` - Download complete instance data
- `fixture.Instances.PatchFormData(token, instanceResponse, patchRequest, language?)` - Update form data
- `fixture.Instances.ValidateInstance(token, instanceResponse, ignoredValidators?, onlyIncrementalValidators?, language?)` - Validate an instance
- `fixture.Instances.ProcessNext(token, instanceResponse, processNext?, elementId?, language?)` - Advance process to next step

**Application Metadata:**
- `fixture.ApplicationMetadata.Get()` - Get app metadata

**Logging:**
- `fixture.GetAppLogs()` - Get application logs for verification

## Scenario-Based Testing

Test different app configurations without maintaining separate test apps.

### Folder Structure
```
_testapps/basic/_scenarios/
├── subunit-only/              # Example scenario
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
// Note: Third parameter for scenario is optional, defaults to "default"
_fixture = await AppFixture.Create(_output, TestApps.Basic, "my-scenario");
```

## Response Handling

The `ApiResponse` pattern provides structured HTTP response handling:

```csharp
using var response = await fixture.Instances.PostSimplified(
    token,
    new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
);

// Read typed response data
var readResponse = await response.Read<Instance>();
var instance = readResponse.Data.Model;
Assert.NotNull(instance);

// Snapshot testing with ScopedVerifier
var verifier = new ScopedVerifier();
await verifier.Verify(
    readResponse,
    snapshotName: "Instantiation",
    scrubber: AppFixture.InstanceScrubber(readResponse)
);
```

## Test App Structure

Test apps are complete Altinn applications:

```
_testapps/{appname}/
├── App/                      # Complete Altinn application
│   ├── App.csproj
│   ├── Program.cs           # Enhanced with scenario support
│   ├── config/              # Default configuration
│   ├── models/              # Data models
│   └── ui/                  # Form layouts
├── Dockerfile               # Multi-stage build
├── _scenarios/               # Scenario overrides
│   └── {scenario}/
│       ├── config/         # Config file overrides
│       └── services/       # Custom service implementations
```

## Environment Variables

**Development:**
- `TEST_REUSE_CONTAINERS=true` - Reuse containers for faster iteration
- `TEST_KEEP_CONTAINERS=true` - Keep containers running for debugging

**Debugging:**
- `TEST_FORCE_REBUILD=true` - Force Docker image rebuilds
- `TEST_LOG_FROM_TEST_CONTAINERS=true` - Show detailed container logs

## Best Practices

1. **Always use `IAsyncLifetime`** for proper fixture lifecycle management
2. **Use `using` statements** with `ApiResponse` objects for cleanup
3. **Use ScopedVerifier for snapshot testing** with `var verifier = new ScopedVerifier(); await verifier.Verify(...)`
4. **Keep _scenarios focused** - each should test one specific configuration aspect
5. **Enable container reuse** during development: `TEST_REUSE_CONTAINERS=true`

## How It Works

1. **Container Orchestration**: Three Docker containers (localtest, app, PDF service) start in parallel with health checks
2. **Network Isolation**: Each test gets isolated Docker network with service discovery
3. **Scenario Configuration**: Config files and services are mounted/compiled at runtime
4. **Snapshot Testing**: HTTP responses and application logs are captured and normalized for verification
5. **Resource Cleanup**: All containers, networks, and resources are disposed automatically

## Available Test Apps

- **`TestApps.Basic`** - Simple test app with basic functionality