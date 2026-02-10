using System.Diagnostics.CodeAnalysis;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using Task = System.Threading.Tasks.Task;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task Start(CancellationToken cancellationToken = default)
    {
        _logger.StartingEngine();

        if (_cancellationTokenSource is not null || _mainLoopTask is not null)
            await Stop();

        Status |= EngineHealthStatus.Running;
        _cleanupRequired = true;
        _cancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        _mainLoopTask = Task.Run(
            async () =>
            {
                try
                {
                    while (!_cancellationTokenSource.IsCancellationRequested)
                    {
                        try
                        {
                            await MainLoop(_cancellationTokenSource.Token);
                            Status &= ~EngineHealthStatus.Unhealthy;
                            Status |= EngineHealthStatus.Healthy;
                            Status |= EngineHealthStatus.Running;
                        }
                        catch (OperationCanceledException) when (_cancellationTokenSource.IsCancellationRequested)
                        {
                            // Graceful shutdown
                        }
                        catch (Exception ex)
                        {
                            _logger.UnhandledMainloopException(ex.Message, ex);
                            Status |= EngineHealthStatus.Unhealthy;
                        }
                    }
                }
                finally
                {
                    await Cleanup();
                    Status &= ~EngineHealthStatus.Running;
                }
            },
            _cancellationTokenSource.Token
        );
    }

    public async Task Stop()
    {
        _logger.StoppingEngine();

        if (!Status.HasFlag(EngineHealthStatus.Running))
            return;

        try
        {
            if (_cancellationTokenSource is not null)
                await _cancellationTokenSource.CancelAsync();

            if (_mainLoopTask?.IsCompleted is false)
                await _mainLoopTask;
        }
        catch (OperationCanceledException)
        {
            // Graceful shutdown
        }
        finally
        {
            Status &= ~EngineHealthStatus.Running;
            Status |= EngineHealthStatus.Stopped;
        }
    }

    private async Task AcquireQueueSlot(CancellationToken cancellationToken = default)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.AcquireQueueSlot");
        _logger.AcquiringQueueSlot();

        await _inboxCapacityLimit.WaitAsync(cancellationToken);

        if (InboxCount >= _settings.QueueCapacity)
            Status |= EngineHealthStatus.QueueFull;
        else
            Status &= ~EngineHealthStatus.QueueFull;

        _logger.StatusAfterAcquiringSlot(Status);
    }

    private void RefreshActiveSet()
    {
        lock (_activeSetLock)
        {
            // Backfill from inbox (FIFO) up to MaxDegreeOfParallelism
            int available = _settings.MaxDegreeOfParallelism - _activeSet.Count;
            if (available <= 0)
                return;

            var newWork = _inbox.Values.Where(x => !_activeSet.Contains(x)).OrderBy(x => x.CreatedAt).Take(available);
            foreach (var workflow in newWork)
                _activeSet.Add(workflow);

            // return _activeSet;
        }
    }

    private void RemoveWorkflowAndReleaseQueueSlot(Workflow workflow)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.RemoveWorkflowAndReleaseQueueSlot");
        _logger.ReleasingQueueSlot();

        lock (_activeSetLock)
        {
            var removed = _inbox.TryRemove(workflow.IdempotencyKey, out _) && _activeSet.Remove(workflow);
            if (!removed)
            {
                Telemetry.Errors.Add(1, ("operation", "queueSlotRelease"));
                activity?.Errored(errorMessage: $"Unable to release queue slot {workflow.IdempotencyKey}");
                throw new EngineException($"Unable to release queue slot {workflow.IdempotencyKey}");
            }
        }

        _inboxCapacityLimit.Release();

        if (workflow.OverallStatus().IsSuccessful())
        {
            Telemetry.WorkflowsSucceeded.Add(1);
        }
        else
        {
            Telemetry.WorkflowsFailed.Add(1);
        }
    }

    [MemberNotNull(nameof(_inbox), nameof(_activeSet), nameof(_inboxCapacityLimit), nameof(_newWorkSignal))]
    private void InitializeInbox()
    {
        _inbox = [];
        _activeSet = [];
        _inboxCapacityLimit = new SemaphoreSlim(_settings.QueueCapacity, _settings.QueueCapacity);
        Interlocked.Exchange(
            ref _newWorkSignal,
            new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously)
        );
    }

    private async Task Cleanup()
    {
        await _cleanupLock.WaitAsync();

        try
        {
            if (!_cleanupRequired)
                return;

            _cleanupRequired = false;
            _mainLoopTask = null;
            _cancellationTokenSource?.Dispose();
            _cancellationTokenSource = null;

            await _isEnabledHistory.Clear();

            _inbox.Clear();
            _activeSet.Clear();
            _inboxCapacityLimit.Dispose();

            InitializeInbox();
        }
        finally
        {
            _cleanupLock.Release();
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed || !disposing)
            return;

        _disposed = true;
        _cancellationTokenSource?.Dispose();
        _mainLoopTask?.Dispose();
        _isEnabledHistory.Dispose();
        _cleanupLock.Dispose();
        _inboxCapacityLimit.Dispose();
    }
}
