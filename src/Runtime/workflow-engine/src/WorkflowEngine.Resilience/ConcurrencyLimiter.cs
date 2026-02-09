namespace WorkflowEngine.Resilience;

public sealed class ConcurrencyLimiter : IDisposable
{
    private readonly SemaphoreSlim _dbSemaphore;
    private readonly SemaphoreSlim _httpSemaphore;
    private readonly int _maxConcurrentDbOperations;
    private readonly int _maxConcurrentHttpCalls;

    /// <summary>
    /// The current database slot status
    /// </summary>
    public SlotStatus DbSlotStatus =>
        new(
            _dbSemaphore.CurrentCount,
            _maxConcurrentDbOperations - _dbSemaphore.CurrentCount,
            _maxConcurrentDbOperations
        );

    /// <summary>
    /// The current HTTP slot status
    /// </summary>
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

    public async Task<IDisposable> AcquireDbSlotAsync(CancellationToken cancellationToken = default)
    {
        await _dbSemaphore.WaitAsync(cancellationToken);
        return new SemaphoreReleaser(_dbSemaphore);
    }

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
