using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using Testcontainers.PostgreSql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests.Fixtures;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:18").Build();
    private readonly ConcurrencyLimiter _limiter = new(50, 50, 5);
    private readonly List<IDisposable> _disposables = [];
    private NpgsqlDataSource? _dataSource;

    private readonly IOptions<EngineSettings> _settings = Options.Create(
        new EngineSettings
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            MaxStepCommandTimeout = TimeSpan.FromHours(2),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            Concurrency = new ConcurrencySettings
            {
                MaxWorkers = 10,
                MaxDbOperations = 50,
                MaxHttpCalls = 50,
            },
        }
    );

    public string ConnectionString => _container.GetConnectionString();

    internal EngineSettings Settings => _settings.Value;

    /// <summary>
    /// The one connection pool everything this fixture builds shares: an <see cref="NpgsqlDataSource"/> owns
    /// a private pool that lives until disposed, and one per <c>CreateRepository</c> call exhausts the
    /// container's 100-connection limit — failing whichever test class happens to run last.
    /// </summary>
    private NpgsqlDataSource DataSource =>
        _dataSource ?? throw new InvalidOperationException("The fixture has not been initialized yet.");

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        var migrationService = new DbMigrationService(NullLogger<DbMigrationService>.Instance);
        await migrationService.Migrate(ConnectionString);

        _dataSource = NpgsqlDataSource.Create(ConnectionString);
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var d in _disposables)
            d.Dispose();
        _disposables.Clear();
        if (_dataSource is not null)
            await _dataSource.DisposeAsync();
        _limiter.Dispose();
        await _container.DisposeAsync();
    }

    internal EngineDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(ConnectionString).Options;

        return new EngineDbContext(options);
    }

    internal EngineRepository CreateRepository()
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(ConnectionString).Options;
        var factory = new PooledDbContextFactory<EngineDbContext>(options);
        var sqlBulkInserter = new SqlBulkInserter(factory);
        return new EngineRepository(
            DataSource,
            factory,
            _settings,
            _limiter,
            sqlBulkInserter,
            TimeProvider.System,
            NullLogger<EngineRepository>.Instance
        );
    }

    internal EngineRepository CreateRepository(IOptions<EngineSettings> settings)
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(ConnectionString).Options;
        var factory = new PooledDbContextFactory<EngineDbContext>(options);
        var sqlBulkInserter = new SqlBulkInserter(factory);
        return new EngineRepository(
            DataSource,
            factory,
            settings,
            _limiter,
            sqlBulkInserter,
            TimeProvider.System,
            NullLogger<EngineRepository>.Instance
        );
    }

    internal EngineRepository CreateRepositoryWithInterceptor(
        Microsoft.EntityFrameworkCore.Diagnostics.IInterceptor interceptor,
        IOptions<EngineSettings>? settings = null,
        TimeProvider? timeProvider = null
    )
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>()
            .UseNpgsql(ConnectionString)
            .AddInterceptors(interceptor)
            .Options;
        var factory = new PooledDbContextFactory<EngineDbContext>(options);
        var sqlBulkInserter = new SqlBulkInserter(factory);
        return new EngineRepository(
            DataSource,
            factory,
            settings ?? _settings,
            _limiter,
            sqlBulkInserter,
            timeProvider ?? TimeProvider.System,
            NullLogger<EngineRepository>.Instance
        );
    }

    internal (NamespaceThrottleService Service, ThrottleStateView View) CreateThrottleService(
        IOptions<EngineSettings> settings
    )
    {
        var view = new ThrottleStateView(TimeProvider.System, settings);
        var service = new NamespaceThrottleService(
            NullLogger<NamespaceThrottleService>.Instance,
            TimeProvider.System,
            DataSource,
            settings,
            CreateRepository(settings),
            view
        );
        _disposables.Add(service);
        return (service, view);
    }

    internal DbMaintenanceService CreateMaintenanceService(TimeProvider? timeProvider = null)
    {
        var service = new DbMaintenanceService(
            NullLogger<DbMaintenanceService>.Instance,
            timeProvider ?? TimeProvider.System,
            DataSource,
            _settings,
            _limiter
        );
        _disposables.Add(service);
        return service;
    }

    internal async Task<Workflow?> GetWorkflow(Guid workflowId)
    {
        await using var context = CreateDbContext();
        var entity = await context
            .Workflows.Include(w => w.Steps)
            .Include(w => w.Dependencies)
            .Include(w => w.Links)
            .SingleOrDefaultAsync(w => w.Id == workflowId);

        return entity?.ToDomainModel();
    }

    internal async Task<Step?> GetStep(Guid stepId)
    {
        await using var context = CreateDbContext();
        var entity = await context.Steps.SingleOrDefaultAsync(s => s.Id == stepId);

        return entity?.ToDomainModel();
    }

    public async Task Reset()
    {
        await using var context = CreateDbContext();
        await context.Database.ExecuteSqlRawAsync(
            "TRUNCATE engine.workflows, engine.steps, engine.workflow_collections, engine.idempotency_keys, engine.mailboxes, engine.mailbox_deliveries, engine.mailbox_receivers, engine.namespace_throttles CASCADE"
        );
    }
}
