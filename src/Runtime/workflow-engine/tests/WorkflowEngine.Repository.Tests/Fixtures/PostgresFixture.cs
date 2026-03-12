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
    private readonly ConcurrencyLimiter _limiter = new(50, 50);

    private readonly IOptions<EngineSettings> _settings = Options.Create(
        new EngineSettings
        {
            QueueCapacity = 100,
            MaxDegreeOfParallelism = 10,
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxConcurrentDbOperations = 50,
            MaxConcurrentHttpCalls = 50,
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
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
        IOptions<EngineSettings>? settings = null
    )
    {
        var dataSource = NpgsqlDataSource.Create(ConnectionString);
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
            TimeProvider.System,
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

    public async Task ResetAsync()
    {
        await using var context = CreateDbContext();
        await context.Database.ExecuteSqlRawAsync("""TRUNCATE "Workflows", "Steps" CASCADE""");
    }
}
