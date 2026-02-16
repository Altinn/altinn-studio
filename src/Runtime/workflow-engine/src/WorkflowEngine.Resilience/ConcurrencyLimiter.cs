using System.Diagnostics;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Resilience;

public interface IConcurrencyLimiter
{
    /// <summary>
    /// The current database slot status
    /// </summary>
    ConcurrencyLimiter.SlotStatus DbSlotStatus { get; }

    /// <summary>
    /// The current HTTP slot status
    /// </summary>
    ConcurrencyLimiter.SlotStatus HttpSlotStatus { get; }

    /// <summary>
    /// Acquires a database slot.
    /// </summary>
    Task<IDisposable> AcquireDbSlotAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Acquires an HTTP slot.
    /// </summary>
    Task<IDisposable> AcquireHttpSlotAsync(CancellationToken cancellationToken = default);
}

public sealed class ConcurrencyLimiter : IDisposable, IConcurrencyLimiter
{
    private readonly SemaphoreSlim _dbSemaphore;
    private readonly SemaphoreSlim _httpSemaphore;
    private readonly int _maxConcurrentDbOperations;
    private readonly int _maxConcurrentHttpCalls;

    /// <inheritdoc/>
    public SlotStatus DbSlotStatus =>
        new(
            _dbSemaphore.CurrentCount,
            _maxConcurrentDbOperations - _dbSemaphore.CurrentCount,
            _maxConcurrentDbOperations
        );

    /// <inheritdoc/>
    public SlotStatus HttpSlotStatus =>
        new(
            _httpSemaphore.CurrentCount,
            _maxConcurrentHttpCalls - _httpSemaphore.CurrentCount,
            _maxConcurrentHttpCalls
        );

    public ConcurrencyLimiter(int maxConcurrentDbOperations, int maxConcurrentHttpCalls)
    {
        _maxConcurrentDbOperations = maxConcurrentDbOperations;
        _maxConcurrentHttpCalls = maxConcurrentHttpCalls;

        _dbSemaphore = new SemaphoreSlim(maxConcurrentDbOperations);
        _httpSemaphore = new SemaphoreSlim(maxConcurrentHttpCalls);
    }

    /// <inheritdoc/>
    public async Task<IDisposable> AcquireDbSlotAsync(CancellationToken cancellationToken = default)
    {
        await WaitForSemaphoreAndTagActivityDuration(
            _dbSemaphore,
            $"{Metrics.MeteringPrefix}.concurrency.wait.db",
            cancellationToken
        );

        return new SemaphoreReleaser(_dbSemaphore);
    }

    /// <inheritdoc/>
    public async Task<IDisposable> AcquireHttpSlotAsync(CancellationToken cancellationToken = default)
    {
        await WaitForSemaphoreAndTagActivityDuration(
            _httpSemaphore,
            $"{Metrics.MeteringPrefix}.concurrency.wait.http",
            cancellationToken
        );

        return new SemaphoreReleaser(_httpSemaphore);
    }

    public void Dispose()
    {
        _dbSemaphore.Dispose();
        _httpSemaphore.Dispose();
    }

    private static async Task WaitForSemaphoreAndTagActivityDuration(
        SemaphoreSlim semaphore,
        string tagPrefix,
        CancellationToken cancellationToken
    )
    {
        var elapsed = Stopwatch.StartNew();
        await semaphore.WaitAsync(cancellationToken);
        elapsed.Stop();

        TagActivityWaitDuration(Activity.Current, tagPrefix, elapsed.Elapsed);
    }

    private static void TagActivityWaitDuration(Activity? activity, string tagPrefix, TimeSpan duration)
    {
        if (activity is null)
            return;

        var durationTag = $"{tagPrefix}.duration";
        var countTag = $"{tagPrefix}.count";

        var previousDuration = activity.GetTagItem(durationTag) as double? ?? 0.0;
        var previousCount = activity.GetTagItem(countTag) as int? ?? 0;

        activity.SetTag(durationTag, previousDuration + duration.TotalSeconds);
        activity.SetTag(countTag, previousCount + 1);
    }

    private sealed class SemaphoreReleaser(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }

    public sealed record SlotStatus(int Available, int Used, int Total);
}
