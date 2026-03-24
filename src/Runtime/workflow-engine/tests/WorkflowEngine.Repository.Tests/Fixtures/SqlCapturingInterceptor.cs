using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace WorkflowEngine.Repository.Tests.Fixtures;

/// <summary>
/// A <see cref="DbCommandInterceptor"/> that records the SQL text and parameters
/// of every command flowing through EF Core. Used by query plan regression tests
/// to capture the actual SQL generated, then run EXPLAIN on it.
/// </summary>
internal sealed class SqlCapturingInterceptor : DbCommandInterceptor
{
    public List<CapturedQuery> Queries { get; } = [];

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default
    )
    {
        Capture(command);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default
    )
    {
        Capture(command);
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result,
        CancellationToken cancellationToken = default
    )
    {
        Capture(command);
        return base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }

    public void Clear() => Queries.Clear();

    private void Capture(DbCommand command)
    {
        var parameters = new Dictionary<string, object?>();
        foreach (DbParameter p in command.Parameters)
        {
            parameters[p.ParameterName] = p.Value;
        }

        Queries.Add(new CapturedQuery(command.CommandText, parameters));
    }
}

internal sealed record CapturedQuery(string Sql, Dictionary<string, object?> Parameters);
