using System.Data;
using System.Data.Common;

// CA2100: Review SQL queries for security vulnerabilities
#pragma warning disable CA2100

namespace WorkflowEngine.Data;

internal sealed class AdvisoryLockScope : IAsyncDisposable
{
    private readonly DbConnection _connection;
    private readonly long _lockKey;

    private AdvisoryLockScope(DbConnection connection, long lockKey)
    {
        _connection = connection;
        _lockKey = lockKey;
    }

    public static async Task<AdvisoryLockScope> Acquire(
        long lockKey,
        DbConnection connection,
        CancellationToken cancellationToken
    )
    {
        if (connection.State is ConnectionState.Closed or ConnectionState.Broken)
            await connection.OpenAsync(cancellationToken);

        await using DbCommand cmd = connection.CreateCommand();
        cmd.CommandText = $"SELECT pg_advisory_lock({lockKey})";
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        return new AdvisoryLockScope(connection, lockKey);
    }

    public async ValueTask Release()
    {
        await using DbCommand cmd = _connection.CreateCommand();
        cmd.CommandText = $"SELECT pg_advisory_unlock({_lockKey})";
        await cmd.ExecuteNonQueryAsync(CancellationToken.None);
    }

    public async ValueTask DisposeAsync()
    {
        await Release();
    }
}
