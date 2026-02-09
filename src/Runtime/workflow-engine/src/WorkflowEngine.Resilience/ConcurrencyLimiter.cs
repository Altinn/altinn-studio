namespace WorkflowEngine.Resilience;

public sealed class ConcurrencyLimiter : IDisposable
{
    private readonly SemaphoreSlim _dbSemaphore;
    private readonly SemaphoreSlim _httpSemaphore;

    public ConcurrencyLimiter(int maxConcurrentDbOperations, int maxConcurrentHttpCalls)
    {
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
}
