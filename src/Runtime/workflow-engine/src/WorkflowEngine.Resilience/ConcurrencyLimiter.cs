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
        await _dbSemaphore.WaitAsync(cancellationToken);
        return new SemaphoreReleaser(_dbSemaphore);
    }

    /// <inheritdoc/>
    public async Task<IDisposable> AcquireHttpSlotAsync(CancellationToken cancellationToken = default)
    {
        await _httpSemaphore.WaitAsync(cancellationToken);
        return new SemaphoreReleaser(_httpSemaphore);
    }

    public void Dispose()
    {
        _dbSemaphore.Dispose();
        _httpSemaphore.Dispose();
    }

    private sealed class SemaphoreReleaser(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }

    public sealed record SlotStatus(int Available, int Used, int Total);
}
