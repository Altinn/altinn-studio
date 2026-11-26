using Microsoft.Extensions.Time.Testing;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// A fake clock that signals each time the code under test starts a delay on it, so a test can advance it by
/// exactly that delay.
/// </summary>
internal sealed class DelayWatchingTimeProvider(DateTimeOffset start) : FakeTimeProvider(start)
{
    public SemaphoreSlim DelayStarted { get; } = new(0);

    public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
    {
        var timer = base.CreateTimer(callback, state, dueTime, period);
        DelayStarted.Release();
        return timer;
    }
}
