#nullable disable

using System.Runtime.ExceptionServices;

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

    public Task<IDisposable> Lock<T>(T partitionKey)
        where T : struct
    {
        var @lock = _locks[Math.Abs(partitionKey.GetHashCode()) % _locks.Length];
        return @lock.Lock();
    }

    public Task<IDisposable> Lock(
        string partitionKey,
        Action<bool> waitStarted = null,
        CancellationToken cancellationToken = default
    )
    {
        var @lock = _locks[Math.Abs(partitionKey.GetHashCode()) % _locks.Length];
        return @lock.Lock(waitStarted, cancellationToken);
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

    public async Task<IDisposable> Lock(
        Action<bool> waitStarted = null,
        CancellationToken cancellationToken = default
    )
    {
        Task waitTask = _inner.WaitAsync(cancellationToken);
        if (waitStarted is not null)
        {
            try
            {
                // The callback only observes whether this acquisition queued. It must not try to
                // acquire the same lock, because this method waits for it to return before proceeding.
                waitStarted(!waitTask.IsCompletedSuccessfully);
            }
            catch (Exception callbackException)
            {
                bool acquired = false;
                try
                {
                    await waitTask;
                    acquired = true;
                }
                catch (Exception waitException)
                {
                    callbackException.Data["AsyncLockWaitException"] = waitException;
                }

                if (acquired)
                {
                    try
                    {
                        _inner.Release();
                    }
                    catch (Exception releaseException)
                    {
                        callbackException.Data["AsyncLockReleaseException"] = releaseException;
                    }
                }

                ExceptionDispatchInfo.Capture(callbackException).Throw();
                throw;
            }
        }

        await waitTask;
        return new Releaser(_inner);
    }

    public void Dispose() => _inner.Dispose();

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;

        public Releaser(SemaphoreSlim semaphore) => _semaphore = semaphore;

        public void Dispose() => _semaphore.Release();
    }
}
