---
name: test
description: Write and run tests for the workflow engine. Use when creating tests, adding test coverage, scaffolding test files, or running the test suite.
---

When writing or running tests, follow these guidelines.

## Running tests

- All tests: `dotnet test`
- Single project: `dotnet test tests/WorkflowEngine.<Project>.Tests`
- Single test: `dotnet test --filter "FullyQualifiedName~ClassName.MethodName"`
- Always run `dotnet csharpier format <file>` on new/modified test files before finishing.

## Test projects

| Project | Type | Fixture | Dependencies |
|---|---|---|---|
| `Api.Tests` | Unit | `WorkflowEngineTestFixture.Create()` per test | Moq |
| `Models.Tests` | Unit | None | — |
| `Resilience.Tests` | Unit | None | — |
| `Data.Tests` | Unit | None | — |
| `Repository.Tests` | Repository (real DB) | `PostgresFixture` via collection | Testcontainers.PostgreSql |
| `Integration.Tests` | End-to-end | `EngineAppFixture` via collection | Testcontainers, WireMock, WebApplicationFactory, Verify |

## Conventions

- **Arrange-Act-Assert** with explicit `// Arrange`, `// Act`, `// Assert` comment markers.
- Prefer `[Theory]` with `[InlineData]` or `[MemberData]` (returning `TheoryData<>`) when inputs vary but logic is the same.
- Use `[Fact]` only for single meaningful scenarios with no parameterisation.
- Test naming: `MethodName_Scenario_ExpectedResult`.

## Unit test pattern (Api.Tests)

```csharp
public sealed class MyServiceTests
{
    [Fact]
    public async Task MethodName_Scenario_ExpectedResult()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        // setup mocks via fixture.HttpHandler, fixture.ServiceProvider, etc.

        // Act
        var result = await sut.Method(CancellationToken.None);

        // Assert
        Assert.Equal(expected, result);
    }
}
```

## Repository test pattern (real Postgres)

```csharp
[Collection(PostgresCollection.Name)]
public sealed class MyRepositoryTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.ResetAsync();
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task MethodName_Scenario_ExpectedResult()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Act
        // ...

        // Assert
        // ...
    }
}
```

## Integration test pattern (full app)

Integration tests use partial classes split by concern. To add tests to an existing concern, add to the appropriate partial file (e.g., `EngineTests.Insert.cs`). To add a new concern, create a new partial file.

```csharp
// EngineTests.MyConcern.cs
public partial class EngineTests
{
    [Fact]
    public async Task MyConcern_Scenario_ExpectedResult()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [...steps...]),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }
}
```

The base `EngineTests.cs` class handles fixture injection, `IAsyncLifetime`, and shared helpers:
- `_client` — `EngineApiClient` with API key pre-configured
- `_testHelpers` — builders for steps, workflows, enqueue requests
- `_instanceGuid` — fresh GUID per test
- `InstanceLockToken` — constant from fixture

## Snapshot testing (Verify)

Used in integration tests for response shape validation:

```csharp
[Fact]
public async Task Response_Shape_IsCorrect()
{
    // Arrange + Act
    var response = await _client.GetWorkflow(_instanceGuid, workflowId);
    var json = await response.Content.ReadAsStringAsync();

    // Assert
    await Verify(json).UseMethodName("Response_Shape_IsCorrect");
}
```

- Snapshots live in `tests/WorkflowEngine.Integration.Tests/.snapshots/`
- Volatile fields are scrubbed automatically by `ModuleInitializer`: `databaseId`, `createdAt`, `updatedAt`, `backoffUntil`, `traceId`, inline GUIDs
- New snapshots are auto-accepted (`VerifierSettings.AutoVerify`)

## Frameworks reference

- **xunit.v3** — test framework
- **Moq** — unit-level mocking (Api.Tests)
- **Testcontainers.PostgreSql** — real `postgres:18` containers (Repository.Tests, Integration.Tests)
- **WireMock.Net** — HTTP callback mocking (Integration.Tests)
- **Verify.XunitV3** — snapshot testing (Integration.Tests)
- **Microsoft.AspNetCore.Mvc.Testing** — `WebApplicationFactory` (Integration.Tests)

## Test infrastructure

- **Collection fixtures** share expensive resources (Postgres container, WebApplicationFactory) across tests. Tests opt in via `[Collection(...)]`.
- **`IAsyncLifetime`** on test classes for per-test setup/teardown (typically calls `fixture.ResetAsync()`).
- **Partial classes** split large integration test classes by concern.
