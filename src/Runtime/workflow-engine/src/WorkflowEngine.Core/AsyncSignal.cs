namespace WorkflowEngine.Core;

/// <summary>
/// Lightweight lock-free signaling primitive using <see cref="TaskCompletionSource"/>.
/// Used to coordinate between the write buffer (producer) and the processor (consumer).
/// </summary>
internal sealed class AsyncSignal
{
    private TaskCompletionSource _tcs = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>
    /// Signals all waiters. If the TCS is already completed, this is a no-op.
    /// </summary>
    public void Signal() => _tcs.TrySetResult();

    /// <summary>
    /// Waits until the signal is raised or the cancellation token is triggered.
    /// </summary>
    public async Task WaitAsync(CancellationToken ct)
    {
        var tcs = _tcs;
        await tcs.Task.WaitAsync(ct);
    }

    /// <summary>
    /// Resets the signal for the next cycle. Only replaces the TCS if it has been completed.
    /// Uses <see cref="Interlocked.CompareExchange{T}"/> for thread safety.
    /// </summary>
    public void Reset()
    {
        var current = _tcs;
        if (current.Task.IsCompleted)
        {
            Interlocked.CompareExchange(
                ref _tcs,
                new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously),
                current
            );
        }
    }
}
