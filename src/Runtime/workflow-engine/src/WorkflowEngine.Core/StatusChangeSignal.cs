namespace WorkflowEngine.Core;

/// <summary>
/// Wakes the dashboard's live streams when any engine instance reports a workflow status change on the
/// <c>status_changed</c> channel. <see cref="DatabaseNotificationListener"/> raises it.
/// </summary>
internal sealed class StatusChangeSignal
{
    private readonly AsyncSignal _inner = new();

    /// <inheritdoc cref="AsyncSignal.Signal"/>
    public void Signal() => _inner.Signal();

    /// <inheritdoc cref="AsyncSignal.Wait"/>
    public Task WaitAsync(CancellationToken ct) => _inner.Wait(ct);

    /// <inheritdoc cref="AsyncSignal.Reset"/>
    public void Reset() => _inner.Reset();
}
