using System.Diagnostics;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Resilience;

/// <summary>
/// Bounds concurrent access to scarce resources via three independent semaphore pools:
/// database connections, outbound HTTP calls, and worker tasks.
/// </summary>
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
    /// The current worker slot status
    /// </summary>
    ConcurrencyLimiter.SlotStatus WorkerSlotStatus { get; }

    /// <summary>
    /// Acquires a database slot.
    /// </summary>
    Task<IDisposable> AcquireDbSlot(
        ActivityContext? parentContext = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Acquires an HTTP slot.
    /// </summary>
    Task<IDisposable> AcquireHttpSlot(
        ActivityContext? parentContext = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Acquires a worker slot. Unlike DB/HTTP slots, worker slots use explicit
    /// acquire/release because the caller dispatches fire-and-forget tasks.
    /// </summary>
    Task AcquireWorkerSlot(CancellationToken cancellationToken = default);

    /// <summary>
    /// Releases a previously acquired worker slot.
    /// </summary>
    void ReleaseWorkerSlot();
}

/// <summary>
/// Default <see cref="IConcurrencyLimiter"/> implementation backed by three <see cref="SemaphoreSlim"/> instances.
/// </summary>
public sealed class ConcurrencyLimiter : IDisposable, IConcurrencyLimiter
{
    private readonly SemaphoreSlim _dbSemaphore;
    private readonly SemaphoreSlim _httpSemaphore;
    private readonly SemaphoreSlim _workerSemaphore;
    private readonly int _maxConcurrentDbOperations;
    private readonly int _maxConcurrentHttpCalls;
    private readonly int _maxWorkers;

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

    /// <inheritdoc/>
    public SlotStatus WorkerSlotStatus =>
        new(_workerSemaphore.CurrentCount, _maxWorkers - _workerSemaphore.CurrentCount, _maxWorkers);

    /// <summary>
    /// Creates a new <see cref="ConcurrencyLimiter"/> with the supplied per-pool capacities.
    /// </summary>
    public ConcurrencyLimiter(int maxConcurrentDbOperations, int maxConcurrentHttpCalls, int maxWorkers)
    {
        _maxConcurrentDbOperations = maxConcurrentDbOperations;
        _maxConcurrentHttpCalls = maxConcurrentHttpCalls;
        _maxWorkers = maxWorkers;

        _dbSemaphore = new SemaphoreSlim(maxConcurrentDbOperations);
        _httpSemaphore = new SemaphoreSlim(maxConcurrentHttpCalls);
        _workerSemaphore = new SemaphoreSlim(maxWorkers, maxWorkers);
    }

    /// <inheritdoc/>
    public async Task<IDisposable> AcquireDbSlot(
        ActivityContext? parentContext = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "ConcurrencyLimiter.AcquireDbSlot",
            parentContext: parentContext
        );
        await _dbSemaphore.WaitAsync(cancellationToken);

        return new SemaphoreReleaser(_dbSemaphore, "ReleaseDbSlot", parentContext);
    }

    /// <inheritdoc/>
    public async Task<IDisposable> AcquireHttpSlot(
        ActivityContext? parentContext = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "ConcurrencyLimiter.AcquireHttpSlot",
            parentContext: parentContext
        );
        await _httpSemaphore.WaitAsync(cancellationToken);

        return new SemaphoreReleaser(_httpSemaphore, "ReleaseHttpSlot", parentContext);
    }

    /// <inheritdoc/>
    public async Task AcquireWorkerSlot(CancellationToken cancellationToken = default)
    {
        await _workerSemaphore.WaitAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public void ReleaseWorkerSlot()
    {
        _workerSemaphore.Release();
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        _dbSemaphore.Dispose();
        _httpSemaphore.Dispose();
        _workerSemaphore.Dispose();
    }

    private sealed class SemaphoreReleaser(SemaphoreSlim semaphore, string activityStub, ActivityContext? parentContext)
        : IDisposable
    {
        public void Dispose()
        {
            using var activity = Metrics.Source.StartActivity(
                $"ConcurrencyLimiter.{activityStub}",
                parentContext: parentContext
            );
            semaphore.Release();
        }
    }

    /// <summary>
    /// Snapshot of a semaphore pool's slot accounting at a single point in time.
    /// </summary>
    /// <param name="Available">Slots currently free.</param>
    /// <param name="Used">Slots currently in use.</param>
    /// <param name="Total">Total slot capacity of the pool.</param>
    public sealed record SlotStatus(int Available, int Used, int Total);
}
