using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using WorkflowEngine.Data.Context;

namespace WorkflowEngine.Data.Services;

// CA2100: Review SQL queries for security vulnerabilities
#pragma warning disable CA2100

/// <summary>
/// Service responsible for applying database migrations with distributed locking.
/// Uses PostgreSQL advisory locks to ensure only one instance runs migrations at a time.
/// </summary>
public sealed class DbMigrationService
{
    private const long MigrationLockId = 0x4D6967726174; // "Migrat" in hex
    private static ILogger<DbMigrationService>? _logger { get; set; }

    public DbMigrationService(IServiceProvider serviceProvider, ILogger<DbMigrationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Applies any pending migrations to the database
    /// </summary>
    public async Task MigrateAsync(string dbConnectionString, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(dbConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var dbLock = await LockScope.Acquire(connection, cancellationToken);

        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(connection).Options;

        await using var dbContext = new EngineDbContext(options);

        var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync(cancellationToken);

        if (!pendingMigrations.Any())
        {
            _logger?.NoPendingMigrations();
            return;
        }

        try
        {
            _logger?.ApplyingPendingMigrations(pendingMigrations.Count(), string.Join(", ", pendingMigrations));
            await dbContext.Database.MigrateAsync(cancellationToken);
            _logger?.MigrationsAppliedSuccessfully();
        }
        catch (Exception ex)
        {
            _logger?.MigrationError(ex.Message, ex);
            throw;
        }
    }

    private sealed class LockScope : IAsyncDisposable
    {
        private readonly DbConnection _connection;

        private LockScope(DbConnection connection)
        {
            _connection = connection;
        }

        public static async Task<LockScope> Acquire(DbConnection connection, CancellationToken cancellationToken)
        {
            _logger?.AcquiringMigrationLock();

            await using DbCommand cmd = connection.CreateCommand();
            cmd.CommandText = $"SELECT pg_advisory_lock({MigrationLockId})";
            await cmd.ExecuteNonQueryAsync(cancellationToken);

            _logger?.MigrationLockAcquired();

            return new LockScope(connection);
        }

        public async ValueTask Release()
        {
            _logger?.ReleasingMigrationLock();

            await using DbCommand cmd = _connection.CreateCommand();
            cmd.CommandText = $"SELECT pg_advisory_unlock({MigrationLockId})";
            await cmd.ExecuteNonQueryAsync(CancellationToken.None);

            _logger?.MigrationLockReleased();
        }

        public async ValueTask DisposeAsync()
        {
            await Release();
        }
    }
}

internal static partial class DatabaseMigrationServiceLogs
{
    [LoggerMessage(LogLevel.Information, "Acquiring migration lock")]
    public static partial void AcquiringMigrationLock(this ILogger<DbMigrationService> logger);

    [LoggerMessage(LogLevel.Information, "Migration lock acquired")]
    public static partial void MigrationLockAcquired(this ILogger<DbMigrationService> logger);

    [LoggerMessage(LogLevel.Information, "Releasing migration lock")]
    public static partial void ReleasingMigrationLock(this ILogger<DbMigrationService> logger);

    [LoggerMessage(LogLevel.Information, "Migration lock released")]
    public static partial void MigrationLockReleased(this ILogger<DbMigrationService> logger);

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
}
