#nullable disable

using System.Runtime.ExceptionServices;

namespace LocalTest.Services.Storage.Implementation;

internal sealed class PartitionedAsyncLock : IDisposable
{
    // LocalTest is a development tool, so a processor-count partition bound is sufficient.
    // Hash collisions may serialize unrelated callers and strict fairness is not required.
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
                ReleaseAfterWait(waitTask, callbackException);
                ExceptionDispatchInfo.Capture(callbackException).Throw();
                throw;
            }
        }

        await waitTask;
        return new Releaser(_inner);
    }

    private void ReleaseAfterWait(Task waitTask, Exception callbackException)
    {
        _ = waitTask.ContinueWith(
            static (completedWait, state) =>
            {
                var (semaphore, exception) = ((SemaphoreSlim, Exception))state;
                if (completedWait.IsCompletedSuccessfully)
                {
                    try
                    {
                        semaphore.Release();
                    }
                    catch (Exception releaseException)
                    {
                        exception.Data["AsyncLockReleaseException"] = releaseException;
                    }

                    return;
                }

                Exception waitException = completedWait.Exception?.InnerException
                    ?? new TaskCanceledException(completedWait);
                exception.Data["AsyncLockWaitException"] = waitException;
            },
            (_inner, callbackException),
            CancellationToken.None,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default
        );
    }

    public void Dispose() => _inner.Dispose();

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;

        public Releaser(SemaphoreSlim semaphore) => _semaphore = semaphore;

        public void Dispose() => _semaphore.Release();
    }
}
