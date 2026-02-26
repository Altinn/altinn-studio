using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;

namespace WorkflowEngine.EndToEndTests.Fixtures;

/// <summary>
/// Shared fixture that boots a real PostgreSQL container, a WireMock server, and the full
/// ASP.NET Core application (via WebApplicationFactory).  All end-to-end tests share one
/// fixture instance; each test calls <see cref="ResetAsync"/> to restore a clean state.
/// </summary>
public sealed class EngineAppFixture : IAsyncLifetime
{
    public const string ApiBasePath = "/api/v1/workflows";
    public const string TestApiKey = "e2e-test-api-key-00000001";
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18").Build();
    private EngineWebApplicationFactory _factory = null!;

    private string GetAppCommandEndpoint() =>
        $"http://localhost:{WireMock.Port}/{{Org}}/{{App}}/instances/{{InstanceOwnerPartyId}}/{{InstanceGuid}}/workflow-engine-callbacks";

    internal EngineDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(_postgres.GetConnectionString()).Options;

        return new EngineDbContext(options);
    }

    // ── Public surface ────────────────────────────────────────────────────────

    /// <summary>
    /// The live WireMock server, used to register stubs and inspect calls.
    /// </summary>
    public WireMockServer WireMock { get; private set; } = null!;

    /// <summary>
    /// Creates an <see cref="HttpClient"/> pre-populated with the test API key and pointing to the locally running engine.
    /// </summary>
    public HttpClient CreateEngineClient() => _factory.CreateEngineClient();

    /// <summary>
    /// Provides access to the engine's service provider.
    /// </summary>
    public IServiceProvider Services => _factory.Services;

    // ── IAsyncLifetime ────────────────────────────────────────────────────────

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        var migrationService = new DbMigrationService(NullLogger<DbMigrationService>.Instance);
        await migrationService.Migrate(_postgres.GetConnectionString());

        WireMock = WireMockServer.Start();
        SetupDefaultStub();

        // Accessing Server triggers ConfigureWebHost -> app startup.
        _factory = new EngineWebApplicationFactory(_postgres.GetConnectionString(), GetAppCommandEndpoint());
        _ = _factory.Server;
    }

    public async ValueTask DisposeAsync()
    {
        WireMock.Dispose();
        await _factory.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    // ── Per-test helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Resets both WireMock (back to the default catch-all 200 stub) and the database
    /// (all workflow and step rows truncated).  Call at the start of every test.
    /// </summary>
    public async Task ResetAsync()
    {
        // Reset WireMock first so any in-flight engine HTTP calls fail immediately
        // rather than holding DB transactions open for the duration of a WireMock delay.
        WireMock.Reset();
        SetupDefaultStub();

        // Wait for the engine background service to drain in-flight work so the TRUNCATE does
        // not race with an active DB transaction, which would cause a deadlock.
        await WaitForDbIdle();

        await using var context = GetDbContext();
        await context.Database.ExecuteSqlRawAsync("""TRUNCATE "Workflows", "Steps" CASCADE""");
    }

    /// <summary>
    /// Polls until no steps remain in an active state (Enqueued, Processing, or Requeued),
    /// or until <paramref name="timeout"/> elapses. Active steps indicate the engine still
    /// holds DB transactions that would deadlock a concurrent TRUNCATE.
    /// </summary>
    private async Task WaitForDbIdle(TimeSpan? timeout = null)
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(10));

        while (!cts.IsCancellationRequested)
        {
            var repo = Services.GetRequiredService<IEngineRepository>();
            var activeWorkflows = await repo.CountActiveWorkflows(cts.Token);

            if (activeWorkflows == 0)
                return;

            await Task.Delay(100, cts.Token);
        }
    }

    /// <summary>
    /// Registers a catch-all stub that returns HTTP 200 for every request.
    /// Applied automatically in <see cref="ResetAsync"/>; re-apply it after calling
    /// <see cref="WireMockServer.Reset"/> inside a specific test.
    /// </summary>
    public void SetupDefaultStub() =>
        WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(200));
}

// ── xUnit collection ──────────────────────────────────────────────────────────

[CollectionDefinition(Name)]
public class EngineAppCollection : ICollectionFixture<EngineAppFixture>
{
    public const string Name = "WorkflowEngineApp";
}
