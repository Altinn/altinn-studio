using System.Threading.Channels;

namespace Altinn.Analysis;

/// <summary>
/// Threadpool for running synchronous work
/// Passes `TaskCreationOptions.LongRunning` to individual task/threads
/// to make sure the scheduler spawns additional threads for each task.
/// Scheduling sync work on default TaskScheduler tasks/threads would be bad
/// </summary>
internal sealed class SyncThreadPool : IDisposable
{
    private readonly Channel<Func<CancellationToken, Task>> _workQueue;
    private readonly Task[] _workers;
    private readonly CancellationTokenSource _cts = new();

    public SyncThreadPool(int threadCount = 0)
    {
        // Default to number of physical cores if not specified
        if (threadCount <= 0)
            threadCount = Environment.ProcessorCount;

        _workQueue = Channel.CreateUnbounded<Func<CancellationToken, Task>>();
        _workers = new Task[threadCount];

        for (int i = 0; i < threadCount; i++)
        {
            _workers[i] = Task
                .Factory.StartNew(
                    Worker,
                    _cts.Token,
                    TaskCreationOptions.LongRunning,
                    TaskScheduler.Default
                )
                .Unwrap();
        }
    }

    private async Task Worker()
    {
        try
        {
            await foreach (var work in _workQueue.Reader.ReadAllAsync(_cts.Token))
            {
                await work(_cts.Token);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            // Log the exception or handle it as needed
            await Console.Error.WriteLineAsync($"Worker encountered an error: {ex.Message}");
            Environment.Exit(1);
        }
    }

    public Task<T> RunAsync<T>(
        Func<CancellationToken, T> operation,
        CancellationToken cancellationToken = default
    )
    {
        var tcs = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);

        _workQueue.Writer.TryWrite(poolCancellationToken =>
        {
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
                poolCancellationToken,
                cancellationToken
            );
            try
            {
                var result = operation(linkedCts.Token);
                tcs.SetResult(result);
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
            return Task.CompletedTask;
        });

        return tcs.Task;
    }

    public Task<T> RunAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default
    )
    {
        var tcs = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);

        _workQueue.Writer.TryWrite(async poolCancellationToken =>
        {
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
                poolCancellationToken,
                cancellationToken
            );
            try
            {
                var result = await operation(linkedCts.Token);
                tcs.SetResult(result);
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
        });

        return tcs.Task;
    }

    public void Dispose()
    {
        _workQueue.Writer.Complete();
        _cts.Cancel();
        Task.WaitAll(_workers);
        _cts.Dispose();
    }
}
