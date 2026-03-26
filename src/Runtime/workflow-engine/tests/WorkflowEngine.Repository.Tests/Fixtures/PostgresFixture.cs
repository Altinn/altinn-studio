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
    private readonly List<NpgsqlDataSource> _dataSources = [];

    private readonly IOptions<EngineSettings> _settings = Options.Create(
        new EngineSettings
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
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

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        var migrationService = new DbMigrationService(NullLogger<DbMigrationService>.Instance);
        await migrationService.Migrate(ConnectionString);
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var ds in _dataSources)
            await ds.DisposeAsync();
        _dataSources.Clear();
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
        var dataSource = NpgsqlDataSource.Create(ConnectionString);
        _dataSources.Add(dataSource);
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(ConnectionString).Options;
        var factory = new PooledDbContextFactory<EngineDbContext>(options);
        var sqlBulkInserter = new SqlBulkInserter(factory);
        return new EngineRepository(
            dataSource,
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
        var dataSource = NpgsqlDataSource.Create(ConnectionString);
        _dataSources.Add(dataSource);
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(ConnectionString).Options;
        var factory = new PooledDbContextFactory<EngineDbContext>(options);
        var sqlBulkInserter = new SqlBulkInserter(factory);
        return new EngineRepository(
            dataSource,
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
        var dataSource = NpgsqlDataSource.Create(ConnectionString);
        _dataSources.Add(dataSource);
        var options = new DbContextOptionsBuilder<EngineDbContext>()
            .UseNpgsql(ConnectionString)
            .AddInterceptors(interceptor)
            .Options;
        var factory = new PooledDbContextFactory<EngineDbContext>(options);
        var sqlBulkInserter = new SqlBulkInserter(factory);
        return new EngineRepository(
            dataSource,
            factory,
            settings ?? _settings,
            _limiter,
            sqlBulkInserter,
            timeProvider ?? TimeProvider.System,
            NullLogger<EngineRepository>.Instance
        );
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
        await context.Database.ExecuteSqlRawAsync("""TRUNCATE "engine"."Workflows", "engine"."Steps" CASCADE""");
    }
}
