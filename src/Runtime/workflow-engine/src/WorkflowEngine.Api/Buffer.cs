namespace Altinn.App.ProcessEngine;

internal sealed class Buffer<T>(int maxSize = 10) : IDisposable
    where T : struct
{
    private readonly Queue<T> _queue = new(maxSize);
    private readonly SemaphoreSlim _lock = new(1, 1);

    private async Task ExecuteLocked(Action action)
    {
        await _lock.WaitAsync();
        try
        {
            action();
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<TResult> ExecuteLocked<TResult>(Func<TResult> func)
    {
        await _lock.WaitAsync();
        try
        {
            return func();
        }
        finally
        {
            _lock.Release();
        }
    }

    public Task Add(T value) =>
        ExecuteLocked(() =>
        {
            if (_queue.Count >= maxSize)
                _queue.Dequeue();

            _queue.Enqueue(value);
        });

    public Task Clear() => ExecuteLocked(() => _queue.Clear());

    public Task<T?> Latest() => ExecuteLocked<T?>(() => _queue.Count == 0 ? null : _queue.Last());

    public Task<T?> Previous() => ExecuteLocked<T?>(() => _queue.Count < 2 ? null : _queue.ElementAt(_queue.Count - 2));

    public Task<int> ConsecutiveCount(Func<T, bool> predicate) =>
        ExecuteLocked(() =>
        {
            int count = 0;
            foreach (var value in _queue.Reverse())
            {
                bool result = predicate(value);
                if (result)
                    count++;
                else
                    break;
            }

            return count;
        });

    public void Dispose() => _lock.Dispose();
}
