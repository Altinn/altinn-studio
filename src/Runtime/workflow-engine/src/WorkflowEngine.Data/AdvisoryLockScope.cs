using System.Data;
using System.Data.Common;

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
        cmd.CommandText = "SELECT pg_advisory_lock(@lockKey)";
        DbParameter lockKeyParameter = cmd.CreateParameter();
        lockKeyParameter.ParameterName = "lockKey";
        lockKeyParameter.DbType = DbType.Int64;
        lockKeyParameter.Value = lockKey;
        cmd.Parameters.Add(lockKeyParameter);
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        return new AdvisoryLockScope(connection, lockKey);
    }

    public async ValueTask Release()
    {
        await using DbCommand cmd = _connection.CreateCommand();
        cmd.CommandText = "SELECT pg_advisory_unlock(@lockKey)";
        DbParameter lockKeyParameter = cmd.CreateParameter();
        lockKeyParameter.ParameterName = "lockKey";
        lockKeyParameter.DbType = DbType.Int64;
        lockKeyParameter.Value = _lockKey;
        cmd.Parameters.Add(lockKeyParameter);
        await cmd.ExecuteNonQueryAsync(CancellationToken.None);
    }

    public async ValueTask DisposeAsync()
    {
        await Release();
    }
}
