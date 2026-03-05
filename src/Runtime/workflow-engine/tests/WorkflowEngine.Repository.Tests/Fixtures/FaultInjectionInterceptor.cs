using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace WorkflowEngine.Repository.Tests.Fixtures;

/// <summary>
/// A <see cref="DbCommandInterceptor"/> that throws a configurable exception
/// for the next N database command executions, then lets subsequent calls through normally.
/// Used to simulate transient database failures in retry tests.
/// </summary>
internal sealed class FaultInjectionInterceptor : DbCommandInterceptor
{
    private int _remainingFaults;
    private Func<Exception> _exceptionFactory = () => new TimeoutException("Simulated transient DB error");

    /// <summary>
    /// Arms the interceptor to throw on the next <paramref name="count"/> command executions.
    /// </summary>
    public void ArmFaults(int count, Func<Exception>? exceptionFactory = null)
    {
        _remainingFaults = count;
        if (exceptionFactory is not null)
            _exceptionFactory = exceptionFactory;
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default
    )
    {
        ThrowIfArmed();
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default
    )
    {
        ThrowIfArmed();
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result,
        CancellationToken cancellationToken = default
    )
    {
        ThrowIfArmed();
        return base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void ThrowIfArmed()
    {
        if (Interlocked.Decrement(ref _remainingFaults) >= 0)
            throw _exceptionFactory();
    }
}
