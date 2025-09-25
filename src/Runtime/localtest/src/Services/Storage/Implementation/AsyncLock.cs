namespace LocalTest.Services.Storage.Implementation;

internal sealed class PartitionedAsyncLock : IDisposable
{
    private readonly AsyncLock[] _locks = new AsyncLock[Environment.ProcessorCount];

    public PartitionedAsyncLock()
    {
        for (int i = 0; i < _locks.Length; i++)
        {
            _locks[i] = new AsyncLock();
        }
    }

    public Task<IDisposable> Lock<T>(T partitionKey) where T : struct
    {
        var @lock = _locks[Math.Abs(partitionKey.GetHashCode()) % _locks.Length];
        return @lock.Lock();
    }

    public Task<IDisposable> Lock(string partitionKey)
    {
        var @lock = _locks[Math.Abs(partitionKey.GetHashCode()) % _locks.Length];
        return @lock.Lock();
    }

    public void Dispose()
    {
        foreach (var @lock in _locks)
        {
            @lock.Dispose();
        }
    }
}

internal sealed class AsyncLock : IDisposable
{
    private readonly SemaphoreSlim _inner = new SemaphoreSlim(1, 1);

    public async Task<IDisposable> Lock()
    {
        var releaser = new Releaser(_inner);
        await _inner.WaitAsync();
        return releaser;
    }

    public void Dispose() => _inner.Dispose();

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;

        public Releaser(SemaphoreSlim semaphore) => _semaphore = semaphore;

        public void Dispose() => _semaphore.Release();
    }
}