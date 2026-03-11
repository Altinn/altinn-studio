using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
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

namespace WorkflowEngine.TestKit;

/// <summary>
/// Shared fixture that boots a real PostgreSQL container, an in-memory WireMock server,
/// and the full ASP.NET Core application (via WebApplicationFactory).
///
/// All tests within the same collection share one fixture instance;
/// each test calls <see cref="ResetAsync"/> to restore a clean state.
/// </summary>
public abstract class EngineAppFixture : IAsyncLifetime
{
    public const string TestApiKey = "e2e-test-api-key-00000001";
    public const string DefaultOrg = "ttd";
    public const string DefaultApp = "e2e-tests";
    public const string DefaultPartyId = "50001";
    public static readonly Guid DefaultInstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18").Build();
    private int _wireMockPort;

    // Stored as IAsyncDisposable so we don't need the generic type parameter here
    private IAsyncDisposable _factory = null!;
    private Func<HttpClient> _createEngineClient = null!;
    private Func<HttpClient> _createRawClient = null!;
    private IServiceProvider _services = null!;

    /// <summary>
    /// Constructs a new <see cref="EngineDbContext"/> for the test database.
    /// </summary>
    internal EngineDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(_postgres.GetConnectionString()).Options;
        return new EngineDbContext(options);
    }

    /// <summary>
    /// The live WireMock server, used to register stubs and inspect calls.
    /// </summary>
    public WireMockServer WireMock { get; private set; } = null!;

    /// <summary>
    /// Creates an <see cref="HttpClient"/> pre-populated with the test API key and pointing to the locally running engine.
    /// </summary>
    public HttpClient CreateEngineClient() => _createEngineClient();

    /// <summary>
    /// Creates an <see cref="HttpClient"/> without any pre-populated headers (no API key).
    /// </summary>
    public HttpClient CreateRawClient() => _createRawClient();

    /// <summary>
    /// Provides access to the engine's service provider.
    /// </summary>
    public IServiceProvider Services => _services;

    /// <summary>
    /// Creates and returns the <see cref="WebApplicationFactory{TEntryPoint}"/> for the test host.
    /// Called once during <see cref="InitializeAsync"/>.
    /// </summary>
    protected abstract (
        IAsyncDisposable Factory,
        Func<HttpClient> CreateEngineClient,
        Func<HttpClient> CreateRawClient,
        IServiceProvider Services
    ) CreateFactory(string connectionString);

    /// <summary>
    /// Called when fixture is created.
    /// </summary>
    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        var migrationService = new DbMigrationService(NullLogger<DbMigrationService>.Instance);
        await migrationService.Migrate(_postgres.GetConnectionString());

        WireMock = WireMockServer.Start();
        _wireMockPort = WireMock.Port;
        SetupDefaultStub();

        var (factory, createEngineClient, createRawClient, services) = CreateFactory(_postgres.GetConnectionString());
        _factory = factory;
        _createEngineClient = createEngineClient;
        _createRawClient = createRawClient;
        _services = services;
    }

    /// <summary>
    /// Called when fixture is disposed.
    /// </summary>
    public async ValueTask DisposeAsync()
    {
        WireMock.Stop();
        WireMock.Dispose();
        await _factory.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    /// <summary>
    /// Resets both WireMock (back to the default catch-all 200 stub) and the database
    /// (all workflow and step rows truncated).  Called at the start of every test.
    /// </summary>
    public async Task ResetAsync()
    {
        // Stop and dispose WireMock server. This may or may not fail in-flight pending requests.
        WireMock.Stop();
        WireMock.Dispose();

        // Wait for the engine background service to drain in-flight work so the TRUNCATE does
        // not race with an active DB transaction, which would cause a deadlock.
        await WaitForDbIdle();

        await using var context = GetDbContext();
        await context.Database.ExecuteSqlRawAsync("""TRUNCATE "Workflows", "Steps" CASCADE""");

        // Start a fresh instance of WireMock, recycling the port (which has already been sent to the factory)
        WireMock = WireMockServer.Start(port: _wireMockPort);
        SetupDefaultStub();
    }

    /// <summary>
    /// Polls until no workflows remain in an active state or until <paramref name="timeout"/> elapses.
    /// Active workflows indicate the engine still holds DB transactions that would deadlock a concurrent TRUNCATE.
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

/// <summary>
/// Generic fixture that creates an <see cref="EngineWebApplicationFactory{TProgram}"/>
/// for the specified <typeparamref name="TProgram"/>.
/// <para>
/// Runs the real <c>Program.cs</c> entry point from <typeparamref name="TProgram"/>'s assembly
/// and layers test-specific configuration on top via <see cref="ConfigureWebHost"/>.
/// Connection strings, API keys, and engine settings are injected automatically by the factory.
/// </para>
/// </summary>
public class EngineAppFixture<TProgram> : EngineAppFixture
    where TProgram : class
{
    /// <summary>
    /// Called during factory creation to layer test-specific configuration on top of
    /// the real application (e.g. WireMock endpoints). Connection strings, API keys,
    /// and engine settings are already injected by the factory.
    /// WireMock is already started at this point.
    /// </summary>
    protected virtual void ConfigureWebHost(IWebHostBuilder builder) { }

    protected override (
        IAsyncDisposable Factory,
        Func<HttpClient> CreateEngineClient,
        Func<HttpClient> CreateRawClient,
        IServiceProvider Services
    ) CreateFactory(string connectionString)
    {
        var factory = new EngineWebApplicationFactory<TProgram>(connectionString, ConfigureWebHost);

        // Accessing Server triggers ConfigureWebHost -> app startup.
        _ = factory.Server;

        return (factory, factory.CreateEngineClient, factory.CreateClient, factory.Services);
    }
}
