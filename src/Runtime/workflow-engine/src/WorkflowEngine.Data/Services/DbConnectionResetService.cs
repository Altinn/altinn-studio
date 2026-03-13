using Microsoft.Extensions.Logging;
using Npgsql;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Data.Services;

/// <summary>
/// Terminates all existing connections to the target database.
/// Intended for development use only, to clear stale connections left behind
/// by ungraceful shutdowns during load testing.
/// </summary>
public sealed class DbConnectionResetService(ILogger<DbConnectionResetService> logger)
{
    public async Task ResetConnections(string dbConnectionString, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("DbConnectionResetService.ResetConnections");

        await using var connection = new NpgsqlConnection(dbConnectionString);
        await connection.OpenAsync(cancellationToken);

        var databaseName = connection.Database;
        logger.TerminatingConnections(databaseName);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT count(pg_terminate_backend(pid))
            FROM pg_stat_activity
            WHERE datname = @db AND pid <> pg_backend_pid()
            """;
        cmd.Parameters.AddWithValue("db", databaseName);

        var terminated = await cmd.ExecuteScalarAsync(cancellationToken) as long? ?? 0;
        logger.TerminatedConnections(terminated, databaseName);
    }
}

internal static partial class DbConnectionResetServiceLogs
{
    [LoggerMessage(LogLevel.Information, "Terminating existing connections to database '{DatabaseName}'")]
    public static partial void TerminatingConnections(
        this ILogger<DbConnectionResetService> logger,
        string databaseName
    );

    [LoggerMessage(LogLevel.Information, "Terminated {Count} connection(s) to database '{DatabaseName}'")]
    public static partial void TerminatedConnections(
        this ILogger<DbConnectionResetService> logger,
        long count,
        string databaseName
    );
}
