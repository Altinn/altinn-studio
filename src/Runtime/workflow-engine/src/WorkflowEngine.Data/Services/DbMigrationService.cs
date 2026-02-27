using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Telemetry;

// CA1822: Mark members as static
#pragma warning disable CA1822

namespace WorkflowEngine.Data.Services;

/// <summary>
/// Service responsible for applying database migrations with distributed locking.
/// Uses PostgreSQL advisory locks to ensure only one instance runs migrations at a time.
/// </summary>
public sealed class DbMigrationService
{
    private const long MigrationLockId = 0x4D6967726174; // "Migrat" in hex
    private static ILogger<DbMigrationService>? _logger { get; set; }

    public DbMigrationService(ILogger<DbMigrationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Applies any pending migrations to the database
    /// </summary>
    public async Task Migrate(string dbConnectionString, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("DbMigrationService.Migrate");

        await using var connection = new NpgsqlConnection(dbConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var dbLock = await AdvisoryLockScope.Acquire(MigrationLockId, connection, cancellationToken);

        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(connection).Options;
        await using var dbContext = new EngineDbContext(options);

        await ExecuteMigrations(dbContext, cancellationToken);
        await RegisterFunctions(dbContext, cancellationToken);
    }

    private static async Task ExecuteMigrations(EngineDbContext dbContext, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("DbMigrationService.ExecuteMigrations");

        List<string> pendingMigrations = [.. await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)];

        if (pendingMigrations.Count == 0)
        {
            _logger?.NoPendingMigrations();
            return;
        }

        try
        {
            _logger?.ApplyingPendingMigrations(pendingMigrations.Count, string.Join(", ", pendingMigrations));
            await dbContext.Database.MigrateAsync(cancellationToken);
            _logger?.MigrationsAppliedSuccessfully();
        }
        catch (Exception ex)
        {
            _logger?.MigrationError(ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// Reads all embedded SQL function files and executes them via CREATE OR REPLACE FUNCTION (idempotent).
    /// </summary>
    private static async Task RegisterFunctions(EngineDbContext dbContext, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("DbMigrationService.RegisterFunctions");

        var assembly = Assembly.GetExecutingAssembly();
        var sqlResources = assembly
            .GetManifestResourceNames()
            .Where(name => name.EndsWith(".sql", StringComparison.OrdinalIgnoreCase));

        foreach (var resourceName in sqlResources)
        {
            _logger?.RegisteringFunction(resourceName);

            await using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream is null)
                continue;

            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync(cancellationToken);

            await dbContext.Database.ExecuteSqlRawAsync(sql, cancellationToken);

            _logger?.FunctionRegistered(resourceName);
        }
    }
}

internal static partial class DatabaseMigrationServiceLogs
{
    [LoggerMessage(LogLevel.Information, "Applying {Count} pending migration(s): {Migrations}")]
    public static partial void ApplyingPendingMigrations(
        this ILogger<DbMigrationService> logger,
        int count,
        string migrations
    );

    [LoggerMessage(LogLevel.Information, "Migrations applied successfully")]
    public static partial void MigrationsAppliedSuccessfully(this ILogger<DbMigrationService> logger);

    [LoggerMessage(LogLevel.Information, "No pending migrations")]
    public static partial void NoPendingMigrations(this ILogger<DbMigrationService> logger);

    [LoggerMessage(LogLevel.Critical, "Error applying migrations: {ErrorMessage}")]
    public static partial void MigrationError(
        this ILogger<DbMigrationService> logger,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "Registering SQL function: {ResourceName}")]
    public static partial void RegisteringFunction(this ILogger<DbMigrationService> logger, string resourceName);

    [LoggerMessage(LogLevel.Information, "SQL function registered: {ResourceName}")]
    public static partial void FunctionRegistered(this ILogger<DbMigrationService> logger, string resourceName);
}
